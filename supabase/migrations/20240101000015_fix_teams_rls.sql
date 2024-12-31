-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own teams and teams they are members of" ON teams;
DROP POLICY IF EXISTS "Users can create their own teams" ON teams;
DROP POLICY IF EXISTS "Users can update their own teams" ON teams;
DROP POLICY IF EXISTS "Users can delete their own teams" ON teams;
DROP POLICY IF EXISTS "Users can view team members of their teams" ON team_members;
DROP POLICY IF EXISTS "Team owners can manage team members" ON team_members;

-- Create new policies for teams
CREATE POLICY "Users can view teams"
  ON teams
  FOR SELECT
  USING (
    -- User is either the team owner
    auth.uid() = user_id
    OR 
    -- Or is a member of the team (using a direct join instead of EXISTS)
    id IN (
      SELECT team_id 
      FROM team_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create teams"
  ON teams
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own teams"
  ON teams
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own teams"
  ON teams
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create new policies for team_members
CREATE POLICY "Users can view team members"
  ON team_members
  FOR SELECT
  USING (
    -- User is either a member of the team
    user_id = auth.uid()
    OR
    -- Or is the team owner
    team_id IN (
      SELECT id 
      FROM teams 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners can manage members"
  ON team_members
  FOR ALL
  USING (
    -- User is the team owner
    team_id IN (
      SELECT id 
      FROM teams 
      WHERE user_id = auth.uid()
    )
  ); 