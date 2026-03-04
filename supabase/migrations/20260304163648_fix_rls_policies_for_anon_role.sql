/*
  # Fix RLS Policies for Anonymous Role
  
  1. Changes
    - Drop existing DELETE policies that require authenticated role
    - Recreate policies to work with both authenticated and anon roles
    - Use member context set by set_member_context() function
  
  2. Security
    - Maintains same security model but works with anon key
    - Members can only delete their own tickets when context is set
    - Members can only delete check-ins for their own tickets when context is set
*/

-- Drop existing DELETE policies
DROP POLICY IF EXISTS "Members can delete own tickets" ON tickets;
DROP POLICY IF EXISTS "Members can delete check-ins for own tickets" ON ticket_checkins;

-- Recreate DELETE policies to work with anon role
CREATE POLICY "Members can delete own tickets"
  ON tickets FOR DELETE
  TO public
  USING (
    (member_id)::text = current_setting('app.current_member_id', true)
    AND current_setting('app.current_member_id', true) IS NOT NULL
    AND current_setting('app.current_member_id', true) != ''
  );

CREATE POLICY "Members can delete check-ins for own tickets"
  ON ticket_checkins FOR DELETE
  TO public
  USING (
    current_setting('app.current_member_id', true) IS NOT NULL
    AND current_setting('app.current_member_id', true) != ''
    AND ticket_id IN (
      SELECT id FROM tickets 
      WHERE (member_id)::text = current_setting('app.current_member_id', true)
    )
  );
