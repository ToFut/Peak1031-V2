-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  attachment_id UUID REFERENCES documents(id),
  message_type VARCHAR(20) DEFAULT 'text',
  read_by JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_messages_exchange_id ON messages(exchange_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_attachment_id ON messages(attachment_id);
CREATE INDEX idx_messages_message_type ON messages(message_type);
CREATE INDEX idx_messages_created_at ON messages(created_at); 