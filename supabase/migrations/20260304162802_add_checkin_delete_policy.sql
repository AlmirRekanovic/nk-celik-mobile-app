/*
  # Add Delete Policy for Ticket Check-ins

  1. Changes
    - Add RLS policy to allow members to delete check-ins for their own tickets
    - Members can only delete check-ins where the ticket belongs to them
  
  2. Security
    - Members can only delete check-ins for tickets they own
    - Check is done via JOIN to tickets table
*/

CREATE POLICY "Members can delete check-ins for own tickets"
  ON ticket_checkins
  FOR DELETE
  TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM tickets WHERE member_id = auth.uid()
    )
  );
