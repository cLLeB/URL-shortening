const bcrypt = require('bcryptjs');
const authService = require('../../../src/services/authService');
const { testDb } = require('../../setup');
const { createTestUser, testUsers } = require('../../fixtures/users');

describe('AuthService', () => {
  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = testUsers.validUser;
      
      const result = await authService.register(userData);
      
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user.email).toBe(userData.email);
      expect(result.user.firstName).toBe(userData.firstName);
      expect(result.user.lastName).toBe(userData.lastName);
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });

    it('should hash the password correctly', async () => {
      const userData = testUsers.validUser;
      
      await authService.register(userData);
      
      const dbResult = await testDb.query(
        'SELECT password_hash FROM users WHERE email = $1',
        [userData.email]
      );
      
      const isValidPassword = await bcrypt.compare(
        userData.password,
        dbResult.rows[0].password_hash
      );
      
      expect(isValidPassword).toBe(true);
    });

    it('should throw error for duplicate email', async () => {
      const userData = testUsers.validUser;
      
      // Register user first time
      await authService.register(userData);
      
      // Try to register again with same email
      await expect(authService.register(userData))
        .rejects
        .toThrow('User with this email already exists');
    });

    it('should throw error for invalid email format', async () => {
      const userData = testUsers.invalidEmail;
      
      await expect(authService.register(userData))
        .rejects
        .toThrow();
    });
  });

  describe('login', () => {
    let testUser;

    beforeEach(async () => {
      // Create a test user
      const userData = await createTestUser();
      const result = await testDb.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, is_verified, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        userData.email,
        userData.passwordHash,
        userData.firstName,
        userData.lastName,
        userData.isVerified,
        userData.isActive
      ]);
      
      testUser = result.rows[0];
    });

    it('should login successfully with correct credentials', async () => {
      const result = await authService.login(
        testUser.email,
        'TestPassword123!',
        '127.0.0.1',
        'test-user-agent'
      );
      
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user.email).toBe(testUser.email);
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });

    it('should throw error for incorrect password', async () => {
      await expect(authService.login(
        testUser.email,
        'WrongPassword123!',
        '127.0.0.1',
        'test-user-agent'
      )).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for non-existent user', async () => {
      await expect(authService.login(
        'nonexistent@example.com',
        'TestPassword123!',
        '127.0.0.1',
        'test-user-agent'
      )).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for inactive user', async () => {
      // Deactivate user
      await testDb.query(
        'UPDATE users SET is_active = false WHERE id = $1',
        [testUser.id]
      );
      
      await expect(authService.login(
        testUser.email,
        'TestPassword123!',
        '127.0.0.1',
        'test-user-agent'
      )).rejects.toThrow('Account is deactivated');
    });

    it('should update last_login timestamp', async () => {
      const beforeLogin = new Date();
      
      await authService.login(
        testUser.email,
        'TestPassword123!',
        '127.0.0.1',
        'test-user-agent'
      );
      
      const result = await testDb.query(
        'SELECT last_login FROM users WHERE id = $1',
        [testUser.id]
      );
      
      const lastLogin = new Date(result.rows[0].last_login);
      expect(lastLogin.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
    });
  });

  describe('changePassword', () => {
    let testUser;

    beforeEach(async () => {
      const userData = await createTestUser();
      const result = await testDb.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, is_verified, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        userData.email,
        userData.passwordHash,
        userData.firstName,
        userData.lastName,
        userData.isVerified,
        userData.isActive
      ]);
      
      testUser = result.rows[0];
    });

    it('should change password successfully', async () => {
      const newPassword = 'NewPassword123!';
      
      await authService.changePassword(
        testUser.id,
        'TestPassword123!',
        newPassword
      );
      
      // Verify new password works
      const result = await authService.login(
        testUser.email,
        newPassword,
        '127.0.0.1',
        'test-user-agent'
      );
      
      expect(result.user.email).toBe(testUser.email);
    });

    it('should throw error for incorrect current password', async () => {
      await expect(authService.changePassword(
        testUser.id,
        'WrongCurrentPassword',
        'NewPassword123!'
      )).rejects.toThrow('Current password is incorrect');
    });

    it('should throw error for non-existent user', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      
      await expect(authService.changePassword(
        fakeUserId,
        'TestPassword123!',
        'NewPassword123!'
      )).rejects.toThrow('User not found');
    });
  });

  describe('getUserProfile', () => {
    let testUser;

    beforeEach(async () => {
      const userData = await createTestUser();
      const result = await testDb.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, is_verified, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        userData.email,
        userData.passwordHash,
        userData.firstName,
        userData.lastName,
        userData.isVerified,
        userData.isActive
      ]);
      
      testUser = result.rows[0];
    });

    it('should return user profile successfully', async () => {
      const profile = await authService.getUserProfile(testUser.id);
      
      expect(profile.id).toBe(testUser.id);
      expect(profile.email).toBe(testUser.email);
      expect(profile.firstName).toBe(testUser.first_name);
      expect(profile.lastName).toBe(testUser.last_name);
      expect(profile.role).toBe(testUser.role);
      expect(profile.isVerified).toBe(testUser.is_verified);
      expect(profile.isActive).toBe(testUser.is_active);
    });

    it('should throw error for non-existent user', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      
      await expect(authService.getUserProfile(fakeUserId))
        .rejects
        .toThrow('User not found');
    });
  });

  describe('updateUserProfile', () => {
    let testUser;

    beforeEach(async () => {
      const userData = await createTestUser();
      const result = await testDb.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, is_verified, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        userData.email,
        userData.passwordHash,
        userData.firstName,
        userData.lastName,
        userData.isVerified,
        userData.isActive
      ]);
      
      testUser = result.rows[0];
    });

    it('should update user profile successfully', async () => {
      const updates = {
        first_name: 'Updated',
        last_name: 'Name'
      };
      
      const updatedUser = await authService.updateUserProfile(testUser.id, updates);
      
      expect(updatedUser.firstName).toBe('Updated');
      expect(updatedUser.lastName).toBe('Name');
      expect(updatedUser.email).toBe(testUser.email); // Should remain unchanged
    });

    it('should throw error for invalid fields', async () => {
      const updates = {
        email: 'newemail@example.com', // Not allowed
        role: 'admin' // Not allowed
      };
      
      await expect(authService.updateUserProfile(testUser.id, updates))
        .rejects
        .toThrow('No valid fields to update');
    });

    it('should throw error for non-existent user', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      const updates = { first_name: 'Updated' };
      
      await expect(authService.updateUserProfile(fakeUserId, updates))
        .rejects
        .toThrow('User not found');
    });
  });
});
