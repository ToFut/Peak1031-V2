require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createTables() {
  try {
    console.log('🔄 Creating audit social tables...');
    
    // First, let's check if tables already exist
    const { data: existingTables, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['audit_interactions', 'audit_comments', 'audit_likes', 'audit_assignments']);
    
    if (checkError) {
      console.error('Error checking existing tables:', checkError);
    } else {
      console.log('Existing audit tables:', existingTables.map(t => t.table_name));
    }
    
    // Create audit_comments table
    console.log('Creating audit_comments table...');
    const createCommentsSQL = `
      CREATE TABLE IF NOT EXISTS audit_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        audit_log_id UUID REFERENCES audit_logs(id) ON DELETE CASCADE,
        parent_comment_id UUID REFERENCES audit_comments(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        mentions JSONB,
        attachments JSONB,
        is_edited BOOLEAN DEFAULT false,
        edited_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`;
    
    const { error: commentsError } = await supabase.rpc('exec_sql', { 
      sql: createCommentsSQL 
    });
    
    if (commentsError && !commentsError.message?.includes('already exists')) {
      console.error('Error creating audit_comments:', commentsError);
    } else {
      console.log('✅ audit_comments table ready');
    }
    
    // Create audit_likes table
    console.log('Creating audit_likes table...');
    const createLikesSQL = `
      CREATE TABLE IF NOT EXISTS audit_likes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        audit_log_id UUID REFERENCES audit_logs(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        reaction_type VARCHAR(20) DEFAULT 'like',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(audit_log_id, user_id)
      )`;
    
    const { error: likesError } = await supabase.rpc('exec_sql', { 
      sql: createLikesSQL 
    });
    
    if (likesError && !likesError.message?.includes('already exists')) {
      console.error('Error creating audit_likes:', likesError);
    } else {
      console.log('✅ audit_likes table ready');
    }
    
    // Create some indexes
    console.log('Creating indexes...');
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_audit_comments_audit_log_id ON audit_comments(audit_log_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_comments_user_id ON audit_comments(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_likes_audit_log_id ON audit_likes(audit_log_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_likes_user_id ON audit_likes(user_id)'
    ];
    
    for (const indexSQL of createIndexes) {
      const { error } = await supabase.rpc('exec_sql', { sql: indexSQL });
      if (error && !error.message?.includes('already exists')) {
        console.error('Error creating index:', error);
      }
    }
    
    console.log('✅ All tables and indexes created successfully!');
    
    // Test tables
    const { data: finalTables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', 'audit_%');
    
    console.log('Final audit tables:', finalTables?.map(t => t.table_name) || []);
    
  } catch (error) {
    console.error('❌ Failed to create tables:', error);
  }
}

createTables();