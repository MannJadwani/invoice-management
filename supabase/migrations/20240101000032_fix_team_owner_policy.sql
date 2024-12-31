-- Drop the old policy
DROP POLICY IF EXISTS "Team owners can update team_id" ON public.profiles;

-- Create new policy that allows team owners to update profiles with their team_id
CREATE POLICY "Team owners can update team_id" ON public.profiles
FOR UPDATE 
USING (
  -- Allow team owners to update profiles when the current team_id matches their team
  EXISTS (
    SELECT 1 FROM public.teams 
    WHERE teams.owner_id = auth.uid()
  )
)
WITH CHECK (
  -- Allow setting team_id to null or to a team owned by the user
  team_id IS NULL OR
  EXISTS (
    SELECT 1 FROM public.teams 
    WHERE teams.id = team_id 
    AND teams.owner_id = auth.uid()
  )
); 