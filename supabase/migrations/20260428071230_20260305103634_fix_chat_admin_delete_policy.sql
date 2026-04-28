/*
  # Fix Chat Message Delete Permissions
*/

DROP POLICY IF EXISTS "Members can delete own messages" ON chat_messages;
DROP POLICY IF EXISTS "Members can update own messages" ON chat_messages;

CREATE POLICY "Admins can delete any message"
  ON chat_messages FOR DELETE
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = (current_setting('app.current_member_id', true))::uuid
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update any message"
  ON chat_messages FOR UPDATE
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
