/*
  # Fix RLS Security Policies
*/

DROP POLICY IF EXISTS "Members can read all members" ON members;
DROP POLICY IF EXISTS "Admins can insert members" ON members;
DROP POLICY IF EXISTS "Admins can update members" ON members;

CREATE POLICY "Anyone can read members for login"
  ON members FOR SELECT
  TO public
  USING (true);

CREATE POLICY "System can insert members"
  ON members FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "System can update members"
  ON members FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Everyone can read active polls" ON polls;
DROP POLICY IF EXISTS "Admins can read all polls" ON polls;
DROP POLICY IF EXISTS "Admins can create polls" ON polls;
DROP POLICY IF EXISTS "Admins can update polls" ON polls;
DROP POLICY IF EXISTS "Admins can delete polls" ON polls;

CREATE POLICY "Anyone can read active polls"
  ON polls FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "System can manage all polls"
  ON polls FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Members can read all votes" ON poll_votes;
DROP POLICY IF EXISTS "Members can create their own votes" ON poll_votes;
DROP POLICY IF EXISTS "Members cannot update votes" ON poll_votes;
DROP POLICY IF EXISTS "Members cannot delete votes" ON poll_votes;

CREATE POLICY "Anyone can read votes"
  ON poll_votes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create votes"
  ON poll_votes FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "No one can update votes"
  ON poll_votes FOR UPDATE
  TO public
  USING (false);

CREATE POLICY "No one can delete votes"
  ON poll_votes FOR DELETE
  TO public
  USING (false);
