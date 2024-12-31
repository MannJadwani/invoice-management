-- Create invoice_items table for storing products in invoices
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on invoice_items
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Create policies for invoice_items
CREATE POLICY "Users can view their own invoice items"
    ON invoice_items
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM invoices 
        WHERE invoices.id = invoice_items.invoice_id 
        AND invoices.user_id = auth.uid()
    ));

CREATE POLICY "Users can create their own invoice items"
    ON invoice_items
    FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM invoices 
        WHERE invoices.id = invoice_items.invoice_id 
        AND invoices.user_id = auth.uid()
    ));

CREATE POLICY "Users can update their own invoice items"
    ON invoice_items
    FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM invoices 
        WHERE invoices.id = invoice_items.invoice_id 
        AND invoices.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM invoices 
        WHERE invoices.id = invoice_items.invoice_id 
        AND invoices.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their own invoice items"
    ON invoice_items
    FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM invoices 
        WHERE invoices.id = invoice_items.invoice_id 
        AND invoices.user_id = auth.uid()
    ));

-- Create indexes
CREATE INDEX IF NOT EXISTS invoice_items_invoice_id_idx ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS invoice_items_product_id_idx ON invoice_items(product_id);

-- Create trigger for updating timestamps
CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp(); 