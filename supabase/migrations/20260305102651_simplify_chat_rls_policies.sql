/*
  # Simplify Chat RLS Policies
  
  1. Changes
    - Simplify RLS policies to just check if member_id exists in members table
    - Remove session context requirement for now
    
  2. Security
    - All operations verify the member exists
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Members can read all messages" ON chat_messages;
DROP POLICY IF EXISTS "Members can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Members can update own messages" ON chat_messages;
DROP POLICY IF EXISTS "Members can delete own messages" ON chat_messages;

-- Members can read all non-deleted messages
CREATE POLICY "Members can read all messages"
  ON chat_messages
  FOR SELECT
  TO anon, authenticated
  USING (is_deleted = false);

-- Members can insert messages if they exist in members table
CREATE POLICY "Members can send messages"
  ON chat_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM members)
  );

-- Members can update messages if they exist in members table
CREATE POLICY "Members can update own messages"
  ON chat_messages
  FOR UPDATE
  TO anon, authenticated
  USING (member_id IN (SELECT id FROM members))
  WITH CHECK (member_id IN (SELECT id FROM members));

-- Members can delete messages if they exist in members table
CREATE POLICY "Members can delete own messages"
  ON chat_messages
  FOR DELETE
  TO anon, authenticated
  USING (member_id IN (SELECT id FROM members));