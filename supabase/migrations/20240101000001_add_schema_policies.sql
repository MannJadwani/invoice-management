-- Enable RLS
ALTER TABLE invoice_schemas ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own schemas"
  ON invoice_schemas
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own schemas"
  ON invoice_schemas
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own schemas"
  ON invoice_schemas
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own schemas"
  ON invoice_schemas
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add user_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'invoice_schemas' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE invoice_schemas
    ADD COLUMN user_id UUID REFERENCES auth.users(id) NOT NULL;
  END IF;
END $$; 