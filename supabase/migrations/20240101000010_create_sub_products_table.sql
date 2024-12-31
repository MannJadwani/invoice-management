-- Create sub_products table
CREATE TABLE IF NOT EXISTS sub_products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0.00,
  parent_product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS sub_products_user_id_idx ON sub_products(user_id);
CREATE INDEX IF NOT EXISTS sub_products_parent_product_id_idx ON sub_products(parent_product_id);

-- Enable RLS
ALTER TABLE sub_products ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own sub-products"
  ON sub_products
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sub-products"
  ON sub_products
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sub-products"
  ON sub_products
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sub-products"
  ON sub_products
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updating timestamps
CREATE TRIGGER set_timestamp
  BEFORE UPDATE ON sub_products
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp(); 