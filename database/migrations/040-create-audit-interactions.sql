-- Create audit_interactions table for social media features
CREATE TABLE audit_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_log_id UUID REFERENCES audit_logs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50) NOT NULL, -- 'comment', 'like', 'assign', 'escalate', 'tag'
  content TEXT, -- For comments
  assigned_to UUID REFERENCES users(id), -- For assignments
  escalated_to UUID REFERENCES users(id), -- For escalations
  tagged_users JSONB, -- Array of user IDs for tagging
  priority VARCHAR(20) DEFAULT 'normal', -- For escalations: 'low', 'normal', 'high', 'urgent'
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'resolved', 'closed'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create audit_comments table for threaded comments
CREATE TABLE audit_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_log_id UUID REFERENCES audit_logs(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES audit_comments(id) ON DELETE CASCADE, -- For threaded comments
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions JSONB, -- Array of mentioned user IDs
  attachments JSONB, -- Array of file attachments
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create audit_likes table for likes/reactions
CREATE TABLE audit_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_log_id UUID REFERENCES audit_logs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) DEFAULT 'like', -- 'like', 'love', 'wow', 'sad', 'angry'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(audit_log_id, user_id) -- One reaction per user per audit log
);

-- Create audit_assignments table for task assignments
CREATE TABLE audit_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_log_id UUID REFERENCES audit_logs(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id) ON DELETE CASCADE,
  assignment_type VARCHAR(50) DEFAULT 'review', -- 'review', 'investigate', 'resolve', 'follow_up'
  priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  due_date TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'overdue'
  notes TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create audit_escalations table for escalation management
CREATE TABLE audit_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_log_id UUID REFERENCES audit_logs(id) ON DELETE CASCADE,
  escalated_by UUID REFERENCES users(id) ON DELETE CASCADE,
  escalated_to UUID REFERENCES users(id) ON DELETE CASCADE,
  escalation_level INTEGER DEFAULT 1, -- 1, 2, 3, etc.
  reason TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent', 'critical'
  status VARCHAR(20) DEFAULT 'open', -- 'open', 'acknowledged', 'in_progress', 'resolved', 'closed'
  resolution_notes TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_audit_interactions_audit_log_id ON audit_interactions(audit_log_id);
CREATE INDEX idx_audit_interactions_user_id ON audit_interactions(user_id);
CREATE INDEX idx_audit_interactions_type ON audit_interactions(interaction_type);

CREATE INDEX idx_audit_comments_audit_log_id ON audit_comments(audit_log_id);
CREATE INDEX idx_audit_comments_user_id ON audit_comments(user_id);
CREATE INDEX idx_audit_comments_parent_id ON audit_comments(parent_comment_id);

CREATE INDEX idx_audit_likes_audit_log_id ON audit_likes(audit_log_id);
CREATE INDEX idx_audit_likes_user_id ON audit_likes(user_id);

CREATE INDEX idx_audit_assignments_audit_log_id ON audit_assignments(audit_log_id);
CREATE INDEX idx_audit_assignments_assigned_to ON audit_assignments(assigned_to);
CREATE INDEX idx_audit_assignments_status ON audit_assignments(status);

CREATE INDEX idx_audit_escalations_audit_log_id ON audit_escalations(audit_log_id);
CREATE INDEX idx_audit_escalations_escalated_to ON audit_escalations(escalated_to);
CREATE INDEX idx_audit_escalations_status ON audit_escalations(status);

-- Add triggers to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_audit_interactions_updated_at 
    BEFORE UPDATE ON audit_interactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audit_comments_updated_at 
    BEFORE UPDATE ON audit_comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audit_assignments_updated_at 
    BEFORE UPDATE ON audit_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audit_escalations_updated_at 
    BEFORE UPDATE ON audit_escalations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

