const express = require('express');
const Joi = require('joi');
const { authenticateToken, requireOwnership } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const analyticsService = require('../services/analyticsService');

const router = express.Router();

// Validation schemas
const timeRangeSchema = Joi.object({
  timeRange: Joi.string().valid('24h', '7d', '30d', '90d', '1y').default('30d'),
});

/**
 * @swagger
 * components:
 *   schemas:
 *     AnalyticsSummary:
 *       type: object
 *       properties:
 *         totalClicksInRange:
 *           type: integer
 *         uniqueCountries:
 *           type: integer
 *         uniqueDevices:
 *           type: integer
 *         uniqueBrowsers:
 *           type: integer
 *         botClicks:
 *           type: integer
 *     ClicksByDate:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           format: date
 *         clicks:
 *           type: integer
 *         uniqueClicks:
 *           type: integer
 *     ClicksByCountry:
 *       type: object
 *       properties:
 *         country:
 *           type: string
 *         clicks:
 *           type: integer
 *         uniqueClicks:
 *           type: integer
 *     UrlAnalytics:
 *       type: object
 *       properties:
 *         url:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             shortCode:
 *               type: string
 *             originalUrl:
 *               type: string
 *             title:
 *               type: string
 *             totalClicks:
 *               type: integer
 *             createdAt:
 *               type: string
 *               format: date-time
 *             lastAccessed:
 *               type: string
 *               format: date-time
 *         timeRange:
 *           type: string
 *         summary:
 *           $ref: '#/components/schemas/AnalyticsSummary'
 *         clicksByDate:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ClicksByDate'
 *         clicksByCountry:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ClicksByCountry'
 */

/**
 * @swagger
 * /api/analytics/overview:
 *   get:
 *     summary: Get user's overall analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d, 90d, 1y]
 *           default: 30d
 *     responses:
 *       200:
 *         description: Analytics overview retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 analytics:
 *                   type: object
 *                   properties:
 *                     totalUrls:
 *                       type: integer
 *                     totalClicks:
 *                       type: integer
 *                     clicksInRange:
 *                       type: integer
 *                     uniqueCountries:
 *                       type: integer
 *                     uniqueVisitors:
 *                       type: integer
 *                     timeRange:
 *                       type: string
 */
router.get('/overview', authenticateToken, asyncHandler(async (req, res) => {
  // Validate query parameters
  const { error, value } = timeRangeSchema.validate(req.query);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => detail.message),
    });
  }

  const analytics = await analyticsService.getUserAnalytics(req.user.id, value.timeRange);

  res.json({
    success: true,
    analytics,
  });
}));

/**
 * @swagger
 * /api/analytics/urls/{urlId}:
 *   get:
 *     summary: Get detailed analytics for a specific URL
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: urlId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d, 90d, 1y]
 *           default: 30d
 *     responses:
 *       200:
 *         description: URL analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 analytics:
 *                   $ref: '#/components/schemas/UrlAnalytics'
 *       404:
 *         description: URL not found or access denied
 */
router.get('/urls/:urlId', authenticateToken, asyncHandler(async (req, res) => {
  const { urlId } = req.params;

  // Validate query parameters
  const { error, value } = timeRangeSchema.validate(req.query);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => detail.message),
    });
  }

  const analytics = await analyticsService.getUrlAnalytics(urlId, req.user.id, value.timeRange);

  res.json({
    success: true,
    analytics,
  });
}));

/**
 * @swagger
 * /api/analytics/urls/{urlId}/clicks:
 *   get:
 *     summary: Get recent clicks for a URL
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: urlId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Recent clicks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 clicks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       clickedAt:
 *                         type: string
 *                         format: date-time
 *                       ipAddress:
 *                         type: string
 *                       country:
 *                         type: string
 *                       city:
 *                         type: string
 *                       deviceType:
 *                         type: string
 *                       browser:
 *                         type: string
 *                       os:
 *                         type: string
 *                       referer:
 *                         type: string
 *                       isBot:
 *                         type: boolean
 */
router.get('/urls/:urlId/clicks', authenticateToken, asyncHandler(async (req, res) => {
  const { urlId } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  // Verify URL ownership
  const { query } = require('../database/connection');
  const urlCheck = await query(
    'SELECT id FROM urls WHERE id = $1 AND user_id = $2',
    [urlId, req.user.id],
  );

  if (urlCheck.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'URL not found or access denied',
    });
  }

  const clicks = await analyticsService.getRecentClicks(urlId, limit);

  res.json({
    success: true,
    clicks,
  });
}));

/**
 * @swagger
 * /api/analytics/export/{urlId}:
 *   get:
 *     summary: Export analytics data for a URL
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: urlId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d, 90d, 1y]
 *           default: 30d
 *     responses:
 *       200:
 *         description: Analytics data exported successfully
 *       404:
 *         description: URL not found or access denied
 */
router.get('/export/:urlId', authenticateToken, asyncHandler(async (req, res) => {
  const { urlId } = req.params;
  const { format = 'json', timeRange = '30d' } = req.query;

  // Validate format
  if (!['json', 'csv'].includes(format)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid format. Supported formats: json, csv',
    });
  }

  const analytics = await analyticsService.getUrlAnalytics(urlId, req.user.id, timeRange);

  if (format === 'csv') {
    // Convert to CSV format
    const csvData = [
      ['Date', 'Clicks', 'Unique Clicks'],
      ...analytics.clicksByDate.map(item => [
        item.date,
        item.clicks,
        item.uniqueClicks,
      ]),
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="analytics-${urlId}-${timeRange}.csv"`);
    res.send(csvContent);
  } else {
    // JSON format
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="analytics-${urlId}-${timeRange}.json"`);
    res.json({
      success: true,
      analytics,
      exportedAt: new Date().toISOString(),
    });
  }
}));

/**
 * @swagger
 * /api/analytics/top-urls:
 *   get:
 *     summary: Get user's top performing URLs
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [clicks, unique_clicks, recent_activity]
 *           default: clicks
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d, 90d, 1y]
 *           default: 30d
 *     responses:
 *       200:
 *         description: Top URLs retrieved successfully
 */
router.get('/top-urls', authenticateToken, asyncHandler(async (req, res) => {
  const {
    limit = 10,
    sortBy = 'clicks',
    timeRange = '30d',
  } = req.query;

  // Validate parameters
  const validSortBy = ['clicks', 'unique_clicks', 'recent_activity'];
  if (!validSortBy.includes(sortBy)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid sortBy parameter',
    });
  }

  const limitNum = Math.min(parseInt(limit) || 10, 50);

  // Calculate date range
  const dateRange = analyticsService.calculateDateRange(timeRange);

  const { query } = require('../database/connection');

  let orderByClause;
  switch (sortBy) {
  case 'unique_clicks':
    orderByClause = 'unique_clicks DESC';
    break;
  case 'recent_activity':
    orderByClause = 'last_accessed DESC NULLS LAST';
    break;
  default:
    orderByClause = 'total_clicks DESC';
  }

  const result = await query(`
    SELECT 
      u.id,
      u.short_code,
      u.original_url,
      u.title,
      u.click_count as total_clicks,
      u.last_accessed,
      COUNT(uc.id) as clicks_in_range,
      COUNT(DISTINCT uc.ip_address) as unique_clicks
    FROM urls u
    LEFT JOIN url_clicks uc ON u.id = uc.url_id 
      AND uc.clicked_at >= $2 
      AND uc.clicked_at <= $3
      AND uc.is_bot = false
    WHERE u.user_id = $1 AND u.is_active = true
    GROUP BY u.id, u.short_code, u.original_url, u.title, u.click_count, u.last_accessed
    ORDER BY ${orderByClause}
    LIMIT $4
  `, [req.user.id, dateRange.start, dateRange.end, limitNum]);

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const topUrls = result.rows.map(row => ({
    id: row.id,
    shortCode: row.short_code,
    shortUrl: `${baseUrl}/${row.short_code}`,
    originalUrl: row.original_url,
    title: row.title,
    totalClicks: parseInt(row.total_clicks),
    clicksInRange: parseInt(row.clicks_in_range),
    uniqueClicks: parseInt(row.unique_clicks),
    lastAccessed: row.last_accessed,
  }));

  res.json({
    success: true,
    topUrls,
    timeRange,
    sortBy,
    limit: limitNum,
  });
}));

module.exports = router;
