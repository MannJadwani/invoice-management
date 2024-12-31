-- Function to create notifications for due invoices
CREATE OR REPLACE FUNCTION public.create_invoice_notifications()
RETURNS void AS $$
DECLARE
    due_invoice RECORD;
    team_member RECORD;
BEGIN
    -- Find invoices that are due today
    FOR due_invoice IN
        SELECT 
            i.id,
            i.invoice_number,
            i.due_date,
            i.total_amount,
            c.name as company_name,
            t.id as team_id
        FROM invoices i
        LEFT JOIN companies c ON i.company_id = c.id
        LEFT JOIN teams t ON i.team_id = t.id
        WHERE 
            i.status = 'pending' 
            AND i.due_date <= NOW()
            AND i.due_date > NOW() - INTERVAL '24 hours'
    LOOP
        -- For each team member, create a notification
        FOR team_member IN
            SELECT p.user_id
            FROM profiles p
            WHERE p.team_id = due_invoice.team_id
        LOOP
            INSERT INTO notifications (
                user_id,
                title,
                message
            ) VALUES (
                team_member.user_id,
                'Invoice Due',
                format(
                    'Invoice %s for %s is due. Amount: $%s',
                    due_invoice.invoice_number,
                    due_invoice.company_name,
                    due_invoice.total_amount
                )
            );
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a function to check for overdue invoices
CREATE OR REPLACE FUNCTION public.check_overdue_invoices()
RETURNS void AS $$
DECLARE
    overdue_invoice RECORD;
    team_member RECORD;
BEGIN
    -- Find overdue invoices
    FOR overdue_invoice IN
        SELECT 
            i.id,
            i.invoice_number,
            i.due_date,
            i.total_amount,
            c.name as company_name,
            t.id as team_id
        FROM invoices i
        LEFT JOIN companies c ON i.company_id = c.id
        LEFT JOIN teams t ON i.team_id = t.id
        WHERE 
            i.status = 'pending' 
            AND i.due_date < NOW()
    LOOP
        -- For each team member, create a notification
        FOR team_member IN
            SELECT p.user_id
            FROM profiles p
            WHERE p.team_id = overdue_invoice.team_id
        LOOP
            INSERT INTO notifications (
                user_id,
                title,
                message
            ) VALUES (
                team_member.user_id,
                'Invoice Overdue',
                format(
                    'Invoice %s for %s is overdue. Amount: $%s',
                    overdue_invoice.invoice_number,
                    overdue_invoice.company_name,
                    overdue_invoice.total_amount
                )
            );
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql; 