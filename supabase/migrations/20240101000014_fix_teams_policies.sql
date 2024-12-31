-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own teams and teams they are members of" ON teams;
DROP POLICY IF EXISTS "Users can create their own teams" ON teams;
DROP POLICY IF EXISTS "Users can update their own teams" ON teams;
DROP POLICY IF EXISTS "Users can delete their own teams" ON teams;

-- Create new policies without recursion
CREATE POLICY "Enable read access for team owners"
  ON teams
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Enable read access for team members"
  ON teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = id 
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Enable insert for authenticated users only"
  ON teams
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for team owners"
  ON teams
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for team owners"
  ON teams
  FOR DELETE
  USING (auth.uid() = user_id); 