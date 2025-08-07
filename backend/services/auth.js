const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { Op } = require('sequelize');
const User = require('../models/User');
const config = require('../config/security');
const NotificationService = require('./notifications');
const databaseService = require('./database');

class AuthService {
  static async authenticateUser(email, password) {
    console.log('🔍 AUTH SERVICE: Looking for user:', email);
    
    // Try Supabase first
    try {
      const user = await databaseService.getUserByEmail(email);
      
      if (!user) {
        console.log('❌ AUTH SERVICE: User not found:', email);
        throw new Error('Invalid credentials');
      }

      console.log('✅ AUTH SERVICE: User found:', user.email, 'ID:', user.id);
      console.log('🔐 AUTH SERVICE: Validating password...');
      
      // For Supabase users, we need to handle password validation differently
      // since the password hash might be stored differently
      let isValidPassword = false;
      
      if (user.password_hash) {
        // Standard bcrypt validation
        isValidPassword = await bcrypt.compare(password, user.password_hash);
      } else {
        // No hardcoded passwords allowed
      }
      
      if (!isValidPassword) {
        console.log('❌ AUTH SERVICE: Invalid password for:', email);
        throw new Error('Invalid credentials');
      }

      console.log('✅ AUTH SERVICE: Password valid, updating last login...');
      // Update last login
      await databaseService.updateUser(user.id, { lastLogin: new Date() });
      console.log('✅ AUTH SERVICE: Last login updated, returning user');

      return user;
    } catch (error) {
      console.log('❌ AUTH SERVICE: Supabase authentication failed:', error.message);
      
      // Check if we're using Supabase - if so, don't fall back to SQLite
      const { useSupabase } = require('../config/database');
      
      if (useSupabase) {
        console.log('❌ AUTH SERVICE: In Supabase mode - no SQLite fallback available');
        throw new Error('Invalid login credentials');
      }
      
      // Only use SQLite fallback if we're not in Supabase mode
      console.log('🔄 AUTH SERVICE: Trying SQLite fallback...');
      const user = await User.findOne({ where: { email, isActive: true } });
      
      if (!user) {
        console.log('❌ AUTH SERVICE: User not found in local database:', email);
        throw new Error('Invalid credentials');
      }

      console.log('✅ User found in database:', user.email, 'ID:', user.id);
      
      const isValidPassword = await user.validatePassword(password);
      if (!isValidPassword) {
        console.log('❌ AUTH SERVICE: Invalid password for:', email);
        throw new Error('Invalid credentials');
      }

      console.log('✅ AUTH SERVICE: Password valid, updating last login...');
      await user.update({ lastLogin: new Date() });
      console.log('✅ AUTH SERVICE: Last login updated, returning user');

      return user;
    }
  }

  static generateTokens(user) {
    console.log('🔑 AUTH SERVICE: Generating tokens for user:', user.email);
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };
    console.log('📦 AUTH SERVICE: Token payload:', payload);

    console.log('🔐 AUTH SERVICE: Signing JWT token...');
    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    });

    console.log('🔄 AUTH SERVICE: Signing refresh token...');
    const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    });

    console.log('✅ AUTH SERVICE: Tokens generated successfully');
    return { token, refreshToken };
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret, {
        issuer: config.jwt.issuer,
        audience: config.jwt.audience
      });
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  static verifyRefreshToken(refreshToken) {
    try {
      return jwt.verify(refreshToken, config.jwt.refreshSecret, {
        issuer: config.jwt.issuer,
        audience: config.jwt.audience
      });
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  static async createUser(userData) {
    const existingUser = await User.findOne({ where: { email: userData.email } });
    if (existingUser) {
      throw new Error('User already exists');
    }

    return await User.create({
      email: userData.email,
      passwordHash: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role || 'client',
      phone: userData.phone
    });
  }

  static async getUserById(userId) {
    return await User.findByPk(userId);
  }

  static async updateUser(userId, updateData) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return await user.update(updateData);
  }

  static async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const isValidPassword = await user.validatePassword(currentPassword);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    return await user.update({ passwordHash: newPassword });
  }

  static async setupTwoFactor(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate proper 2FA secret using speakeasy
    const secret = speakeasy.generateSecret({
      name: `Peak 1031 - ${user.email}`,
      issuer: 'Peak 1031 Platform',
      length: 32
    });
    
    await user.update({
      twoFaSecret: secret.base32,
      twoFaEnabled: false // Will be enabled after verification
    });

    // Generate QR code for easy setup
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32
    };
  }

  static async enableTwoFactor(userId, verificationCode) {
    const user = await User.findByPk(userId);
    if (!user || !user.twoFaSecret) {
      throw new Error('2FA setup not initiated');
    }

    // Verify the code to ensure proper setup
    const verified = speakeasy.totp.verify({
      secret: user.twoFaSecret,
      encoding: 'base32',
      token: verificationCode,
      window: 1
    });

    if (!verified) {
      throw new Error('Invalid verification code');
    }

    await user.update({ twoFaEnabled: true });
    
    // Send confirmation email
    await NotificationService.sendTwoFactorEnabled(user.email, user.firstName);
    
    return { success: true, message: '2FA has been enabled successfully' };
  }

  static async disableTwoFactor(userId, password, verificationCode) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      throw new Error('Invalid password');
    }

    // Verify 2FA code
    if (user.twoFaEnabled) {
      const verified = speakeasy.totp.verify({
        secret: user.twoFaSecret,
        encoding: 'base32',
        token: verificationCode,
        window: 1
      });

      if (!verified) {
        throw new Error('Invalid 2FA code');
      }
    }

    await user.update({
      twoFaEnabled: false,
      twoFaSecret: null
    });

    // Send confirmation email
    await NotificationService.sendTwoFactorDisabled(user.email, user.firstName);
    
    return { success: true, message: '2FA has been disabled' };
  }

  static async verifyTwoFactor(userId, code) {
    const user = await User.findByPk(userId);
    if (!user || !user.twoFaEnabled) {
      throw new Error('2FA not enabled');
    }

    // Verify using speakeasy
    const verified = speakeasy.totp.verify({
      secret: user.twoFaSecret,
      encoding: 'base32',
      token: code,
      window: 1
    });

    return verified;
  }

  static async generatePasswordResetToken(email) {
    const user = await User.findOne({ where: { email, isActive: true } });
    if (!user) {
      // Don't reveal if user exists for security
      return { success: true, message: 'If the email exists, a reset link has been sent' };
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await user.update({
      passwordResetToken: resetToken,
      passwordResetExpiry: resetTokenExpiry
    });

    // Send reset email
    await NotificationService.sendPasswordResetEmail(user.email, user.firstName, resetToken);

    return { success: true, message: 'If the email exists, a reset link has been sent' };
  }

  static async resetPassword(resetToken, newPassword) {
    const user = await User.findOne({
      where: {
        passwordResetToken: resetToken,
        passwordResetExpiry: {
          [Op.gt]: new Date()
        },
        isActive: true
      }
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await user.update({
      passwordHash: hashedPassword,
      passwordResetToken: null,
      passwordResetExpiry: null
    });

    // Send confirmation email
    await NotificationService.sendPasswordResetConfirmation(user.email, user.firstName);

    return { success: true, message: 'Password has been reset successfully' };
  }

  static async refreshAuthToken(refreshToken) {
    try {
      const decoded = this.verifyRefreshToken(refreshToken);
      
      // Get fresh user data
      const user = await User.findByPk(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Generate new tokens
      const tokens = this.generateTokens(user);
      
      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          twoFaEnabled: user.twoFaEnabled
        },
        ...tokens
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  static async loginAttempt(email, password, ipAddress, userAgent) {
    try {
      const user = await this.authenticateUser(email, password);
      
      // Check if 2FA is enabled
      if (user.twoFaEnabled) {
        // Generate temporary token for 2FA verification
        const tempToken = jwt.sign(
          { userId: user.id, requires2FA: true },
          config.jwt.secret,
          { expiresIn: '10m' }
        );
        
        return {
          requiresTwoFactor: true,
          tempToken,
          message: 'Please provide your 2FA code'
        };
      }

      // Generate full tokens
      const tokens = this.generateTokens(user);

      // Log successful login
      await this.logSecurityEvent(user.id, 'LOGIN_SUCCESS', {
        ipAddress,
        userAgent
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          twoFaEnabled: user.twoFaEnabled
        },
        ...tokens
      };
    } catch (error) {
      // Log failed login attempt
      await this.logSecurityEvent(null, 'LOGIN_FAILED', {
        email,
        ipAddress,
        userAgent,
        reason: error.message
      });

      throw error;
    }
  }

  static async completeTwoFactorLogin(tempToken, twoFactorCode, ipAddress, userAgent) {
    try {
      const decoded = jwt.verify(tempToken, config.jwt.secret);
      
      if (!decoded.requires2FA) {
        throw new Error('Invalid temp token');
      }

      const user = await User.findByPk(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found');
      }

      // Verify 2FA code
      const isValid2FA = await this.verifyTwoFactor(user.id, twoFactorCode);
      if (!isValid2FA) {
        await this.logSecurityEvent(user.id, '2FA_FAILED', {
          ipAddress,
          userAgent
        });
        throw new Error('Invalid 2FA code');
      }

      // Generate full tokens
      const tokens = this.generateTokens(user);

      // Log successful 2FA login
      await this.logSecurityEvent(user.id, '2FA_SUCCESS', {
        ipAddress,
        userAgent
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          twoFaEnabled: user.twoFaEnabled
        },
        ...tokens
      };
    } catch (error) {
      throw error;
    }
  }

  static async logSecurityEvent(userId, event, details = {}) {
    try {
      // Import AuditLog here to avoid circular dependency
      const AuditLog = require('../models/AuditLog');
      
      await AuditLog.create({
        action: event,
        entityType: 'user',
        entityId: userId,
        userId: userId,
        ipAddress: details.ipAddress,
        userAgent: details.userAgent,
        details: details
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }
}

module.exports = AuthService; 