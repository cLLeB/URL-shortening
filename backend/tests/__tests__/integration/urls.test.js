const request = require('supertest');
const app = require('../../../src/app');
const { testDb } = require('../../setup');
const { testUsers } = require('../../fixtures/users');
const { testUrls } = require('../../fixtures/urls');

describe('URLs Integration Tests', () => {
  let accessToken;
  let user;

  beforeEach(async () => {
    // Register and login to get access token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUsers.validUser);
    
    accessToken = registerResponse.body.tokens.accessToken;
    user = registerResponse.body.user;
  });

  describe('POST /api/urls', () => {
    it('should create URL successfully with authentication', async () => {
      const response = await request(app)
        .post('/api/urls')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testUrls.validUrl)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('URL created successfully');
      expect(response.body.url).toHaveProperty('id');
      expect(response.body.url).toHaveProperty('shortCode');
      expect(response.body.url).toHaveProperty('shortUrl');
      expect(response.body.url.originalUrl).toBe(testUrls.validUrl.originalUrl);
      expect(response.body.url.title).toBe(testUrls.validUrl.title);
    });

    it('should create anonymous URL without authentication', async () => {
      const response = await request(app)
        .post('/api/urls')
        .send(testUrls.validUrl)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.url.originalUrl).toBe(testUrls.validUrl.originalUrl);
    });

    it('should create URL with custom alias', async () => {
      const response = await request(app)
        .post('/api/urls')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testUrls.customAliasUrl)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.url.customAlias).toBe(testUrls.customAliasUrl.customAlias);
      expect(response.body.url.shortCode).toBe(testUrls.customAliasUrl.customAlias);
    });

    it('should return 400 for invalid URL', async () => {
      const response = await request(app)
        .post('/api/urls')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testUrls.invalidUrl)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation error');
    });

    it('should return 409 for duplicate custom alias', async () => {
      // Create first URL
      await request(app)
        .post('/api/urls')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testUrls.customAliasUrl);

      // Try to create second URL with same alias
      const response = await request(app)
        .post('/api/urls')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testUrls.customAliasUrl)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Custom alias already taken');
    });

    it('should return 400 for invalid custom alias', async () => {
      const response = await request(app)
        .post('/api/urls')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testUrls.invalidCustomAlias)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation error');
    });
  });

  describe('GET /api/urls', () => {
    beforeEach(async () => {
      // Create multiple test URLs
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/urls')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            originalUrl: `https://example${i}.com`,
            title: `Test URL ${i}`
          });
      }
    });

    it('should return user URLs with pagination', async () => {
      const response = await request(app)
        .get('/api/urls?page=1&limit=3')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.urls).toHaveLength(3);
      expect(response.body.pagination.total).toBe(5);
      expect(response.body.pagination.pages).toBe(2);
      expect(response.body.pagination.hasNext).toBe(true);
      expect(response.body.pagination.hasPrev).toBe(false);
    });

    it('should sort URLs correctly', async () => {
      const response = await request(app)
        .get('/api/urls?sortBy=created_at&sortOrder=ASC')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Check if URLs are sorted by creation date ascending
      const urls = response.body.urls;
      for (let i = 1; i < urls.length; i++) {
        const prevDate = new Date(urls[i - 1].createdAt);
        const currDate = new Date(urls[i].createdAt);
        expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime());
      }
    });

    it('should filter URLs by search term', async () => {
      // Create a URL with specific title
      await request(app)
        .post('/api/urls')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          originalUrl: 'https://searchable.example.com',
          title: 'Searchable URL'
        });

      const response = await request(app)
        .get('/api/urls?search=Searchable')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.urls.length).toBeGreaterThan(0);
      expect(response.body.urls[0].title).toContain('Searchable');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/urls')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/urls/:id', () => {
    let testUrl;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/urls')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testUrls.validUrl);
      
      testUrl = createResponse.body.url;
    });

    it('should return URL details for owner', async () => {
      const response = await request(app)
        .get(`/api/urls/${testUrl.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.url.id).toBe(testUrl.id);
      expect(response.body.url.originalUrl).toBe(testUrl.originalUrl);
    });

    it('should return 404 for non-existent URL', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .get(`/api/urls/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('URL not found');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get(`/api/urls/${testUrl.id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/urls/:id', () => {
    let testUrl;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/urls')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testUrls.validUrl);
      
      testUrl = createResponse.body.url;
    });

    it('should update URL successfully', async () => {
      const updates = {
        title: 'Updated Title',
        description: 'Updated description',
        isActive: false
      };

      const response = await request(app)
        .put(`/api/urls/${testUrl.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.url.title).toBe(updates.title);
      expect(response.body.url.description).toBe(updates.description);
      expect(response.body.url.isActive).toBe(updates.isActive);
    });

    it('should return 404 for non-existent URL', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updates = { title: 'Updated' };

      const response = await request(app)
        .put(`/api/urls/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updates)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid updates', async () => {
      const updates = {
        title: 'A'.repeat(501) // Too long
      };

      const response = await request(app)
        .put(`/api/urls/${testUrl.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updates)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/urls/:id', () => {
    let testUrl;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/urls')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testUrls.validUrl);
      
      testUrl = createResponse.body.url;
    });

    it('should delete URL successfully', async () => {
      const response = await request(app)
        .delete(`/api/urls/${testUrl.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('URL deleted successfully');

      // Verify URL is deleted
      await request(app)
        .get(`/api/urls/${testUrl.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent URL', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .delete(`/api/urls/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('URL Redirection', () => {
    let testUrl;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/urls')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testUrls.validUrl);
      
      testUrl = createResponse.body.url;
    });

    it('should redirect to original URL', async () => {
      const response = await request(app)
        .get(`/${testUrl.shortCode}`)
        .expect(301);

      expect(response.headers.location).toBe(testUrl.originalUrl);
    });

    it('should return 404 for non-existent short code', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('URL not found or has expired');
    });

    it('should return preview data with preview=true', async () => {
      const response = await request(app)
        .get(`/${testUrl.shortCode}?preview=true`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.url.originalUrl).toBe(testUrl.originalUrl);
      expect(response.body.url.shortCode).toBe(testUrl.shortCode);
    });

    it('should increment click count on redirect', async () => {
      const initialClickCount = testUrl.clickCount;

      // Perform redirect
      await request(app)
        .get(`/${testUrl.shortCode}`)
        .expect(301);

      // Check updated click count
      const response = await request(app)
        .get(`/api/urls/${testUrl.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.url.clickCount).toBe(initialClickCount + 1);
    });
  });
});
