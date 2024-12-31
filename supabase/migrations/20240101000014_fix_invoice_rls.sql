-- Create function to get authenticated user id
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid;
$$ LANGUAGE sql STABLE;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own invoices and team invoices" ON invoices;
DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can create their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete their own invoices" ON invoices;

-- Create simpler policies using auth.user_id()
CREATE POLICY "Users can view their own invoices"
  ON invoices
  FOR SELECT
  USING (auth.user_id() = user_id);

CREATE POLICY "Users can create their own invoices"
  ON invoices
  FOR INSERT
  WITH CHECK (auth.user_id() = user_id);

CREATE POLICY "Users can update their own invoices"
  ON invoices
  FOR UPDATE
  USING (auth.user_id() = user_id)
  WITH CHECK (auth.user_id() = user_id);

CREATE POLICY "Users can delete their own invoices"
  ON invoices
  FOR DELETE
  USING (auth.user_id() = user_id);

-- Make team_id nullable if it isn't already
ALTER TABLE invoices 
  ALTER COLUMN team_id DROP NOT NULL; 