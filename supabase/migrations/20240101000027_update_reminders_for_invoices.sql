-- Add notification_sent field to reminders
ALTER TABLE public.reminders
ADD COLUMN notification_sent BOOLEAN DEFAULT FALSE;

-- Create function to automatically create reminders for overdue invoices
CREATE OR REPLACE FUNCTION public.handle_invoice_reminder()
RETURNS TRIGGER AS $$
BEGIN
    -- Create a reminder when an invoice is created or updated
    INSERT INTO public.reminders (
        user_id,
        invoice_id,
        title,
        description,
        due_date,
        priority,
        team_id,
        notification_sent
    )
    VALUES (
        NEW.user_id,
        NEW.id,
        'Invoice ' || NEW.invoice_number || ' Due',
        CASE 
            WHEN NEW.due_date < CURRENT_DATE THEN 'Invoice is overdue'
            ELSE 'Invoice due soon'
        END,
        NEW.due_date,
        CASE 
            WHEN NEW.due_date < CURRENT_DATE THEN 'high'
            WHEN NEW.due_date = CURRENT_DATE THEN 'high'
            WHEN NEW.due_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'medium'
            ELSE 'low'
        END,
        NEW.team_id,
        FALSE
    )
    ON CONFLICT (invoice_id) DO UPDATE
    SET 
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        due_date = EXCLUDED.due_date,
        priority = EXCLUDED.priority,
        team_id = EXCLUDED.team_id,
        notification_sent = FALSE
    WHERE reminders.notification_sent = FALSE;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for invoice reminders
DROP TRIGGER IF EXISTS create_invoice_reminder ON public.invoices;
CREATE TRIGGER create_invoice_reminder
    AFTER INSERT OR UPDATE OF due_date, status ON public.invoices
    FOR EACH ROW
    WHEN (NEW.status != 'paid' AND NEW.due_date IS NOT NULL)
    EXECUTE FUNCTION public.handle_invoice_reminder();

-- Create function to check for overdue invoices and send notifications
CREATE OR REPLACE FUNCTION public.check_overdue_invoices()
RETURNS void AS $$
DECLARE
    overdue_reminder RECORD;
    team_members RECORD;
BEGIN
    -- Get all overdue invoice reminders that haven't sent notifications
    FOR overdue_reminder IN 
        SELECT r.*, i.invoice_number, i.total_amount
        FROM public.reminders r
        JOIN public.invoices i ON i.id = r.invoice_id
        WHERE r.due_date <= CURRENT_DATE 
        AND r.notification_sent = FALSE
        AND i.status != 'paid'
    LOOP
        -- Get team members for notification
        FOR team_members IN 
            SELECT p.id, p.email
            FROM public.profiles p
            WHERE p.team_id = overdue_reminder.team_id
        LOOP
            -- Insert into notifications table (you'll need to create this)
            INSERT INTO public.notifications (
                user_id,
                title,
                message,
                type,
                read,
                reminder_id
            )
            VALUES (
                team_members.id,
                'Invoice ' || overdue_reminder.invoice_number || ' Overdue',
                'Invoice ' || overdue_reminder.invoice_number || ' for $' || overdue_reminder.total_amount || ' is overdue',
                'invoice_overdue',
                FALSE,
                overdue_reminder.id
            );
        END LOOP;

        -- Mark reminder as notified
        UPDATE public.reminders
        SET notification_sent = TRUE
        WHERE id = overdue_reminder.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    reminder_id UUID REFERENCES public.reminders(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Add unique constraint to prevent duplicate reminders for the same invoice
ALTER TABLE public.reminders
ADD CONSTRAINT unique_invoice_reminder UNIQUE (invoice_id); 