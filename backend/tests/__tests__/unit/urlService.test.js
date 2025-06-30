const urlService = require('../../../src/services/urlService');
const { testDb } = require('../../setup');
const { createTestUser } = require('../../fixtures/users');
const { createTestUrl, testUrls } = require('../../fixtures/urls');

describe('UrlService', () => {
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

  describe('createUrl', () => {
    it('should create a URL successfully', async () => {
      const urlData = {
        ...testUrls.validUrl,
        userId: testUser.id
      };
      
      const result = await urlService.createUrl(urlData);
      
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('shortCode');
      expect(result).toHaveProperty('shortUrl');
      expect(result.originalUrl).toBe(urlData.originalUrl);
      expect(result.title).toBe(urlData.title);
      expect(result.isActive).toBe(true);
      expect(result.isPublic).toBe(true);
      expect(result.clickCount).toBe(0);
    });

    it('should create URL with custom alias', async () => {
      const urlData = {
        ...testUrls.customAliasUrl,
        userId: testUser.id
      };
      
      const result = await urlService.createUrl(urlData);
      
      expect(result.customAlias).toBe(urlData.customAlias);
      expect(result.shortCode).toBe(urlData.customAlias);
    });

    it('should create anonymous URL without user', async () => {
      const urlData = testUrls.validUrl;
      
      const result = await urlService.createUrl(urlData);
      
      expect(result.originalUrl).toBe(urlData.originalUrl);
      expect(result.userId).toBeNull();
    });

    it('should throw error for invalid URL', async () => {
      const urlData = {
        ...testUrls.invalidUrl,
        userId: testUser.id
      };
      
      await expect(urlService.createUrl(urlData))
        .rejects
        .toThrow();
    });

    it('should throw error for duplicate custom alias', async () => {
      const urlData = {
        ...testUrls.customAliasUrl,
        userId: testUser.id
      };
      
      // Create first URL
      await urlService.createUrl(urlData);
      
      // Try to create second URL with same alias
      await expect(urlService.createUrl(urlData))
        .rejects
        .toThrow('Custom alias already taken');
    });

    it('should generate unique short codes', async () => {
      const urlData1 = { ...testUrls.validUrl, userId: testUser.id };
      const urlData2 = { 
        ...testUrls.validUrl, 
        originalUrl: 'https://different.example.com',
        userId: testUser.id 
      };
      
      const result1 = await urlService.createUrl(urlData1);
      const result2 = await urlService.createUrl(urlData2);
      
      expect(result1.shortCode).not.toBe(result2.shortCode);
    });
  });

  describe('getUrlByShortCode', () => {
    let testUrl;

    beforeEach(async () => {
      const urlData = {
        ...testUrls.validUrl,
        userId: testUser.id
      };
      testUrl = await urlService.createUrl(urlData);
    });

    it('should retrieve URL by short code', async () => {
      const result = await urlService.getUrlByShortCode(testUrl.shortCode);
      
      expect(result.id).toBe(testUrl.id);
      expect(result.originalUrl).toBe(testUrl.originalUrl);
      expect(result.shortCode).toBe(testUrl.shortCode);
    });

    it('should return null for non-existent short code', async () => {
      const result = await urlService.getUrlByShortCode('nonexistent');
      
      expect(result).toBeNull();
    });

    it('should return null for expired URL', async () => {
      // Create expired URL
      const expiredUrlData = {
        originalUrl: 'https://expired.example.com',
        userId: testUser.id,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
      };
      
      const expiredUrl = await urlService.createUrl(expiredUrlData);
      const result = await urlService.getUrlByShortCode(expiredUrl.shortCode);
      
      expect(result).toBeNull();
    });

    it('should increment click count when accessed', async () => {
      const initialClickCount = testUrl.clickCount;
      
      await urlService.getUrlByShortCode(testUrl.shortCode);
      
      // Check if click count was incremented
      const updatedUrl = await testDb.query(
        'SELECT click_count FROM urls WHERE id = $1',
        [testUrl.id]
      );
      
      expect(updatedUrl.rows[0].click_count).toBe(initialClickCount + 1);
    });
  });

  describe('getUserUrls', () => {
    beforeEach(async () => {
      // Create multiple test URLs
      for (let i = 0; i < 5; i++) {
        await urlService.createUrl({
          originalUrl: `https://example${i}.com`,
          title: `Test URL ${i}`,
          userId: testUser.id
        });
      }
    });

    it('should return user URLs with pagination', async () => {
      const result = await urlService.getUserUrls(testUser.id, {
        page: 1,
        limit: 3
      });
      
      expect(result.urls).toHaveLength(3);
      expect(result.pagination.total).toBe(5);
      expect(result.pagination.pages).toBe(2);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(false);
    });

    it('should sort URLs correctly', async () => {
      const result = await urlService.getUserUrls(testUser.id, {
        sortBy: 'created_at',
        sortOrder: 'ASC'
      });
      
      // Check if URLs are sorted by creation date ascending
      for (let i = 1; i < result.urls.length; i++) {
        const prevDate = new Date(result.urls[i - 1].createdAt);
        const currDate = new Date(result.urls[i].createdAt);
        expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime());
      }
    });

    it('should filter URLs by search term', async () => {
      // Create a URL with specific title
      await urlService.createUrl({
        originalUrl: 'https://searchable.example.com',
        title: 'Searchable URL',
        userId: testUser.id
      });
      
      const result = await urlService.getUserUrls(testUser.id, {
        search: 'Searchable'
      });
      
      expect(result.urls.length).toBeGreaterThan(0);
      expect(result.urls[0].title).toContain('Searchable');
    });
  });

  describe('updateUrl', () => {
    let testUrl;

    beforeEach(async () => {
      const urlData = {
        ...testUrls.validUrl,
        userId: testUser.id
      };
      testUrl = await urlService.createUrl(urlData);
    });

    it('should update URL successfully', async () => {
      const updates = {
        title: 'Updated Title',
        description: 'Updated description',
        isActive: false
      };
      
      const result = await urlService.updateUrl(testUrl.id, testUser.id, updates);
      
      expect(result.title).toBe(updates.title);
      expect(result.description).toBe(updates.description);
      expect(result.isActive).toBe(updates.isActive);
    });

    it('should throw error for non-existent URL', async () => {
      const fakeUrlId = '00000000-0000-0000-0000-000000000000';
      const updates = { title: 'Updated' };
      
      await expect(urlService.updateUrl(fakeUrlId, testUser.id, updates))
        .rejects
        .toThrow('URL not found');
    });

    it('should throw error for unauthorized access', async () => {
      // Create another user
      const otherUserData = await createTestUser({ email: 'other@example.com' });
      const otherUserResult = await testDb.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, is_verified, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        otherUserData.email,
        otherUserData.passwordHash,
        otherUserData.firstName,
        otherUserData.lastName,
        otherUserData.isVerified,
        otherUserData.isActive
      ]);
      
      const otherUser = otherUserResult.rows[0];
      const updates = { title: 'Unauthorized Update' };
      
      await expect(urlService.updateUrl(testUrl.id, otherUser.id, updates))
        .rejects
        .toThrow('URL not found');
    });
  });

  describe('deleteUrl', () => {
    let testUrl;

    beforeEach(async () => {
      const urlData = {
        ...testUrls.validUrl,
        userId: testUser.id
      };
      testUrl = await urlService.createUrl(urlData);
    });

    it('should delete URL successfully', async () => {
      await urlService.deleteUrl(testUrl.id, testUser.id);
      
      // Verify URL is deleted
      const result = await testDb.query(
        'SELECT * FROM urls WHERE id = $1',
        [testUrl.id]
      );
      
      expect(result.rows).toHaveLength(0);
    });

    it('should throw error for non-existent URL', async () => {
      const fakeUrlId = '00000000-0000-0000-0000-000000000000';
      
      await expect(urlService.deleteUrl(fakeUrlId, testUser.id))
        .rejects
        .toThrow('URL not found');
    });

    it('should throw error for unauthorized access', async () => {
      // Create another user
      const otherUserData = await createTestUser({ email: 'other@example.com' });
      const otherUserResult = await testDb.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, is_verified, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        otherUserData.email,
        otherUserData.passwordHash,
        otherUserData.firstName,
        otherUserData.lastName,
        otherUserData.isVerified,
        otherUserData.isActive
      ]);
      
      const otherUser = otherUserResult.rows[0];
      
      await expect(urlService.deleteUrl(testUrl.id, otherUser.id))
        .rejects
        .toThrow('URL not found');
    });
  });
});
