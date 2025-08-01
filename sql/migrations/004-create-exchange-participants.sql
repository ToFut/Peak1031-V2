-- Create exchange_participants table
CREATE TABLE exchange_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id),
  user_id UUID REFERENCES users(id),
  role VARCHAR(50) NOT NULL,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(exchange_id, contact_id),
  UNIQUE(exchange_id, user_id)
);

-- Create indexes
CREATE INDEX idx_exchange_participants_exchange_id ON exchange_participants(exchange_id);
CREATE INDEX idx_exchange_participants_contact_id ON exchange_participants(contact_id);
CREATE INDEX idx_exchange_participants_user_id ON exchange_participants(user_id);
CREATE INDEX idx_exchange_participants_role ON exchange_participants(role); 