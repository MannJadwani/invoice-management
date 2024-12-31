-- Add order column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- Update existing products to have sequential order
WITH numbered_products AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) - 1 as new_order
  FROM products
)
UPDATE products
SET "order" = numbered_products.new_order
FROM numbered_products
WHERE products.id = numbered_products.id;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own products" ON products;
DROP POLICY IF EXISTS "Users can create their own products" ON products;
DROP POLICY IF EXISTS "Users can update their own products" ON products;
DROP POLICY IF EXISTS "Users can delete their own products" ON products;

-- Add RLS policies for products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own products"
  ON products
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own products"
  ON products
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products"
  ON products
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products"
  ON products
  FOR DELETE
  USING (auth.uid() = user_id); 