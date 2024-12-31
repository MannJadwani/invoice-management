-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view teams they are members of" ON public.teams;
DROP POLICY IF EXISTS "Users can view teams they belong to" ON public.teams;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Team owners can update team_id" ON public.profiles;

-- Drop the team_members table
DROP TABLE IF EXISTS public.team_members;

-- Add team_id to profiles
ALTER TABLE public.profiles
ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Add RLS policies for team management
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Team owners can update team_id" ON public.profiles
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.teams 
    WHERE teams.id = profiles.team_id 
    AND teams.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can view teams they belong to" ON public.teams
FOR SELECT USING (
  auth.uid() = owner_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.team_id = id 
    AND profiles.id = auth.uid()
  )
); 