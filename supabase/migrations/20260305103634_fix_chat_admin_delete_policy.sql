/*
  # Fix Chat Message Delete Permissions
  
  1. Changes
    - Drop existing update and delete policies that allowed members to modify their own messages
    - Add new policies that only allow admins to delete and update any message
    - This ensures only admins can moderate the chat
  
  2. Security
    - Regular members can only send and read messages
    - Only admins (is_admin = true) can delete or update any message
    - Maintains RLS protection on the chat_messages table
*/

-- Drop old policies
DROP POLICY IF EXISTS "Members can delete own messages" ON chat_messages;
DROP POLICY IF EXISTS "Members can update own messages" ON chat_messages;

-- Create new admin-only policies
CREATE POLICY "Admins can delete any message"
  ON chat_messages
  FOR DELETE
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = (current_setting('app.current_member_id', true))::uuid
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update any message"
  ON chat_messages
  FOR UPDATE
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = (current_setting('app.current_member_id', true))::uuid
      AND members.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = (current_setting('app.current_member_id', true))::uuid
      AND members.is_admin = true
    )
  );
