const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { query } = require('../database/connection');

const router = express.Router();

/**
 * @swagger
 * /api/users/stats:
 *   get:
 *     summary: Get user statistics
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalUrls:
 *                       type: integer
 *                     activeUrls:
 *                       type: integer
 *                     totalClicks:
 *                       type: integer
 *                     clicksThisMonth:
 *                       type: integer
 *                     topUrl:
 *                       type: object
 */
router.get('/stats', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get user statistics
  const statsQuery = `
    SELECT 
      COUNT(*) as total_urls,
      COUNT(*) FILTER (WHERE is_active = true) as active_urls,
      COALESCE(SUM(click_count), 0) as total_clicks
    FROM urls 
    WHERE user_id = $1
  `;

  const clicksThisMonthQuery = `
    SELECT COUNT(*) as clicks_this_month
    FROM url_clicks uc
    JOIN urls u ON uc.url_id = u.id
    WHERE u.user_id = $1 
      AND uc.clicked_at >= date_trunc('month', CURRENT_DATE)
      AND uc.is_bot = false
  `;

  const topUrlQuery = `
    SELECT short_code, original_url, title, click_count
    FROM urls
    WHERE user_id = $1 AND is_active = true
    ORDER BY click_count DESC
    LIMIT 1
  `;

  const [statsResult, clicksResult, topUrlResult] = await Promise.all([
    query(statsQuery, [userId]),
    query(clicksThisMonthQuery, [userId]),
    query(topUrlQuery, [userId]),
  ]);

  const stats = statsResult.rows[0];
  const clicksThisMonth = clicksResult.rows[0];
  const topUrl = topUrlResult.rows[0];

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  res.json({
    success: true,
    stats: {
      totalUrls: parseInt(stats.total_urls),
      activeUrls: parseInt(stats.active_urls),
      totalClicks: parseInt(stats.total_clicks),
      clicksThisMonth: parseInt(clicksThisMonth.clicks_this_month),
      topUrl: topUrl ? {
        shortCode: topUrl.short_code,
        shortUrl: `${baseUrl}/${topUrl.short_code}`,
        originalUrl: topUrl.original_url,
        title: topUrl.title,
        clickCount: topUrl.click_count,
      } : null,
    },
  });
}));

/**
 * @swagger
 * /api/users/sessions:
 *   get:
 *     summary: Get user's active sessions
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active sessions retrieved successfully
 */
router.get('/sessions', authenticateToken, asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT 
      id, ip_address, user_agent, created_at, last_used, expires_at
    FROM user_sessions
    WHERE user_id = $1 AND is_active = true AND expires_at > CURRENT_TIMESTAMP
    ORDER BY last_used DESC
  `, [req.user.id]);

  const sessions = result.rows.map(session => ({
    id: session.id,
    ipAddress: session.ip_address,
    userAgent: session.user_agent,
    createdAt: session.created_at,
    lastUsed: session.last_used,
    expiresAt: session.expires_at,
    isCurrent: session.ip_address === req.ip, // Simple check, could be more sophisticated
  }));

  res.json({
    success: true,
    sessions,
  });
}));

/**
 * @swagger
 * /api/users/sessions/{sessionId}:
 *   delete:
 *     summary: Revoke a user session
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Session revoked successfully
 */
router.delete('/sessions/:sessionId', authenticateToken, asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const result = await query(`
    UPDATE user_sessions 
    SET is_active = false 
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `, [sessionId, req.user.id]);

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Session not found',
    });
  }

  res.json({
    success: true,
    message: 'Session revoked successfully',
  });
}));

/**
 * @swagger
 * /api/users/activity:
 *   get:
 *     summary: Get user's recent activity
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Recent activity retrieved successfully
 */
router.get('/activity', authenticateToken, asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  // Get recent URL creations and updates
  const urlActivityQuery = `
    SELECT 
      'url_created' as activity_type,
      u.id as url_id,
      u.short_code,
      u.original_url,
      u.title,
      u.created_at as activity_date
    FROM urls u
    WHERE u.user_id = $1
    
    UNION ALL
    
    SELECT 
      'url_updated' as activity_type,
      u.id as url_id,
      u.short_code,
      u.original_url,
      u.title,
      u.updated_at as activity_date
    FROM urls u
    WHERE u.user_id = $1 AND u.updated_at > u.created_at
    
    ORDER BY activity_date DESC
    LIMIT $2
  `;

  const result = await query(urlActivityQuery, [req.user.id, limit]);

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const activities = result.rows.map(row => ({
    type: row.activity_type,
    date: row.activity_date,
    url: {
      id: row.url_id,
      shortCode: row.short_code,
      shortUrl: `${baseUrl}/${row.short_code}`,
      originalUrl: row.original_url,
      title: row.title,
    },
  }));

  res.json({
    success: true,
    activities,
  });
}));

// Admin-only routes
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users]
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
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       403:
 *         description: Admin access required
 */
router.get('/', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '' } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = '';
  const params = [];
  let paramCount = 0;

  if (search) {
    paramCount++;
    whereClause = `WHERE email ILIKE $${paramCount} OR first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount}`;
    params.push(`%${search}%`);
  }

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM users ${whereClause}`,
    params,
  );
  const total = parseInt(countResult.rows[0].total);

  // Get users
  const result = await query(`
    SELECT 
      id, email, first_name, last_name, role, is_verified, is_active,
      created_at, last_login,
      (SELECT COUNT(*) FROM urls WHERE user_id = users.id) as url_count,
      (SELECT COALESCE(SUM(click_count), 0) FROM urls WHERE user_id = users.id) as total_clicks
    FROM users 
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
  `, [...params, limit, offset]);

  const users = result.rows.map(user => ({
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    isVerified: user.is_verified,
    isActive: user.is_active,
    createdAt: user.created_at,
    lastLogin: user.last_login,
    urlCount: parseInt(user.url_count),
    totalClicks: parseInt(user.total_clicks),
  }));

  res.json({
    success: true,
    users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  });
}));

/**
 * @swagger
 * /api/users/{userId}/status:
 *   patch:
 *     summary: Update user status (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *               isActive:
 *                 type: boolean
 *               role:
 *                 type: string
 *                 enum: [user, premium, admin]
 *     responses:
 *       200:
 *         description: User status updated successfully
 */
router.patch('/:userId/status', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { isActive, role } = req.body;

  const updates = [];
  const params = [];
  let paramCount = 0;

  if (typeof isActive === 'boolean') {
    paramCount++;
    updates.push(`is_active = $${paramCount}`);
    params.push(isActive);
  }

  if (role && ['user', 'premium', 'admin'].includes(role)) {
    paramCount++;
    updates.push(`role = $${paramCount}`);
    params.push(role);
  }

  if (updates.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No valid updates provided',
    });
  }

  paramCount++;
  params.push(userId);

  const result = await query(`
    UPDATE users 
    SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramCount}
    RETURNING id, email, role, is_active
  `, params);

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  res.json({
    success: true,
    message: 'User status updated successfully',
    user: result.rows[0],
  });
}));

module.exports = router;
