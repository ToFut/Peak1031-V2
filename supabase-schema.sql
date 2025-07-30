-- Peak 1031 Exchange Management System - Supabase Database Schema
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'client', 'coordinator', 'third_party', 'agency');
CREATE TYPE exchange_status AS ENUM ('PENDING', '45D', '180D', 'COMPLETED', 'TERMINATED');
CREATE TYPE task_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD');
CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE message_type AS ENUM ('text', 'file', 'system');
CREATE TYPE sync_status AS ENUM ('running', 'success', 'error', 'partial');

-- Users table (extends auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'client',
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  two_fa_enabled BOOLEAN DEFAULT false,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts table (for PracticePartner sync)
CREATE TABLE public.contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pp_contact_id TEXT UNIQUE, -- PracticePartner contact ID
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  address TEXT,
  pp_data JSONB, -- Raw PracticePartner data
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exchanges table
CREATE TABLE public.exchanges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pp_matter_id TEXT UNIQUE, -- PracticePartner matter ID
  name TEXT NOT NULL,
  status exchange_status DEFAULT 'PENDING',
  client_id UUID REFERENCES public.contacts(id),
  coordinator_id UUID REFERENCES public.users(id),
  start_date TIMESTAMPTZ,
  completion_date TIMESTAMPTZ,
  exchange_value DECIMAL(15,2),
  identification_deadline TIMESTAMPTZ,
  completion_deadline TIMESTAMPTZ,
  notes TEXT,
  pp_data JSONB, -- Raw PracticePartner data
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exchange participants (many-to-many relationship)
CREATE TABLE public.exchange_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  exchange_id UUID REFERENCES public.exchanges(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id),
  user_id UUID REFERENCES public.users(id),
  role TEXT NOT NULL, -- 'client', 'intermediary', 'qualified_intermediary', 'coordinator'
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT participant_contact_or_user CHECK (
    (contact_id IS NOT NULL AND user_id IS NULL) OR 
    (contact_id IS NULL AND user_id IS NOT NULL)
  )
);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pp_task_id TEXT UNIQUE, -- PracticePartner task ID
  title TEXT NOT NULL,
  description TEXT,
  status task_status DEFAULT 'PENDING',
  priority task_priority DEFAULT 'MEDIUM',
  exchange_id UUID REFERENCES public.exchanges(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.users(id),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  pp_data JSONB, -- Raw PracticePartner data
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table
CREATE TABLE public.documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  exchange_id UUID REFERENCES public.exchanges(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES public.users(id) NOT NULL,
  category TEXT DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  pin_required BOOLEAN DEFAULT false,
  pin_hash TEXT, -- Hashed PIN for secure documents
  is_template BOOLEAN DEFAULT false,
  template_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  content TEXT NOT NULL,
  exchange_id UUID REFERENCES public.exchanges(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id) NOT NULL,
  attachment_id UUID REFERENCES public.documents(id),
  message_type message_type DEFAULT 'text',
  read_by UUID[] DEFAULT '{}', -- Array of user IDs who have read this message
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  user_id UUID REFERENCES public.users(id),
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync logs table (for PracticePartner integration)
CREATE TABLE public.sync_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sync_type TEXT NOT NULL, -- 'full', 'incremental', 'manual'
  status sync_status NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  records_processed INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  error_message TEXT,
  details JSONB,
  triggered_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'info', 'warning', 'error', 'success'
  read BOOLEAN DEFAULT false,
  related_entity_type TEXT,
  related_entity_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_contacts_pp_contact_id ON public.contacts(pp_contact_id);
CREATE INDEX idx_exchanges_status ON public.exchanges(status);
CREATE INDEX idx_exchanges_client_id ON public.exchanges(client_id);
CREATE INDEX idx_exchanges_coordinator_id ON public.exchanges(coordinator_id);
CREATE INDEX idx_exchanges_pp_matter_id ON public.exchanges(pp_matter_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_exchange_id ON public.tasks(exchange_id);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_documents_exchange_id ON public.documents(exchange_id);
CREATE INDEX idx_messages_exchange_id ON public.messages(exchange_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exchanges_updated_at BEFORE UPDATE ON public.exchanges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Row Level Security Policies

-- Users policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all users" ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Contacts policies
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contacts" ON public.contacts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Coordinators and admins can manage contacts" ON public.contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'coordinator')
    )
  );

-- Exchanges policies
ALTER TABLE public.exchanges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view exchanges they participate in" ON public.exchanges
  FOR SELECT USING (
    coordinator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.exchange_participants ep
      WHERE ep.exchange_id = id AND ep.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Coordinators and admins can manage exchanges" ON public.exchanges
  FOR ALL USING (
    coordinator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'coordinator')
    )
  );

-- Tasks policies
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks assigned to them or in their exchanges" ON public.tasks
  FOR SELECT USING (
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.exchanges e
      WHERE e.id = exchange_id AND (
        e.coordinator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.exchange_participants ep
          WHERE ep.exchange_id = e.id AND ep.user_id = auth.uid()
        )
      )
    ) OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Coordinators and admins can manage tasks" ON public.tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.exchanges e
      WHERE e.id = exchange_id AND e.coordinator_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'coordinator')
    )
  );

-- Documents policies
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents in their exchanges" ON public.documents
  FOR SELECT USING (
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.exchanges e
      WHERE e.id = exchange_id AND (
        e.coordinator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.exchange_participants ep
          WHERE ep.exchange_id = e.id AND ep.user_id = auth.uid()
        )
      )
    ) OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can upload documents to their exchanges" ON public.documents
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid() AND (
      EXISTS (
        SELECT 1 FROM public.exchanges e
        WHERE e.id = exchange_id AND (
          e.coordinator_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.exchange_participants ep
            WHERE ep.exchange_id = e.id AND ep.user_id = auth.uid()
          )
        )
      ) OR
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('admin', 'coordinator')
      )
    )
  );

-- Messages policies
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their exchanges" ON public.messages
  FOR SELECT USING (
    sender_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.exchanges e
      WHERE e.id = exchange_id AND (
        e.coordinator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.exchange_participants ep
          WHERE ep.exchange_id = e.id AND ep.user_id = auth.uid()
        )
      )
    ) OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can send messages to their exchanges" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.exchanges e
      WHERE e.id = exchange_id AND (
        e.coordinator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.exchange_participants ep
          WHERE ep.exchange_id = e.id AND ep.user_id = auth.uid()
        )
      )
    )
  );

-- Notifications policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Audit logs policies (admin only)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Sync logs policies (admin and coordinator only)
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and coordinators can view sync logs" ON public.sync_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'coordinator')
    )
  );

-- Create a function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to create audit log
CREATE OR REPLACE FUNCTION public.create_audit_log(
  action_name TEXT,
  entity_type_name TEXT DEFAULT NULL,
  entity_id_value UUID DEFAULT NULL,
  details_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details)
  VALUES (action_name, entity_type_name, entity_id_value, auth.uid(), details_data)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  user_id_param UUID,
  title_param TEXT,
  message_param TEXT,
  type_param TEXT DEFAULT 'info',
  related_entity_type_param TEXT DEFAULT NULL,
  related_entity_id_param UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, related_entity_type, related_entity_id)
  VALUES (user_id_param, title_param, message_param, type_param, related_entity_type_param, related_entity_id_param)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;