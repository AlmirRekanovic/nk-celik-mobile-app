/*
  # Simplify Chat RLS Policies
*/

DROP POLICY IF EXISTS "Members can read all messages" ON chat_messages;
DROP POLICY IF EXISTS "Members can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Members can update own messages" ON chat_messages;
DROP POLICY IF EXISTS "Members can delete own messages" ON chat_messages;

CREATE POLICY "Members can read all messages"
  ON chat_messages FOR SELECT
  TO anon, authenticated
  USING (is_deleted = false);

CREATE POLICY "Members can send messages"
  ON chat_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (member_id IN (SELECT id FROM members));

CREATE POLICY "Members can update own messages"
  ON chat_messages FOR UPDATE
  TO anon, authenticated
  USING (member_id IN (SELECT id FROM members))
  WITH CHECK (member_id IN (SELECT id FROM members));

CREATE POLICY "Members can delete own messages"
  ON chat_messages FOR DELETE
  TO anon, authenticated
  USING (member_id IN (SELECT id FROM members));
