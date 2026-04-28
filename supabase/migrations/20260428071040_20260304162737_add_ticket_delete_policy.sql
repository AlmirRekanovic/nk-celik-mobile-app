/*
  # Add Delete Policy for Tickets
*/

CREATE POLICY "Members can delete own tickets"
  ON tickets FOR DELETE
  TO authenticated
  USING (member_id = auth.uid());
