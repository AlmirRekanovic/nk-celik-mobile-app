/*
  # Fix Tickets RLS for Custom Auth
*/

DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow public read access to tickets" ON tickets;
  DROP POLICY IF EXISTS "Allow public read access to check-ins" ON ticket_checkins;
END $$;

CREATE POLICY "Allow public read access to tickets"
  ON tickets FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to check-ins"
  ON ticket_checkins FOR SELECT
  TO public
  USING (true);
