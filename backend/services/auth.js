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
      
      // Check for password in different possible field names
      const passwordHash = user.password_hash || user.password || user.passwordHash;
      
      if (passwordHash) {
        console.log('🔐 AUTH SERVICE: Found password hash, comparing...');
        // Standard bcrypt validation
        isValidPassword = await bcrypt.compare(password, passwordHash);
      } else {
        console.log('❌ AUTH SERVICE: No password hash found for user');
        console.log('🔍 AUTH SERVICE: User object keys:', Object.keys(user));
      }
      
      if (!isValidPassword) {
        console.log('❌ AUTH SERVICE: Invalid password for:', email);
        throw new Error('Invalid credentials');
      }

      console.log('✅ AUTH SERVICE: Password valid, updating last login...');
      // Update last login - use snake_case for database compatibility
      await databaseService.updateUser(user.id, { last_login: new Date().toISOString() });
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
      await user.update({ last_login: new Date() });
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
    console.log('👤 AUTH SERVICE: Creating new user:', userData.email);
    
    // Check if user already exists
    const existingUser = await databaseService.getUserByEmail(userData.email);
    if (existingUser) {
      throw new Error('User already exists');
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    const { v4: uuidv4 } = require('uuid');
    
    // Create contact record first
    const contactData = {
      id: uuidv4(),
      first_name: userData.firstName,
      last_name: userData.lastName,
      email: userData.email,
      phone: userData.phone || null,
      contact_type: 'person',
      source: 'user_signup',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('📇 AUTH SERVICE: Creating contact record...');
    await databaseService.insert('contacts', contactData);
    
    // Create user record with link to contact
    const userRecord = {
      id: uuidv4(),
      email: userData.email,
      password_hash: hashedPassword,
      first_name: userData.firstName,
      last_name: userData.lastName,
      role: userData.role || 'client',
      phone: userData.phone || null,
      contact_id: contactData.id, // Link to the contact record
      is_active: true,
      email_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('👤 AUTH SERVICE: Creating user record...');
    const user = await databaseService.createUser(userRecord);
    
    console.log('✅ AUTH SERVICE: User and contact created successfully');
    console.log('👤 User ID:', user.id);
    console.log('📇 Contact ID:', contactData.id);
    
    return user;
  }

  static async getUserById(userId) {
    try {
      const user = await databaseService.getUserById(userId);
      
      if (!user) {
        return null;
      }
      
      // Return user with expected properties
      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name || user.firstName,
        lastName: user.last_name || user.lastName,
        role: user.role,
        isActive: user.is_active !== false,
        passwordHash: user.password_hash
      };
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
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
  static async getUserProfile(userId) {
    try {
      // Get user from database service
      const users = await databaseService.getUsers({
        where: { id: userId },
        limit: 1
      });

      if (!users || users.length === 0) {
        return null;
      }

      const user = users[0];
      
      // Return profile data
      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name || user.firstName,
        lastName: user.last_name || user.lastName,
        role: user.role,
        phone: user.phone,
        company: user.company,
        timezone: user.timezone || 'America/New_York',
        isActive: user.is_active !== false,
        emailVerified: true, // Default since column doesn't exist
        twoFaEnabled: user.two_fa_enabled || false,
        lastLogin: user.last_login || user.lastLogin,
        createdAt: user.created_at || user.createdAt,
        updatedAt: user.updated_at || user.updatedAt
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  static async updateUserProfile(userId, profileData) {
    try {
      const updateData = {};
      
      // Map profile fields to database columns
      if (profileData.firstName) updateData.first_name = profileData.firstName;
      if (profileData.lastName) updateData.last_name = profileData.lastName;
      if (profileData.phone) updateData.phone = profileData.phone;
      if (profileData.company) updateData.company = profileData.company;
      if (profileData.timezone) updateData.timezone = profileData.timezone;
      if (profileData.default_document_pin !== undefined) updateData.default_document_pin = profileData.default_document_pin;
      
      // Update user in database
      const updatedUser = await databaseService.updateUser(userId, updateData);
      
      // Return updated profile
      return {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name || updatedUser.firstName,
        lastName: updatedUser.last_name || updatedUser.lastName,
        role: updatedUser.role,
        phone: updatedUser.phone,
        company: updatedUser.company,
        timezone: updatedUser.timezone || 'America/New_York',
        default_document_pin: updatedUser.default_document_pin,
        isActive: updatedUser.is_active !== false,
        emailVerified: true,
        twoFaEnabled: updatedUser.two_fa_enabled || false,
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }
}

module.exports = AuthService; 