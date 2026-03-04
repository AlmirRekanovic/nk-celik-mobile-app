/*
  # Fix RLS Policies for Custom Authentication
  
  1. Changes
    - Drop existing RLS policies that use auth.uid()
    - Recreate policies to use current_setting('app.current_member_id')
    - This supports the custom authentication system where member.id is stored in session context
  
  2. Security
    - Maintains same security model but with custom auth context
    - Members can only delete their own tickets
    - Members can only delete check-ins for their own tickets
*/

-- Drop existing policies for tickets
DROP POLICY IF EXISTS "Members can delete own tickets" ON tickets;
DROP POLICY IF EXISTS "Members can view own tickets" ON tickets;

-- Drop existing policies for ticket_checkins  
DROP POLICY IF EXISTS "Members can delete check-ins for own tickets" ON ticket_checkins;
DROP POLICY IF EXISTS "Members can view check-ins for own tickets" ON ticket_checkins;

-- Create new policies for tickets using custom auth context
CREATE POLICY "Members can delete own tickets"
  ON tickets FOR DELETE
  TO authenticated
  USING (
    member_id::text = current_setting('app.current_member_id', true)
  );

CREATE POLICY "Members can view own tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    member_id::text = current_setting('app.current_member_id', true)
  );

-- Create new policies for ticket_checkins using custom auth context
CREATE POLICY "Members can delete check-ins for own tickets"
  ON ticket_checkins FOR DELETE
  TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM tickets 
      WHERE member_id::text = current_setting('app.current_member_id', true)
    )
  );

CREATE POLICY "Members can view check-ins for own tickets"
  ON ticket_checkins FOR SELECT
  TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM tickets 
      WHERE member_id::text = current_setting('app.current_member_id', true)
    )
  );
