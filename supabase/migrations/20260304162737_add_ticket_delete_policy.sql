/*
  # Add Delete Policy for Tickets

  1. Changes
    - Add RLS policy to allow members to delete their own tickets
    - Members can only delete tickets where member_id matches their auth.uid()
  
  2. Security
    - Members can only delete their own tickets
    - Check-ins should be deleted first (handled in app code)
*/

CREATE POLICY "Members can delete own tickets"
  ON tickets
  FOR DELETE
  TO authenticated
  USING (member_id = auth.uid());
