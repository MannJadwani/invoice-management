-- Add sub_product_id column to invoice_items
ALTER TABLE invoice_items
ADD COLUMN sub_product_id UUID REFERENCES sub_products(id);

-- Create index for sub_product_id
CREATE INDEX IF NOT EXISTS invoice_items_sub_product_id_idx ON invoice_items(sub_product_id);

-- Add constraint to ensure either product_id or sub_product_id is set, but not both
ALTER TABLE invoice_items
ADD CONSTRAINT invoice_items_product_check 
CHECK (
    (product_id IS NOT NULL AND sub_product_id IS NULL) OR 
    (product_id IS NULL AND sub_product_id IS NOT NULL)
);

-- Update RLS policies to include sub_products
CREATE POLICY "Users can view their own sub-products in invoice items"
    ON invoice_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM invoices 
            WHERE invoices.id = invoice_items.invoice_id 
            AND invoices.user_id = auth.uid()
        ) AND (
            (product_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM products 
                WHERE products.id = invoice_items.product_id 
                AND products.user_id = auth.uid()
            )) OR 
            (sub_product_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM sub_products 
                WHERE sub_products.id = invoice_items.sub_product_id 
                AND sub_products.user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Users can create invoice items with their own sub-products"
    ON invoice_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM invoices 
            WHERE invoices.id = invoice_items.invoice_id 
            AND invoices.user_id = auth.uid()
        ) AND (
            (product_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM products 
                WHERE products.id = invoice_items.product_id 
                AND products.user_id = auth.uid()
            )) OR 
            (sub_product_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM sub_products 
                WHERE sub_products.id = invoice_items.sub_product_id 
                AND sub_products.user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Users can update invoice items with their own sub-products"
    ON invoice_items
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM invoices 
            WHERE invoices.id = invoice_items.invoice_id 
            AND invoices.user_id = auth.uid()
        ) AND (
            (product_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM products 
                WHERE products.id = invoice_items.product_id 
                AND products.user_id = auth.uid()
            )) OR 
            (sub_product_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM sub_products 
                WHERE sub_products.id = invoice_items.sub_product_id 
                AND sub_products.user_id = auth.uid()
            ))
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM invoices 
            WHERE invoices.id = invoice_items.invoice_id 
            AND invoices.user_id = auth.uid()
        ) AND (
            (product_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM products 
                WHERE products.id = invoice_items.product_id 
                AND products.user_id = auth.uid()
            )) OR 
            (sub_product_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM sub_products 
                WHERE sub_products.id = invoice_items.sub_product_id 
                AND sub_products.user_id = auth.uid()
            ))
        )
    ); 