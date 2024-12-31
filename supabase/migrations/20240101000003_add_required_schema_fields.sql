-- Add default required fields to invoice_schemas table
CREATE OR REPLACE FUNCTION add_default_fields() 
RETURNS trigger AS $$
BEGIN
  NEW.schema = jsonb_set(
    COALESCE(NEW.schema, '{}'::jsonb),
    '{required_fields}',
    jsonb_build_array(
      jsonb_build_object(
        'name', 'payment_status',
        'type', 'select',
        'label', 'Payment Status',
        'required', true,
        'options', jsonb_build_array('paid', 'unpaid')
      ),
      jsonb_build_object(
        'name', 'scanned_copy',
        'type', 'file',
        'label', 'Scanned Copy',
        'required', true,
        'accept', '.pdf,.jpg,.jpeg,.png'
      )
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS ensure_required_fields ON invoice_schemas;

-- Create trigger
CREATE TRIGGER ensure_required_fields
  BEFORE INSERT OR UPDATE ON invoice_schemas
  FOR EACH ROW
  EXECUTE FUNCTION add_default_fields();

-- Update existing schemas to include required fields
UPDATE invoice_schemas
SET schema = jsonb_set(
  COALESCE(schema, '{}'::jsonb),
  '{required_fields}',
  jsonb_build_array(
    jsonb_build_object(
      'name', 'payment_status',
      'type', 'select',
      'label', 'Payment Status',
      'required', true,
      'options', jsonb_build_array('paid', 'unpaid')
    ),
    jsonb_build_object(
      'name', 'scanned_copy',
      'type', 'file',
      'label', 'Scanned Copy',
      'required', true,
      'accept', '.pdf,.jpg,.jpeg,.png'
    )
  )
); 