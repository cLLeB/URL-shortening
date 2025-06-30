const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query, transaction } = require('../database/connection');
const { generateTokens, verifyRefreshToken } = require('../middleware/auth');
const { set, get, del } = require('../config/redis');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');

class AuthService {
  constructor() {
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.maxLoginAttempts = 5;
    this.lockoutDuration = 15 * 60; // 15 minutes in seconds
  }

  // Register a new user
  async register(userData) {
    try {
      const { email, password, firstName, lastName } = userData;

      // Check if user already exists
      const existingUser = await query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        throw new AppError('User with this email already exists', 409);
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, this.bcryptRounds);

      // Create user
      const result = await query(`
        INSERT INTO users (email, password_hash, first_name, last_name, is_verified, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, first_name, last_name, role, is_verified, created_at
      `, [
        email.toLowerCase(),
        passwordHash,
        firstName || null,
        lastName || null,
        false, // Email verification required
        true
      ]);

      const user = result.rows[0];

      // Generate tokens
      const tokens = generateTokens(user.id);

      // Store refresh token
      await this.storeRefreshToken(user.id, tokens.refreshToken);

      logger.logBusinessEvent('User registered', {
        userId: user.id,
        email: user.email
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          isVerified: user.is_verified,
          createdAt: user.created_at
        },
        tokens
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Registration error:', error);
      throw new AppError('Registration failed', 500);
    }
  }

  // Login user
  async login(email, password, ipAddress, userAgent) {
    try {
      const normalizedEmail = email.toLowerCase();

      // Check for account lockout
      await this.checkAccountLockout(normalizedEmail, ipAddress);

      // Get user
      const result = await query(
        'SELECT id, email, password_hash, first_name, last_name, role, is_verified, is_active FROM users WHERE email = $1',
        [normalizedEmail]
      );

      if (result.rows.length === 0) {
        await this.recordFailedLogin(normalizedEmail, ipAddress);
        throw new AppError('Invalid email or password', 401);
      }

      const user = result.rows[0];

      // Check if account is active
      if (!user.is_active) {
        throw new AppError('Account is deactivated', 401);
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        await this.recordFailedLogin(normalizedEmail, ipAddress);
        throw new AppError('Invalid email or password', 401);
      }

      // Clear failed login attempts
      await this.clearFailedLogins(normalizedEmail, ipAddress);

      // Generate tokens
      const tokens = generateTokens(user.id);

      // Store refresh token
      await this.storeRefreshToken(user.id, tokens.refreshToken, ipAddress, userAgent);

      // Update last login
      await query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      logger.logBusinessEvent('User logged in', {
        userId: user.id,
        email: user.email,
        ipAddress
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          isVerified: user.is_verified
        },
        tokens
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Login error:', error);
      throw new AppError('Login failed', 500);
    }
  }

  // Refresh access token
  async refreshToken(refreshToken, ipAddress, userAgent) {
    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);
      
      if (decoded.type !== 'refresh') {
        throw new AppError('Invalid refresh token', 401);
      }

      // Check if refresh token exists in database
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const result = await query(`
        SELECT us.user_id, u.email, u.first_name, u.last_name, u.role, u.is_verified, u.is_active
        FROM user_sessions us
        JOIN users u ON us.user_id = u.id
        WHERE us.refresh_token_hash = $1 AND us.is_active = true AND us.expires_at > CURRENT_TIMESTAMP
      `, [tokenHash]);

      if (result.rows.length === 0) {
        throw new AppError('Invalid or expired refresh token', 401);
      }

      const user = result.rows[0];

      // Check if user is still active
      if (!user.is_active) {
        throw new AppError('Account is deactivated', 401);
      }

      // Generate new tokens
      const tokens = generateTokens(user.user_id);

      // Store new refresh token and invalidate old one
      await transaction(async (client) => {
        // Invalidate old refresh token
        await client.query(
          'UPDATE user_sessions SET is_active = false WHERE refresh_token_hash = $1',
          [tokenHash]
        );

        // Store new refresh token
        const newTokenHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
        await client.query(`
          INSERT INTO user_sessions (user_id, refresh_token_hash, ip_address, user_agent, expires_at)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          user.user_id,
          newTokenHash,
          ipAddress,
          userAgent,
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        ]);
      });

      logger.logBusinessEvent('Token refreshed', {
        userId: user.user_id,
        ipAddress
      });

      return {
        user: {
          id: user.user_id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          isVerified: user.is_verified
        },
        tokens
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error.name && error.name.includes('Token')) {
        throw new AppError('Invalid or expired refresh token', 401);
      }
      logger.error('Token refresh error:', error);
      throw new AppError('Token refresh failed', 500);
    }
  }

  // Logout user
  async logout(refreshToken) {
    try {
      if (!refreshToken) {
        return true; // Nothing to do
      }

      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      
      // Invalidate refresh token
      await query(
        'UPDATE user_sessions SET is_active = false WHERE refresh_token_hash = $1',
        [tokenHash]
      );

      return true;
    } catch (error) {
      logger.error('Logout error:', error);
      // Don't throw error for logout failures
      return true;
    }
  }

  // Store refresh token
  async storeRefreshToken(userId, refreshToken, ipAddress = null, userAgent = null) {
    try {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await query(`
        INSERT INTO user_sessions (user_id, refresh_token_hash, ip_address, user_agent, expires_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [userId, tokenHash, ipAddress, userAgent, expiresAt]);
    } catch (error) {
      logger.error('Error storing refresh token:', error);
      throw error;
    }
  }

  // Check account lockout
  async checkAccountLockout(email, ipAddress) {
    try {
      const lockoutKey = `lockout:${email}:${ipAddress}`;
      const lockoutData = await get(lockoutKey);

      if (lockoutData && lockoutData.attempts >= this.maxLoginAttempts) {
        const timeRemaining = Math.ceil((lockoutData.lockedUntil - Date.now()) / 1000);
        if (timeRemaining > 0) {
          throw new AppError(
            `Account temporarily locked due to too many failed login attempts. Try again in ${Math.ceil(timeRemaining / 60)} minutes.`,
            429
          );
        } else {
          // Lockout expired, clear it
          await del(lockoutKey);
        }
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error checking account lockout:', error);
      // Don't throw error for lockout check failures
    }
  }

  // Record failed login attempt
  async recordFailedLogin(email, ipAddress) {
    try {
      const lockoutKey = `lockout:${email}:${ipAddress}`;
      const lockoutData = await get(lockoutKey) || { attempts: 0 };

      lockoutData.attempts += 1;
      lockoutData.lastAttempt = Date.now();

      if (lockoutData.attempts >= this.maxLoginAttempts) {
        lockoutData.lockedUntil = Date.now() + (this.lockoutDuration * 1000);
        
        logger.logSecurityEvent('Account locked due to failed login attempts', {
          email,
          ipAddress,
          attempts: lockoutData.attempts
        });
      }

      await set(lockoutKey, lockoutData, this.lockoutDuration);
    } catch (error) {
      logger.error('Error recording failed login:', error);
    }
  }

  // Clear failed login attempts
  async clearFailedLogins(email, ipAddress) {
    try {
      const lockoutKey = `lockout:${email}:${ipAddress}`;
      await del(lockoutKey);
    } catch (error) {
      logger.error('Error clearing failed logins:', error);
    }
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Get current password hash
      const result = await query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new AppError('User not found', 404);
      }

      const user = result.rows[0];

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        throw new AppError('Current password is incorrect', 400);
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, this.bcryptRounds);

      // Update password
      await query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newPasswordHash, userId]
      );

      // Invalidate all user sessions except current one
      await query(
        'UPDATE user_sessions SET is_active = false WHERE user_id = $1',
        [userId]
      );

      logger.logBusinessEvent('Password changed', {
        userId
      });

      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Password change error:', error);
      throw new AppError('Password change failed', 500);
    }
  }

  // Get user profile
  async getUserProfile(userId) {
    try {
      const result = await query(`
        SELECT 
          id, email, first_name, last_name, role, is_verified, is_active,
          created_at, updated_at, last_login
        FROM users 
        WHERE id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        throw new AppError('User not found', 404);
      }

      const user = result.rows[0];

      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isVerified: user.is_verified,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLogin: user.last_login
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting user profile:', error);
      throw new AppError('Failed to retrieve user profile', 500);
    }
  }

  // Update user profile
  async updateUserProfile(userId, updates) {
    try {
      const allowedUpdates = ['first_name', 'last_name'];
      const updateFields = [];
      const params = [];
      let paramCount = 0;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedUpdates.includes(key)) {
          paramCount++;
          updateFields.push(`${key} = $${paramCount}`);
          params.push(value);
        }
      }

      if (updateFields.length === 0) {
        throw new AppError('No valid fields to update', 400);
      }

      paramCount++;
      params.push(userId);

      const result = await query(`
        UPDATE users 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
        RETURNING id, email, first_name, last_name, role, is_verified, updated_at
      `, params);

      if (result.rows.length === 0) {
        throw new AppError('User not found', 404);
      }

      const user = result.rows[0];

      logger.logBusinessEvent('User profile updated', {
        userId,
        updates: Object.keys(updates)
      });

      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isVerified: user.is_verified,
        updatedAt: user.updated_at
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating user profile:', error);
      throw new AppError('Failed to update user profile', 500);
    }
  }
}

module.exports = new AuthService();
