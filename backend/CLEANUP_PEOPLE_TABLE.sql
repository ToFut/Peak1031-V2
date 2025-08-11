-- Final cleanup: Remove the people table
-- Run this ONLY after verifying all functionality works correctly

-- First, let's check what depends on the people table
SELECT 
    tc.table_name, 
    kcu.column_name, 
    tc.constraint_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'people';

-- If the above query returns no results, it's safe to drop the table
-- Uncomment the line below to drop the people table:

-- DROP TABLE people CASCADE;

-- After dropping, verify all tables still work:
/*
SELECT COUNT(*) as documents_count FROM documents;
SELECT COUNT(*) as templates_count FROM document_templates;
SELECT COUNT(*) as tasks_count FROM tasks;
SELECT COUNT(*) as users_count FROM users;
*/