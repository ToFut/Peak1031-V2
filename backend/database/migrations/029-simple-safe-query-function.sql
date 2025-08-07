-- Simple version of safe query execution without audit logging
-- Use this if audit_logs table has issues

-- Drop any existing function
DROP FUNCTION IF EXISTS execute_safe_query(text);

-- Create a simple version without audit logging
CREATE OR REPLACE FUNCTION execute_safe_query(query_text text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
    query_upper text;
BEGIN
    -- Convert to uppercase for checking
    query_upper := UPPER(query_text);
    
    -- Security checks: Only allow SELECT queries
    IF NOT (query_upper LIKE 'SELECT%') THEN
        RAISE EXCEPTION 'Only SELECT queries are allowed';
    END IF;
    
    -- Check for dangerous patterns
    IF query_upper ~ '(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE)' THEN
        RAISE EXCEPTION 'Query contains forbidden operations';
    END IF;
    
    -- Check for SQL injection patterns
    IF query_text ~ '(--;|/\*|\*/|xp_|sp_)' THEN
        RAISE EXCEPTION 'Query contains potential SQL injection patterns';
    END IF;
    
    -- Execute the query and return results as JSON
    EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || query_text || ') t' INTO result;
    
    -- Return empty array if no results
    IF result IS NULL THEN
        RETURN '[]'::json;
    END IF;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Just re-raise the error without logging
        RAISE;
END;
$$;

-- Grant execute permission to authenticated users only
GRANT EXECUTE ON FUNCTION execute_safe_query(text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION execute_safe_query(text) IS 'Safely executes SELECT queries (simplified version without audit logging)';