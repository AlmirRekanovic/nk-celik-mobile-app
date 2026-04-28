/*
  # Fix RLS Policies for Custom Authentication
*/

DROP POLICY IF EXISTS "Members can delete own tickets" ON tickets;
DROP POLICY IF EXISTS "Members can view own tickets" ON tickets;
DROP POLICY IF EXISTS "Members can delete check-ins for own tickets" ON ticket_checkins;
DROP POLICY IF EXISTS "Members can view check-ins for own tickets" ON ticket_checkins;

CREATE POLICY "Members can delete own tickets"
  ON tickets FOR DELETE
  TO authenticated
  USING (member_id::text = current_setting('app.current_member_id', true));

CREATE POLICY "Members can view own tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (member_id::text = current_setting('app.current_member_id', true));

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
