-- ============================================
-- DATABASE FUNCTIONS FOR PEAK 1031 PLATFORM
-- Version: 1.0.0
-- Date: 2025-08-07
-- ============================================

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Function to execute raw SQL (for setup scripts)
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    EXECUTE sql;
    RETURN '{"success": true}'::json;
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Function to generate exchange numbers
CREATE OR REPLACE FUNCTION generate_exchange_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    next_number integer;
    new_number text;
BEGIN
    -- Get the next sequential number
    SELECT COALESCE(MAX(
        CASE 
            WHEN exchange_number ~ '^EX-[0-9]+$' 
            THEN CAST(SUBSTRING(exchange_number FROM 4) AS integer)
            ELSE 0
        END
    ), 0) + 1
    INTO next_number
    FROM exchanges;
    
    -- Format with leading zeros
    new_number := 'EX-' || LPAD(next_number::text, 6, '0');
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM exchanges WHERE exchange_number = new_number) LOOP
        next_number := next_number + 1;
        new_number := 'EX-' || LPAD(next_number::text, 6, '0');
    END LOOP;
    
    RETURN new_number;
END;
$$;

-- Function to calculate exchange deadlines based on start date
CREATE OR REPLACE FUNCTION calculate_exchange_deadlines(start_date date)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    identification_deadline date;
    exchange_deadline date;
BEGIN
    -- 45-day identification deadline
    identification_deadline := start_date + INTERVAL '45 days';
    
    -- 180-day exchange completion deadline
    exchange_deadline := start_date + INTERVAL '180 days';
    
    RETURN json_build_object(
        'identification_deadline', identification_deadline,
        'exchange_deadline', exchange_deadline
    );
END;
$$;

-- ============================================
-- EXCHANGE MANAGEMENT FUNCTIONS
-- ============================================

-- Function to update exchange status based on deadlines and tasks
CREATE OR REPLACE FUNCTION update_exchange_status(exchange_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    exchange_record exchanges%ROWTYPE;
    new_status text;
    new_workflow_stage text;
    tasks_completed integer;
    tasks_total integer;
BEGIN
    -- Get exchange details
    SELECT * INTO exchange_record FROM exchanges WHERE id = exchange_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Exchange not found');
    END IF;
    
    -- Get task completion statistics
    SELECT 
        COUNT(CASE WHEN status = 'completed' THEN 1 END),
        COUNT(*)
    INTO tasks_completed, tasks_total
    FROM tasks 
    WHERE exchange_id = exchange_record.id;
    
    -- Determine new status and workflow stage
    new_status := exchange_record.status;
    new_workflow_stage := exchange_record.workflow_stage;
    
    -- Check if overdue
    IF (exchange_record.identification_deadline IS NOT NULL AND 
        exchange_record.identification_deadline < CURRENT_DATE AND 
        exchange_record.workflow_stage NOT IN ('identification_completed', 'exchange_completed')) THEN
        new_status := 'overdue';
        new_workflow_stage := 'identification_overdue';
    ELSIF (exchange_record.exchange_deadline IS NOT NULL AND 
           exchange_record.exchange_deadline < CURRENT_DATE AND 
           exchange_record.workflow_stage != 'exchange_completed') THEN
        new_status := 'overdue';
        new_workflow_stage := 'exchange_overdue';
    ELSIF tasks_total > 0 AND tasks_completed = tasks_total THEN
        new_status := 'completed';
        new_workflow_stage := 'exchange_completed';
    ELSIF tasks_completed > 0 THEN
        new_status := 'active';
        new_workflow_stage := 'in_progress';
    END IF;
    
    -- Update if changed
    IF new_status != exchange_record.status OR new_workflow_stage != exchange_record.workflow_stage THEN
        UPDATE exchanges 
        SET status = new_status,
            workflow_stage = new_workflow_stage,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = exchange_id;
    END IF;
    
    RETURN json_build_object(
        'exchange_id', exchange_id,
        'old_status', exchange_record.status,
        'new_status', new_status,
        'old_workflow_stage', exchange_record.workflow_stage,
        'new_workflow_stage', new_workflow_stage,
        'tasks_completed', tasks_completed,
        'tasks_total', tasks_total
    );
END;
$$;

-- Function to get exchange dashboard data
CREATE OR REPLACE FUNCTION get_exchange_dashboard(user_id uuid, user_role text)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    result json;
    total_exchanges integer;
    active_exchanges integer;
    overdue_exchanges integer;
    upcoming_deadlines integer;
BEGIN
    -- Different queries based on user role
    IF user_role = 'admin' THEN
        -- Admin sees all exchanges
        SELECT 
            COUNT(*),
            COUNT(CASE WHEN status = 'active' THEN 1 END),
            COUNT(CASE WHEN status = 'overdue' THEN 1 END),
            COUNT(CASE WHEN (identification_deadline <= CURRENT_DATE + INTERVAL '7 days' OR 
                           exchange_deadline <= CURRENT_DATE + INTERVAL '7 days') AND 
                          status IN ('active', 'pending') THEN 1 END)
        INTO total_exchanges, active_exchanges, overdue_exchanges, upcoming_deadlines
        FROM exchanges;
    ELSIF user_role = 'coordinator' THEN
        -- Coordinators see their assigned exchanges
        SELECT 
            COUNT(*),
            COUNT(CASE WHEN status = 'active' THEN 1 END),
            COUNT(CASE WHEN status = 'overdue' THEN 1 END),
            COUNT(CASE WHEN (identification_deadline <= CURRENT_DATE + INTERVAL '7 days' OR 
                           exchange_deadline <= CURRENT_DATE + INTERVAL '7 days') AND 
                          status IN ('active', 'pending') THEN 1 END)
        INTO total_exchanges, active_exchanges, overdue_exchanges, upcoming_deadlines
        FROM exchanges 
        WHERE coordinator_id = user_id;
    ELSE
        -- Clients see their exchanges
        SELECT 
            COUNT(*),
            COUNT(CASE WHEN status = 'active' THEN 1 END),
            COUNT(CASE WHEN status = 'overdue' THEN 1 END),
            COUNT(CASE WHEN (identification_deadline <= CURRENT_DATE + INTERVAL '7 days' OR 
                           exchange_deadline <= CURRENT_DATE + INTERVAL '7 days') AND 
                          status IN ('active', 'pending') THEN 1 END)
        INTO total_exchanges, active_exchanges, overdue_exchanges, upcoming_deadlines
        FROM exchanges e
        JOIN exchange_participants ep ON e.id = ep.exchange_id
        WHERE ep.user_id = user_id;
    END IF;
    
    RETURN json_build_object(
        'total_exchanges', total_exchanges,
        'active_exchanges', active_exchanges,
        'overdue_exchanges', overdue_exchanges,
        'upcoming_deadlines', upcoming_deadlines
    );
END;
$$;

-- ============================================
-- NOTIFICATION FUNCTIONS
-- ============================================

-- Function to create notifications for deadline alerts
CREATE OR REPLACE FUNCTION create_deadline_notifications()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    notification_count integer := 0;
    exchange_rec record;
BEGIN
    -- Create notifications for identification deadlines (7 days warning)
    FOR exchange_rec IN 
        SELECT e.id, e.name, e.identification_deadline, ep.user_id
        FROM exchanges e
        JOIN exchange_participants ep ON e.id = ep.exchange_id
        WHERE e.identification_deadline <= CURRENT_DATE + INTERVAL '7 days'
          AND e.identification_deadline > CURRENT_DATE
          AND e.status IN ('active', 'pending')
          AND NOT EXISTS (
              SELECT 1 FROM notifications n 
              WHERE n.exchange_id = e.id 
                AND n.user_id = ep.user_id 
                AND n.notification_type = 'deadline_warning'
                AND n.created_at >= CURRENT_DATE
          )
    LOOP
        INSERT INTO notifications (
            user_id, exchange_id, notification_type, title, message, is_read
        ) VALUES (
            exchange_rec.user_id,
            exchange_rec.id,
            'deadline_warning',
            'Identification Deadline Approaching',
            'Exchange "' || exchange_rec.name || '" identification deadline is in ' || 
            EXTRACT(DAYS FROM (exchange_rec.identification_deadline - CURRENT_DATE)) || ' days.',
            false
        );
        notification_count := notification_count + 1;
    END LOOP;
    
    -- Create notifications for exchange deadlines (7 days warning)
    FOR exchange_rec IN 
        SELECT e.id, e.name, e.exchange_deadline, ep.user_id
        FROM exchanges e
        JOIN exchange_participants ep ON e.id = ep.exchange_id
        WHERE e.exchange_deadline <= CURRENT_DATE + INTERVAL '7 days'
          AND e.exchange_deadline > CURRENT_DATE
          AND e.status IN ('active', 'pending')
          AND NOT EXISTS (
              SELECT 1 FROM notifications n 
              WHERE n.exchange_id = e.id 
                AND n.user_id = ep.user_id 
                AND n.notification_type = 'deadline_warning'
                AND n.created_at >= CURRENT_DATE
          )
    LOOP
        INSERT INTO notifications (
            user_id, exchange_id, notification_type, title, message, is_read
        ) VALUES (
            exchange_rec.user_id,
            exchange_rec.id,
            'deadline_warning',
            'Exchange Deadline Approaching',
            'Exchange "' || exchange_rec.name || '" completion deadline is in ' || 
            EXTRACT(DAYS FROM (exchange_rec.exchange_deadline - CURRENT_DATE)) || ' days.',
            false
        );
        notification_count := notification_count + 1;
    END LOOP;
    
    RETURN json_build_object('notifications_created', notification_count);
END;
$$;

-- ============================================
-- SEARCH FUNCTIONS
-- ============================================

-- Full-text search function for exchanges
CREATE OR REPLACE FUNCTION search_exchanges(
    search_term text,
    user_id uuid,
    user_role text,
    limit_count integer DEFAULT 50
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    result json;
    search_query text;
BEGIN
    -- Build search query with user access control
    search_query := 'SELECT e.id, e.name, e.exchange_number, e.status, e.exchange_value, 
                            c.first_name || '' '' || c.last_name as client_name
                     FROM exchanges e
                     LEFT JOIN contacts c ON e.client_id = c.id';
    
    -- Add access control based on role
    IF user_role != 'admin' THEN
        IF user_role = 'coordinator' THEN
            search_query := search_query || ' WHERE e.coordinator_id = $2';
        ELSE
            search_query := search_query || ' 
                JOIN exchange_participants ep ON e.id = ep.exchange_id 
                WHERE ep.user_id = $2';
        END IF;
        search_query := search_query || ' AND ';
    ELSE
        search_query := search_query || ' WHERE ';
    END IF;
    
    -- Add full-text search condition
    search_query := search_query || 
        'to_tsvector(''english'', COALESCE(e.name, '''') || '' '' || 
                                  COALESCE(e.description, '''') || '' '' || 
                                  COALESCE(e.notes, '''')) @@ plainto_tsquery(''english'', $1)
         ORDER BY ts_rank(to_tsvector(''english'', COALESCE(e.name, '''') || '' '' || 
                                                   COALESCE(e.description, '''') || '' '' || 
                                                   COALESCE(e.notes, '''')), 
                         plainto_tsquery(''english'', $1)) DESC
         LIMIT $' || CASE WHEN user_role = 'admin' THEN '2' ELSE '3' END;
    
    -- Execute search
    IF user_role = 'admin' THEN
        EXECUTE search_query INTO result USING search_term, limit_count;
    ELSE
        EXECUTE search_query INTO result USING search_term, user_id, limit_count;
    END IF;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- ============================================
-- AUDIT FUNCTIONS
-- ============================================

-- Function to log audit trail
CREATE OR REPLACE FUNCTION log_audit(
    p_user_id uuid,
    p_action text,
    p_entity_type text,
    p_entity_id uuid,
    p_old_values json DEFAULT NULL,
    p_new_values json DEFAULT NULL,
    p_ip_address inet DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    audit_id uuid;
BEGIN
    INSERT INTO audit_logs (
        user_id, action, entity_type, entity_id, 
        old_values, new_values, ip_address
    ) VALUES (
        p_user_id, p_action, p_entity_type, p_entity_id,
        p_old_values, p_new_values, p_ip_address
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$;

-- ============================================
-- CLEANUP FUNCTIONS
-- ============================================

-- Function to cleanup old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_to_keep integer DEFAULT 90)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM audit_logs 
    WHERE created_at < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN json_build_object('deleted_count', deleted_count);
END;
$$;

-- Function to cleanup old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_to_keep integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM notifications 
    WHERE is_read = true 
      AND created_at < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN json_build_object('deleted_count', deleted_count);
END;
$$;

-- ============================================
-- TRIGGERS FOR AUTO-UPDATING FIELDS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Apply updated_at trigger to key tables
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN 
        SELECT unnest(ARRAY['exchanges', 'contacts', 'users', 'messages', 'documents', 'tasks'])
    LOOP
        EXECUTE format('
            CREATE OR REPLACE TRIGGER trigger_update_%I_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        ', table_name, table_name);
    END LOOP;
END;
$$;

-- ============================================
-- PERFORMANCE MONITORING FUNCTIONS
-- ============================================

-- Function to get database statistics
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    result json;
BEGIN
    WITH table_stats AS (
        SELECT 
            schemaname,
            tablename,
            n_tup_ins as inserts,
            n_tup_upd as updates,
            n_tup_del as deletes,
            n_live_tup as live_tuples,
            n_dead_tup as dead_tuples
        FROM pg_stat_user_tables 
        WHERE schemaname = 'public'
    ),
    index_stats AS (
        SELECT 
            schemaname,
            tablename,
            indexrelname,
            idx_scan,
            idx_tup_read,
            idx_tup_fetch
        FROM pg_stat_user_indexes 
        WHERE schemaname = 'public'
    )
    SELECT json_build_object(
        'table_stats', json_agg(row_to_json(table_stats.*)),
        'index_stats', (SELECT json_agg(row_to_json(index_stats.*)) FROM index_stats)
    ) INTO result
    FROM table_stats;
    
    RETURN result;
END;
$$;