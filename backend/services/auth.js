const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const config = require('../config/security');

class AuthService {
  static async authenticateUser(email, password) {
    const user = await User.findOne({ where: { email, isActive: true } });
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    return user;
  }

  static generateTokens(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    });

    const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    });

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

    // Generate 2FA secret (in production, use a proper 2FA library)
    const secret = Math.random().toString(36).substring(2, 15);
    
    await user.update({
      twoFaSecret: secret,
      twoFaEnabled: true
    });

    return secret;
  }

  static async verifyTwoFactor(userId, code) {
    const user = await User.findByPk(userId);
    if (!user || !user.twoFaEnabled) {
      throw new Error('2FA not enabled');
    }

    // Simple verification (in production, use proper 2FA library)
    return user.twoFaSecret === code;
  }
}

module.exports = AuthService; 