/*
  # Add Delete Policy for Ticket Check-ins
*/

CREATE POLICY "Members can delete check-ins for own tickets"
  ON ticket_checkins FOR DELETE
  TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM tickets WHERE member_id = auth.uid()
    )
  );
