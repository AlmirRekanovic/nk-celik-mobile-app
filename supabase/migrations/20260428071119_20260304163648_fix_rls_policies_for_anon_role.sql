/*
  # Fix RLS Policies for Anonymous Role
*/

DROP POLICY IF EXISTS "Members can delete own tickets" ON tickets;
DROP POLICY IF EXISTS "Members can delete check-ins for own tickets" ON ticket_checkins;

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
