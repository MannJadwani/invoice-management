-- Drop notifications table and related objects
DROP TABLE IF EXISTS public.notifications CASCADE;

-- Drop any remaining policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications; 