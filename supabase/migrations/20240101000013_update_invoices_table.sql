-- Add team_id column to invoices
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Add product_id column to invoices
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS invoices_team_id_idx ON invoices(team_id);
CREATE INDEX IF NOT EXISTS invoices_product_id_idx ON invoices(product_id);

-- Update RLS policies to include team access
DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;
CREATE POLICY "Users can view their own invoices and team invoices"
  ON invoices
  FOR SELECT
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = invoices.team_id 
      AND team_members.user_id = auth.uid()
    )
  );

-- Create notifications table for due payments
CREATE TABLE IF NOT EXISTS invoice_notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for notifications
CREATE INDEX IF NOT EXISTS invoice_notifications_user_id_idx ON invoice_notifications(user_id);
CREATE INDEX IF NOT EXISTS invoice_notifications_team_id_idx ON invoice_notifications(team_id);
CREATE INDEX IF NOT EXISTS invoice_notifications_invoice_id_idx ON invoice_notifications(invoice_id);

-- Enable RLS for notifications
ALTER TABLE invoice_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON invoice_notifications
  FOR SELECT
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = invoice_notifications.team_id 
      AND team_members.user_id = auth.uid()
    )
  );

-- Create trigger for updating timestamps
CREATE TRIGGER set_timestamp
  BEFORE UPDATE ON invoice_notifications
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

-- Create function to send notifications for due invoices
CREATE OR REPLACE FUNCTION notify_team_for_due_invoice()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.due_date IS NOT NULL AND NEW.team_id IS NOT NULL THEN
    INSERT INTO invoice_notifications (invoice_id, team_id, user_id, message)
    SELECT 
      NEW.id,
      NEW.team_id,
      team_members.user_id,
      'Invoice #' || NEW.invoice_number || ' is due on ' || NEW.due_date
    FROM team_members
    WHERE team_members.team_id = NEW.team_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for due date notifications
CREATE TRIGGER invoice_due_notification
  AFTER INSERT OR UPDATE OF due_date ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION notify_team_for_due_invoice(); 