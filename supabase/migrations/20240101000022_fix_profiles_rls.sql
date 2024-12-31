-- Add missing INSERT policy for profiles
CREATE POLICY "Enable insert for authenticated users"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Ensure the trigger function has proper permissions
ALTER FUNCTION public.handle_new_user() SECURITY DEFINER;

-- Grant INSERT privileges on profiles table to authenticated users
GRANT INSERT ON profiles TO authenticated; 