const request = require('supertest');
const app = require('../../../src/app');
const { testDb } = require('../../setup');
const { testUsers } = require('../../fixtures/users');

describe('Authentication Integration Tests', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUsers.validUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(testUsers.validUser.email);
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUsers.invalidEmail)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation error');
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUsers.weakPassword)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation error');
    });

    it('should return 409 for duplicate email', async () => {
      // Register user first time
      await request(app)
        .post('/api/auth/register')
        .send(testUsers.validUser)
        .expect(201);

      // Try to register again
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUsers.validUser)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User with this email already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Register a user for login tests
      await request(app)
        .post('/api/auth/register')
        .send(testUsers.validUser);
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.validUser.email,
          password: testUsers.validUser.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.user.email).toBe(testUsers.validUser.email);
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
    });

    it('should return 401 for incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.validUser.email,
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should return 401 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.validUser.email
          // Missing password
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation error');
    });
  });

  describe('GET /api/auth/profile', () => {
    let accessToken;

    beforeEach(async () => {
      // Register and login to get access token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUsers.validUser);
      
      accessToken = registerResponse.body.tokens.accessToken;
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(testUsers.validUser.email);
      expect(response.body.user.firstName).toBe(testUsers.validUser.firstName);
      expect(response.body.user.lastName).toBe(testUsers.validUser.lastName);
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/auth/profile', () => {
    let accessToken;

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUsers.validUser);
      
      accessToken = registerResponse.body.tokens.accessToken;
    });

    it('should update profile successfully', async () => {
      const updates = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.firstName).toBe('Updated');
      expect(response.body.user.lastName).toBe('Name');
    });

    it('should return 400 for invalid data', async () => {
      const updates = {
        firstName: 'A'.repeat(101) // Too long
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updates)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/change-password', () => {
    let accessToken;

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUsers.validUser);
      
      accessToken = registerResponse.body.tokens.accessToken;
    });

    it('should change password successfully', async () => {
      const passwordData = {
        currentPassword: testUsers.validUser.password,
        newPassword: 'NewPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(passwordData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password changed successfully');

      // Verify new password works
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.validUser.email,
          password: 'NewPassword123!'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should return 400 for incorrect current password', async () => {
      const passwordData = {
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Current password is incorrect');
    });

    it('should return 400 for weak new password', async () => {
      const passwordData = {
        currentPassword: testUsers.validUser.password,
        newPassword: '123' // Too weak
      };

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken;

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUsers.validUser);
      
      refreshToken = registerResponse.body.tokens.refreshToken;
    });

    it('should refresh token successfully', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(testUsers.validUser.email);
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    let accessToken, refreshToken;

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUsers.validUser);
      
      accessToken = registerResponse.body.tokens.accessToken;
      refreshToken = registerResponse.body.tokens.refreshToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');

      // Verify refresh token is invalidated
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      expect(refreshResponse.body.success).toBe(false);
    });

    it('should return 401 without access token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
