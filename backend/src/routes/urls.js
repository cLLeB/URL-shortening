const express = require('express');
const Joi = require('joi');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { urlCreationLimiter, urlQuotaCheck } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');
const urlService = require('../services/urlService');

const router = express.Router();

// Validation schemas
const createUrlSchema = Joi.object({
  originalUrl: Joi.string().uri({ scheme: ['http', 'https'] }).required().max(2048),
  customAlias: Joi.string().alphanum().min(3).max(50).optional(),
  title: Joi.string().max(500).optional(),
  description: Joi.string().max(1000).optional(),
  expiresAt: Joi.date().greater('now').optional(),
  isPublic: Joi.boolean().default(true)
});

const updateUrlSchema = Joi.object({
  title: Joi.string().max(500).optional(),
  description: Joi.string().max(1000).optional(),
  isActive: Joi.boolean().optional(),
  isPublic: Joi.boolean().optional(),
  expiresAt: Joi.date().greater('now').allow(null).optional()
});

const getUrlsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('created_at', 'updated_at', 'click_count', 'title').default('created_at'),
  sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC'),
  search: Joi.string().max(100).optional(),
  isActive: Joi.boolean().optional()
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Url:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         originalUrl:
 *           type: string
 *           format: uri
 *         shortCode:
 *           type: string
 *         shortUrl:
 *           type: string
 *           format: uri
 *         customAlias:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         isActive:
 *           type: boolean
 *         isPublic:
 *           type: boolean
 *         clickCount:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         expiresAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/urls:
 *   post:
 *     summary: Create a new short URL
 *     tags: [URLs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - originalUrl
 *             properties:
 *               originalUrl:
 *                 type: string
 *                 format: uri
 *               customAlias:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *               title:
 *                 type: string
 *                 maxLength: 500
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *               isPublic:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: URL created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 url:
 *                   $ref: '#/components/schemas/Url'
 *       400:
 *         description: Validation error
 *       409:
 *         description: Custom alias already taken
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/', optionalAuth, urlCreationLimiter, urlQuotaCheck, asyncHandler(async (req, res) => {
  // Validate request body
  const { error, value } = createUrlSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => detail.message)
    });
  }

  const urlData = {
    ...value,
    userId: req.user?.id
  };

  const url = await urlService.createUrl(urlData);

  res.status(201).json({
    success: true,
    message: 'URL created successfully',
    url,
    quota: req.quota
  });
}));

/**
 * @swagger
 * /api/urls:
 *   get:
 *     summary: Get user's URLs
 *     tags: [URLs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [created_at, updated_at, click_count, title]
 *           default: created_at
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 100
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: URLs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 urls:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Url'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 */
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  // Validate query parameters
  const { error, value } = getUrlsSchema.validate(req.query);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => detail.message)
    });
  }

  const result = await urlService.getUserUrls(req.user.id, value);

  res.json({
    success: true,
    urls: result.urls,
    pagination: result.pagination
  });
}));

/**
 * @swagger
 * /api/urls/{id}:
 *   get:
 *     summary: Get URL by ID
 *     tags: [URLs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: URL retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 url:
 *                   $ref: '#/components/schemas/Url'
 *       404:
 *         description: URL not found
 */
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get URL from database to check ownership
  const { query } = require('../database/connection');
  const result = await query(
    'SELECT * FROM urls WHERE id = $1 AND user_id = $2',
    [id, req.user.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'URL not found'
    });
  }

  const url = result.rows[0];
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  res.json({
    success: true,
    url: {
      id: url.id,
      originalUrl: url.original_url,
      shortCode: url.short_code,
      shortUrl: `${baseUrl}/${url.short_code}`,
      customAlias: url.custom_alias,
      title: url.title,
      description: url.description,
      isActive: url.is_active,
      isPublic: url.is_public,
      clickCount: url.click_count,
      createdAt: url.created_at,
      updatedAt: url.updated_at,
      expiresAt: url.expires_at,
      lastAccessed: url.last_accessed
    }
  });
}));

/**
 * @swagger
 * /api/urls/{id}:
 *   put:
 *     summary: Update URL
 *     tags: [URLs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 500
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               isActive:
 *                 type: boolean
 *               isPublic:
 *                 type: boolean
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: URL updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 url:
 *                   $ref: '#/components/schemas/Url'
 *       400:
 *         description: Validation error
 *       404:
 *         description: URL not found
 */
router.put('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate request body
  const { error, value } = updateUrlSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => detail.message)
    });
  }

  const url = await urlService.updateUrl(id, req.user.id, value);

  res.json({
    success: true,
    message: 'URL updated successfully',
    url
  });
}));

/**
 * @swagger
 * /api/urls/{id}:
 *   delete:
 *     summary: Delete URL
 *     tags: [URLs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: URL deleted successfully
 *       404:
 *         description: URL not found
 */
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  await urlService.deleteUrl(id, req.user.id);

  res.json({
    success: true,
    message: 'URL deleted successfully'
  });
}));

module.exports = router;
