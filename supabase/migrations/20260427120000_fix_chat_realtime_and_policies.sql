/*
  # Fix Chat Realtime Publication and Admin Policies

  1. Realtime
    - Add `chat_messages` and `members` tables to the `supabase_realtime`
      publication so INSERT/UPDATE/DELETE events are streamed to subscribed
      clients. Without this, the in-app chat subscription never fires.

  2. Admin policies
    - The previous admin DELETE/UPDATE policies cast
      `current_setting('app.current_member_id', true)` directly to `uuid`.
      When the GUC has not been set for the current session it returns an
      empty string, which crashes the cast and surfaces to clients as a
      generic 500. Wrap the lookup in
      `NULLIF(current_setting('app.current_member_id', true), '')::uuid` so
      an unset/empty GUC degrades to NULL and the policy simply denies
      access instead of erroring.

  3. Security
    - Behaviour is unchanged for legitimate admins (the member context is
      always set before performing privileged updates/deletes).
    - Anonymous/unauthenticated callers, and any session where the GUC is
      missing, are denied.
*/

-- 1. Realtime publication
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'chat_messages'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'members'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.members';
    END IF;
  END IF;
END
$$;

-- 2. Replace admin DELETE/UPDATE policies with NULLIF-safe casts
DROP POLICY IF EXISTS "Admins can delete any message" ON chat_messages;
DROP POLICY IF EXISTS "Admins can update any message" ON chat_messages;

CREATE POLICY "Admins can delete any message"
  ON chat_messages
  FOR DELETE
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = NULLIF(current_setting('app.current_member_id', true), '')::uuid
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
