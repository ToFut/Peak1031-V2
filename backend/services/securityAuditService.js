const supabaseService = require('./supabase');
const { v4: uuidv4 } = require('uuid');
const UAParser = require('ua-parser-js');
const geoip = require('geoip-lite');

class SecurityAuditService {
  constructor() {
    this.riskThresholds = {
      multipleIps: 5,        // More than 5 IPs in 24 hours
      impossibleTravel: 5,   // Less than 5 minutes between different IPs
      failedLogins: 5,       // More than 5 failed attempts
      rapidRequests: 10,     // More than 10 requests per minute
      unusualHours: {        // Define unusual hours (e.g., 2 AM - 5 AM)
        start: 2,
        end: 5
      }
    };
  }

  /**
   * Log a login audit event
   */
  async logLoginEvent({
    userId,
    eventType = 'login',
    ipAddress,
    userAgent,
    success = true,
    failureReason = null,
    sessionId = null
  }) {
    try {
      // Parse user agent for device info
      const parser = new UAParser(userAgent);
      const deviceInfo = {
        browser: parser.getBrowser(),
        os: parser.getOS(),
        device: parser.getDevice(),
        cpu: parser.getCPU()
      };

      // Get location data from IP (if available)
      const locationData = await this.getLocationFromIP(ipAddress);

      // Get user's previous login to check for IP change
      const previousLogin = await this.getLastLogin(userId);
      const previousIp = previousLogin?.ip_address;
      const ipChanged = previousIp && previousIp !== ipAddress;

      // Calculate risk score
      const riskScore = await this.calculateRiskScore({
        userId,
        ipAddress,
        eventType,
        ipChanged,
        success
      });

      // Create audit record
      const auditData = {
        id: uuidv4(),
        user_id: userId,
        event_type: eventType,
        ip_address: ipAddress,
        user_agent: userAgent,
        device_info: deviceInfo,
        location_data: locationData,
        success,
        failure_reason: failureReason,
        session_id: sessionId,
        previous_ip: previousIp,
        ip_changed: ipChanged,
        risk_score: riskScore.score,
        risk_factors: riskScore.factors,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabaseService.client
        .from('login_audits')
        .insert(auditData)
        .select()
        .single();

      if (error) throw error;

      // Update user's last IP
      if (success && eventType === 'login') {
        await supabaseService.client
          .from('users')
          .update({ last_ip: ipAddress })
          .eq('id', userId);
      }

      // Check for anomalies and create alerts if needed
      await this.checkForAnomalies({
        userId,
        ipAddress,
        eventType,
        riskScore
      });

      return data;
    } catch (error) {
      console.error('Error logging login event:', error);
      throw error;
    }
  }

  /**
   * Get location data from IP address
   */
  async getLocationFromIP(ipAddress) {
    try {
      // Skip for localhost/private IPs
      if (this.isPrivateIP(ipAddress)) {
        return {
          country: 'Local',
          city: 'Local',
          timezone: 'Local'
        };
      }

      // Use geoip-lite for basic geolocation
      const geo = geoip.lookup(ipAddress);
      if (geo) {
        return {
          country: geo.country,
          region: geo.region,
          city: geo.city,
          timezone: geo.timezone,
          coordinates: geo.ll
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting location from IP:', error);
      return null;
    }
  }

  /**
   * Check if IP is private/local
   */
  isPrivateIP(ip) {
    const privateRanges = [
      /^127\./,          // Loopback
      /^10\./,           // Private network
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // Private network
      /^192\.168\./,     // Private network
      /^::1$/,           // IPv6 loopback
      /^fe80::/,         // IPv6 link-local
      /^localhost$/,     // Localhost
    ];

    return privateRanges.some(range => range.test(ip));
  }

  /**
   * Get user's last login
   */
  async getLastLogin(userId) {
    try {
      const { data, error } = await supabaseService.client
        .from('login_audits')
        .select('*')
        .eq('user_id', userId)
        .eq('success', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return error ? null : data;
    } catch (error) {
      console.error('Error getting last login:', error);
      return null;
    }
  }

  /**
   * Calculate risk score for login attempt
   */
  async calculateRiskScore({ userId, ipAddress, eventType, ipChanged, success }) {
    let score = 0;
    const factors = [];

    try {
      // Get recent login history
      const { data: recentLogins } = await supabaseService.client
        .from('login_audits')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (recentLogins) {
        // Check for multiple IPs
        const uniqueIps = [...new Set(recentLogins.map(l => l.ip_address))];
        if (uniqueIps.length > this.riskThresholds.multipleIps) {
          score += 30;
          factors.push({
            type: 'multiple_ips',
            value: uniqueIps.length,
            threshold: this.riskThresholds.multipleIps
          });
        }

        // Check for failed login attempts
        const failedAttempts = recentLogins.filter(l => !l.success).length;
        if (failedAttempts > this.riskThresholds.failedLogins) {
          score += 25;
          factors.push({
            type: 'failed_attempts',
            value: failedAttempts,
            threshold: this.riskThresholds.failedLogins
          });
        }

        // Check for rapid requests
        const recentCount = recentLogins.filter(l => 
          new Date(l.created_at) > new Date(Date.now() - 60 * 1000)
        ).length;
        if (recentCount > this.riskThresholds.rapidRequests) {
          score += 20;
          factors.push({
            type: 'rapid_requests',
            value: recentCount,
            threshold: this.riskThresholds.rapidRequests
          });
        }
      }

      // IP change adds risk
      if (ipChanged) {
        score += 15;
        factors.push({ type: 'ip_changed' });
      }

      // Failed login adds risk
      if (!success) {
        score += 10;
        factors.push({ type: 'failed_login' });
      }

      // Check if IP is whitelisted (reduces risk)
      const { data: whitelist } = await supabaseService.client
        .from('ip_whitelist')
        .select('*')
        .eq('ip_address', ipAddress)
        .or(`user_id.eq.${userId},is_global.eq.true`)
        .single();

      if (whitelist) {
        score = Math.max(0, score - 50);
        factors.push({ type: 'whitelisted_ip' });
      }

      // Check unusual login time
      const hour = new Date().getHours();
      if (hour >= this.riskThresholds.unusualHours.start && 
          hour <= this.riskThresholds.unusualHours.end) {
        score += 10;
        factors.push({
          type: 'unusual_hour',
          value: hour
        });
      }

      return {
        score: Math.min(100, score),
        factors
      };
    } catch (error) {
      console.error('Error calculating risk score:', error);
      return { score: 0, factors: [] };
    }
  }

  /**
   * Check for anomalies and create alerts
   */
  async checkForAnomalies({ userId, ipAddress, eventType, riskScore }) {
    try {
      // High risk score triggers alert
      if (riskScore.score >= 70) {
        await this.createSecurityAlert({
          userId,
          alertType: 'high_risk_login',
          severity: riskScore.score >= 90 ? 'critical' : 'high',
          title: 'High risk login detected',
          description: `Login attempt with risk score ${riskScore.score} from IP ${ipAddress}`,
          details: {
            ip_address: ipAddress,
            event_type: eventType,
            risk_score: riskScore.score,
            risk_factors: riskScore.factors
          },
          ipAddresses: [ipAddress]
        });
      }

      // Check for impossible travel
      await this.checkImpossibleTravel(userId, ipAddress);

      // Check for brute force attempts
      await this.checkBruteForce(userId, ipAddress);

    } catch (error) {
      console.error('Error checking for anomalies:', error);
    }
  }

  /**
   * Check for impossible travel scenarios
   */
  async checkImpossibleTravel(userId, currentIp) {
    try {
      const { data: lastLogin } = await supabaseService.client
        .from('login_audits')
        .select('*')
        .eq('user_id', userId)
        .eq('success', true)
        .neq('ip_address', currentIp)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!lastLogin) return;

      const timeDiff = Date.now() - new Date(lastLogin.created_at).getTime();
      const minutesDiff = timeDiff / (1000 * 60);

      if (minutesDiff < this.riskThresholds.impossibleTravel) {
        const currentLocation = await this.getLocationFromIP(currentIp);
        const previousLocation = lastLogin.location_data;

        if (currentLocation && previousLocation && 
            currentLocation.country !== previousLocation.country) {
          await this.createSecurityAlert({
            userId,
            alertType: 'impossible_travel',
            severity: 'critical',
            title: 'Impossible travel detected',
            description: `Login from ${currentLocation.country} within ${Math.round(minutesDiff)} minutes of login from ${previousLocation.country}`,
            details: {
              current_ip: currentIp,
              previous_ip: lastLogin.ip_address,
              current_location: currentLocation,
              previous_location: previousLocation,
              time_difference_minutes: minutesDiff
            },
            ipAddresses: [currentIp, lastLogin.ip_address]
          });
        }
      }
    } catch (error) {
      console.error('Error checking impossible travel:', error);
    }
  }

  /**
   * Check for brute force attempts
   */
  async checkBruteForce(userId, ipAddress) {
    try {
      const { data: failedLogins } = await supabaseService.client
        .from('login_audits')
        .select('*')
        .eq('user_id', userId)
        .eq('success', false)
        .eq('ip_address', ipAddress)
        .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString());

      if (failedLogins && failedLogins.length >= 5) {
        await this.createSecurityAlert({
          userId,
          alertType: 'brute_force',
          severity: 'high',
          title: 'Possible brute force attack',
          description: `${failedLogins.length} failed login attempts from IP ${ipAddress} in the last 15 minutes`,
          details: {
            ip_address: ipAddress,
            failed_attempts: failedLogins.length,
            first_attempt: failedLogins[0].created_at,
            last_attempt: failedLogins[failedLogins.length - 1].created_at
          },
          ipAddresses: [ipAddress]
        });

        // Auto-lock account after 10 failed attempts
        if (failedLogins.length >= 10) {
          await this.lockUserAccount(userId, 'Multiple failed login attempts detected');
        }
      }
    } catch (error) {
      console.error('Error checking brute force:', error);
    }
  }

  /**
   * Create security alert
   */
  async createSecurityAlert({
    userId,
    alertType,
    severity,
    title,
    description,
    details,
    ipAddresses
  }) {
    try {
      const { data, error } = await supabaseService.client
        .from('security_alerts')
        .insert({
          id: uuidv4(),
          user_id: userId,
          alert_type: alertType,
          severity,
          title,
          description,
          details,
          ip_addresses: ipAddresses,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Send real-time notification to admins
      await this.notifyAdmins(data);

      return data;
    } catch (error) {
      console.error('Error creating security alert:', error);
      throw error;
    }
  }

  /**
   * Notify admins of security alerts
   */
  async notifyAdmins(alert) {
    try {
      // Get all admin users
      const { data: admins } = await supabaseService.client
        .from('users')
        .select('id, email')
        .eq('role', 'admin');

      if (!admins) return;

      // Create notifications for each admin
      for (const admin of admins) {
        await supabaseService.client
          .from('notifications')
          .insert({
            id: uuidv4(),
            user_id: admin.id,
            title: `Security Alert: ${alert.title}`,
            message: alert.description,
            type: 'security_alert',
            urgency: alert.severity === 'critical' ? 'critical' : 'high',
            read: false,
            metadata: {
              alert_id: alert.id,
              affected_user_id: alert.user_id,
              severity: alert.severity
            },
            created_at: new Date().toISOString()
          });
      }

      // TODO: Send email/SMS alerts for critical severity
      if (alert.severity === 'critical') {
        // Implement email/SMS notification
      }
    } catch (error) {
      console.error('Error notifying admins:', error);
    }
  }

  /**
   * Lock user account for security
   */
  async lockUserAccount(userId, reason) {
    try {
      await supabaseService.client
        .from('users')
        .update({
          security_locked: true,
          security_locked_at: new Date().toISOString(),
          security_locked_reason: reason,
          is_active: false
        })
        .eq('id', userId);

      await this.createSecurityAlert({
        userId,
        alertType: 'account_locked',
        severity: 'critical',
        title: 'Account automatically locked',
        description: `Account locked due to: ${reason}`,
        details: { reason },
        ipAddresses: []
      });
    } catch (error) {
      console.error('Error locking user account:', error);
    }
  }

  /**
   * Admin actions for security management
   */
  async forcePasswordReset(userId, adminId) {
    try {
      await supabaseService.client
        .from('users')
        .update({
          force_password_reset: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      // Log the action
      await this.logAdminAction(adminId, userId, 'force_password_reset');
      
      return { success: true };
    } catch (error) {
      console.error('Error forcing password reset:', error);
      throw error;
    }
  }

  async deactivateUser(userId, adminId, reason) {
    try {
      await supabaseService.client
        .from('users')
        .update({
          is_active: false,
          security_locked: true,
          security_locked_at: new Date().toISOString(),
          security_locked_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      // Log the action
      await this.logAdminAction(adminId, userId, 'deactivate_user', { reason });
      
      return { success: true };
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error;
    }
  }

  async whitelistIP(userId, ipAddress, label, adminId) {
    try {
      const { data, error } = await supabaseService.client
        .from('ip_whitelist')
        .insert({
          id: uuidv4(),
          user_id: userId,
          ip_address: ipAddress,
          label,
          added_by: adminId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await this.logAdminAction(adminId, userId, 'whitelist_ip', { ip_address: ipAddress });
      
      return data;
    } catch (error) {
      console.error('Error whitelisting IP:', error);
      throw error;
    }
  }

  async resolveAlert(alertId, adminId, action, notes) {
    try {
      await supabaseService.client
        .from('security_alerts')
        .update({
          resolved: true,
          resolved_by: adminId,
          resolved_at: new Date().toISOString(),
          resolution_action: action,
          resolution_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', alertId);

      return { success: true };
    } catch (error) {
      console.error('Error resolving alert:', error);
      throw error;
    }
  }

  async logAdminAction(adminId, targetUserId, action, details = {}) {
    try {
      await supabaseService.client
        .from('audit_logs')
        .insert({
          id: uuidv4(),
          user_id: adminId,
          action: `security_${action}`,
          entity_type: 'user',
          entity_id: targetUserId,
          details: {
            ...details,
            timestamp: new Date().toISOString()
          },
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging admin action:', error);
    }
  }

  /**
   * Get login audit history for a user
   */
  async getUserLoginHistory(userId, limit = 50) {
    try {
      const { data, error } = await supabaseService.client
        .from('login_audits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting user login history:', error);
      throw error;
    }
  }

  /**
   * Get security alerts for admin dashboard
   */
  async getSecurityAlerts(filters = {}) {
    try {
      let query = supabaseService.client
        .from('security_alerts')
        .select(`
          *,
          user:user_id(id, email, first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (filters.resolved !== undefined) {
        query = query.eq('resolved', filters.resolved);
      }

      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting security alerts:', error);
      throw error;
    }
  }

  /**
   * Get user security summary
   */
  async getUserSecuritySummary(userId) {
    try {
      const { data, error } = await supabaseService.client
        .from('user_security_status')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting user security summary:', error);
      throw error;
    }
  }
}

module.exports = new SecurityAuditService();