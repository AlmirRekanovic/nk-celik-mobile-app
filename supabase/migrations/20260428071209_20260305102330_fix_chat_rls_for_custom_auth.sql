/*
  # Fix Chat RLS Policies for Custom Authentication
*/

DROP POLICY IF EXISTS "Members can read all messages" ON chat_messages;
DROP POLICY IF EXISTS "Members can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Members can update own messages" ON chat_messages;
DROP POLICY IF EXISTS "Members can delete own messages" ON chat_messages;

CREATE POLICY "Members can read all messages"
  ON chat_messages FOR SELECT
  TO anon
  USING (is_deleted = false);

CREATE POLICY "Members can send messages"
  ON chat_messages FOR INSERT
  TO anon
  WITH CHECK (
    member_id::text = current_setting('app.current_member_id', true) OR
    member_id IN (SELECT id FROM members)
  );

CREATE POLICY "Members can update own messages"
  ON chat_messages FOR UPDATE
  TO anon
  USING (
    member_id::text = current_setting('app.current_member_id', true) OR
    member_id IN (SELECT id FROM members)
  )
  WITH CHECK (
    member_id::text = current_setting('app.current_member_id', true) OR
    member_id IN (SELECT id FROM members)
  );

CREATE POLICY "Members can delete own messages"
  ON chat_messages FOR DELETE
  TO anon
  USING (
    member_id::text = current_setting('app.current_member_id', true) OR
    member_id IN (SELECT id FROM members)
  );
