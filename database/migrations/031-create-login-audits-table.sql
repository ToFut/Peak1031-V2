-- Create login_audits table for tracking user login activity and IP addresses
CREATE TABLE IF NOT EXISTS login_audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'login', 'register', 'logout', 'failed_login', 'password_reset'
  ip_address VARCHAR(45) NOT NULL, -- Support for IPv4 and IPv6
  user_agent TEXT,
  device_info JSONB, -- Parsed user agent info (browser, OS, device)
  location_data JSONB, -- GeoIP data if available
  success BOOLEAN DEFAULT true,
  failure_reason TEXT,
  session_id VARCHAR(255),
  previous_ip VARCHAR(45), -- Previous IP for comparison
  ip_changed BOOLEAN DEFAULT false,
  risk_score INTEGER DEFAULT 0, -- 0-100 risk assessment
  risk_factors JSONB, -- Details about detected risks
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_login_audits_user_id (user_id),
  INDEX idx_login_audits_ip_address (ip_address),
  INDEX idx_login_audits_created_at (created_at DESC),
  INDEX idx_login_audits_event_type (event_type),
  INDEX idx_login_audits_risk_score (risk_score)
);

-- Create security_alerts table for admin notifications
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_type VARCHAR(100) NOT NULL, -- 'multiple_ips', 'impossible_travel', 'suspicious_pattern', 'brute_force'
  severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  details JSONB, -- Detailed information about the alert
  ip_addresses TEXT[], -- Array of involved IPs
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_action VARCHAR(100), -- 'password_reset', 'account_deactivated', 'false_positive', 'monitored'
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_security_alerts_user_id (user_id),
  INDEX idx_security_alerts_severity (severity),
  INDEX idx_security_alerts_resolved (resolved),
  INDEX idx_security_alerts_created_at (created_at DESC)
);

-- Create ip_whitelist table for trusted IPs
CREATE TABLE IF NOT EXISTS ip_whitelist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ip_address VARCHAR(45) NOT NULL,
  label VARCHAR(255), -- 'Home', 'Office', 'VPN', etc.
  added_by UUID NOT NULL REFERENCES users(id),
  is_global BOOLEAN DEFAULT false, -- Apply to all users
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, ip_address),
  INDEX idx_ip_whitelist_ip_address (ip_address)
);

-- Create function to analyze login patterns
CREATE OR REPLACE FUNCTION analyze_login_pattern(p_user_id UUID)
RETURNS TABLE (
  unique_ips INTEGER,
  login_count INTEGER,
  failed_attempts INTEGER,
  ip_changes INTEGER,
  risk_level VARCHAR(20),
  last_login TIMESTAMP WITH TIME ZONE,
  most_used_ip VARCHAR(45),
  suspicious_activity BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      COUNT(DISTINCT ip_address) as unique_ips,
      COUNT(*) as login_count,
      COUNT(*) FILTER (WHERE success = false) as failed_attempts,
      COUNT(*) FILTER (WHERE ip_changed = true) as ip_changes,
      MAX(created_at) as last_login,
      MODE() WITHIN GROUP (ORDER BY ip_address) as most_used_ip
    FROM login_audits
    WHERE user_id = p_user_id
      AND created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
  )
  SELECT 
    us.unique_ips,
    us.login_count,
    us.failed_attempts,
    us.ip_changes,
    CASE
      WHEN us.unique_ips > 10 THEN 'high'
      WHEN us.unique_ips > 5 THEN 'medium'
      WHEN us.failed_attempts > 5 THEN 'medium'
      ELSE 'low'
    END as risk_level,
    us.last_login,
    us.most_used_ip,
    (us.unique_ips > 10 OR us.failed_attempts > 5) as suspicious_activity
  FROM user_stats us;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-detect suspicious patterns
CREATE OR REPLACE FUNCTION check_login_anomalies()
RETURNS TRIGGER AS $$
DECLARE
  v_recent_ips TEXT[];
  v_ip_count INTEGER;
  v_last_login RECORD;
  v_time_diff INTERVAL;
BEGIN
  -- Get recent IPs for this user (last 24 hours)
  SELECT array_agg(DISTINCT ip_address) INTO v_recent_ips
  FROM login_audits
  WHERE user_id = NEW.user_id
    AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
    AND id != NEW.id;
  
  v_ip_count := array_length(v_recent_ips, 1);
  
  -- Check for too many different IPs
  IF v_ip_count > 5 THEN
    INSERT INTO security_alerts (
      user_id,
      alert_type,
      severity,
      title,
      description,
      details,
      ip_addresses
    ) VALUES (
      NEW.user_id,
      'multiple_ips',
      'high',
      'Multiple IP addresses detected',
      'User has logged in from ' || v_ip_count || ' different IP addresses in the last 24 hours',
      jsonb_build_object(
        'ip_count', v_ip_count,
        'current_ip', NEW.ip_address,
        'event_type', NEW.event_type
      ),
      v_recent_ips
    );
  END IF;
  
  -- Check for impossible travel (logins from different IPs within short time)
  SELECT * INTO v_last_login
  FROM login_audits
  WHERE user_id = NEW.user_id
    AND id != NEW.id
    AND ip_address != NEW.ip_address
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_last_login.id IS NOT NULL THEN
    v_time_diff := NEW.created_at - v_last_login.created_at;
    
    -- If different IP within 5 minutes, flag as suspicious
    IF v_time_diff < INTERVAL '5 minutes' THEN
      INSERT INTO security_alerts (
        user_id,
        alert_type,
        severity,
        title,
        description,
        details,
        ip_addresses
      ) VALUES (
        NEW.user_id,
        'impossible_travel',
        'critical',
        'Impossible travel detected',
        'User logged in from different locations within ' || v_time_diff::TEXT,
        jsonb_build_object(
          'previous_ip', v_last_login.ip_address,
          'current_ip', NEW.ip_address,
          'time_difference', v_time_diff::TEXT,
          'previous_login', v_last_login.created_at
        ),
        ARRAY[v_last_login.ip_address, NEW.ip_address]
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER login_audit_anomaly_check
AFTER INSERT ON login_audits
FOR EACH ROW
EXECUTE FUNCTION check_login_anomalies();

-- Add columns to users table for security features
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_ip VARCHAR(45);
ALTER TABLE users ADD COLUMN IF NOT EXISTS ip_whitelist_only BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_reset BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS security_locked BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS security_locked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS security_locked_reason TEXT;

-- Create view for admin dashboard
CREATE OR REPLACE VIEW user_security_status AS
SELECT 
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.role,
  u.is_active,
  u.security_locked,
  u.force_password_reset,
  u.last_ip,
  la.unique_ips,
  la.login_count,
  la.failed_attempts,
  la.risk_level,
  la.last_login,
  la.suspicious_activity,
  COUNT(sa.id) FILTER (WHERE sa.resolved = false) as unresolved_alerts,
  MAX(sa.severity) as highest_alert_severity
FROM users u
LEFT JOIN LATERAL (
  SELECT * FROM analyze_login_pattern(u.id)
) la ON true
LEFT JOIN security_alerts sa ON sa.user_id = u.id
GROUP BY 
  u.id, u.email, u.first_name, u.last_name, u.role, u.is_active,
  u.security_locked, u.force_password_reset, u.last_ip,
  la.unique_ips, la.login_count, la.failed_attempts, 
  la.risk_level, la.last_login, la.suspicious_activity;

-- Grant permissions
GRANT ALL ON login_audits TO authenticated;
GRANT ALL ON security_alerts TO authenticated;
GRANT ALL ON ip_whitelist TO authenticated;
GRANT SELECT ON user_security_status TO authenticated;

-- Add RLS policies
ALTER TABLE login_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_whitelist ENABLE ROW LEVEL SECURITY;

-- Admin can see all, users can see their own
CREATE POLICY "Admin full access to login_audits" ON login_audits
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users view own login_audits" ON login_audits
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin full access to security_alerts" ON security_alerts
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin full access to ip_whitelist" ON ip_whitelist
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users view own ip_whitelist" ON ip_whitelist
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_global = true);