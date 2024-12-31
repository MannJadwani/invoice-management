-- Create a function to insert demo notifications for a user
CREATE OR REPLACE FUNCTION public.insert_demo_notifications()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get the current user's ID
    current_user_id := auth.uid();
    
    -- Check if the user already has notifications
    IF NOT EXISTS (
        SELECT 1 FROM public.notifications 
        WHERE user_id = current_user_id
    ) THEN
        -- Insert demo notifications
        INSERT INTO public.notifications (user_id, title, message, read, created_at)
        SELECT 
            current_user_id,
            CASE row_number() OVER ()
                WHEN 1 THEN 'New Invoice Created'
                WHEN 2 THEN 'Payment Reminder'
                WHEN 3 THEN 'Invoice Overdue'
                WHEN 4 THEN 'Payment Received'
                WHEN 5 THEN 'Invoice Updated'
            END as title,
            CASE row_number() OVER ()
                WHEN 1 THEN 'Invoice #INV-2024-001 has been created for Client A'
                WHEN 2 THEN 'Payment for Invoice #INV-2024-002 is due in 3 days'
                WHEN 3 THEN 'Invoice #INV-2024-003 is overdue by 5 days'
                WHEN 4 THEN 'Payment of $1,500 received for Invoice #INV-2024-004'
                WHEN 5 THEN 'Invoice #INV-2024-005 has been updated with new items'
            END as message,
            CASE row_number() OVER ()
                WHEN 1 THEN false
                WHEN 2 THEN false
                WHEN 3 THEN true
                WHEN 4 THEN true
                WHEN 5 THEN false
            END as read,
            timezone('utc'::text, now()) - (row_number() OVER () || ' days')::interval as created_at
        FROM (SELECT 1 FROM generate_series(1,5)) s;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to run the function when selecting from notifications
CREATE TRIGGER insert_demo_notifications_trigger
    AFTER SELECT ON public.notifications
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.insert_demo_notifications(); 