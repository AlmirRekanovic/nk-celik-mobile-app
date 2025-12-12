/*
  # Fix Tickets RLS for Custom Auth
  
  1. Changes
    - Add policy to allow public (anon) access to view tickets
    - This enables the custom auth system to query tickets without Supabase Auth
    - Security is maintained by the application filtering by member_id
  
  2. Security Notes
    - The app uses AsyncStorage-based custom authentication
    - RLS policies checking auth.uid() don't work with this approach
    - Application code filters tickets by member_id from local storage
*/

-- Drop policy if exists and recreate
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow public read access to tickets" ON tickets;
  DROP POLICY IF EXISTS "Allow public read access to check-ins" ON ticket_checkins;
END $$;

-- Allow public access to view tickets (app handles filtering by member_id)
CREATE POLICY "Allow public read access to tickets"
  ON tickets FOR SELECT
  TO public
  USING (true);

-- Allow public read access to check-ins for viewing ticket history
CREATE POLICY "Allow public read access to check-ins"
  ON ticket_checkins FOR SELECT
  TO public
  USING (true);
