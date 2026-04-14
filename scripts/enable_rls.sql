-- Enable RLS for all existing tables in the public schema
-- This prevents direct access via Supabase SDK/API (PostgREST)
-- but allows direct PostgreSQL connections (e.g., from the Node.js backend)

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE ' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
    END LOOP;
END $$;

-- Verify RLS Status 
SELECT 
    relname AS table_name, 
    relrowsecurity AS rls_enabled 
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
AND c.relkind = 'r' 
ORDER BY relname;
