-- Create a secure function to execute custom queries
-- This function can only be called by the backend service

CREATE OR REPLACE FUNCTION execute_custom_query(query_sql TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    query_result RECORD;
    results JSON[] := '{}';
BEGIN
    -- Security: Only allow SELECT statements
    IF NOT (UPPER(TRIM(query_sql)) LIKE 'SELECT%') THEN
        RAISE EXCEPTION 'Only SELECT queries are allowed';
    END IF;
    
    -- Security: Block dangerous keywords
    IF query_sql ~* '\b(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE|SP_|XP_|--|/\*|\*/|;--)\b' THEN
        RAISE EXCEPTION 'Query contains forbidden keywords';
    END IF;
    
    -- Execute the query and collect results
    FOR query_result IN EXECUTE query_sql LOOP
        results := results || row_to_json(query_result);
    END LOOP;
    
    -- Return as JSON array
    SELECT array_to_json(results) INTO result;
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Query execution failed: %', SQLERRM;
END;
$$;