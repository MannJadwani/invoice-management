-- Drop any team-related triggers
DO $$ 
DECLARE 
    trigger_rec RECORD;
BEGIN
    FOR trigger_rec IN (
        SELECT tgname 
        FROM pg_trigger 
        WHERE tgrelid = 'invoices'::regclass 
        AND tgname LIKE '%team%'
    ) LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_rec.tgname || ' ON invoices';
    END LOOP;
END $$;

-- Drop any team-related functions
DO $$ 
DECLARE 
    func_rec RECORD;
BEGIN
    FOR func_rec IN (
        SELECT proname 
        FROM pg_proc 
        WHERE proname LIKE '%team%'
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_rec.proname || ' CASCADE';
    END LOOP;
END $$; 