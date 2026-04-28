/*
  # Fix Chat Realtime Publication and Admin Policies
*/

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'members'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.members';
    END IF;
  END IF;
END $$;

DROP POLICY IF EXISTS "Admins can delete any message" ON chat_messages;
DROP POLICY IF EXISTS "Admins can update any message" ON chat_messages;

CREATE POLICY "Admins can delete any message"
  ON chat_messages FOR DELETE
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = NULLIF(current_setting('app.current_member_id', true), '')::uuid
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update any message"
  ON chat_messages FOR UPDATE
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = NULLIF(current_setting('app.current_member_id', true), '')::uuid
      AND members.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = NULLIF(current_setting('app.current_member_id', true), '')::uuid
      AND members.is_admin = true
    )
  );
