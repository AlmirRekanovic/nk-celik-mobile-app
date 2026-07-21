/*
  # Fix push_tokens RLS for anon role

  ## Problem
  The RLS policies added in 20260205094022_fix_push_tokens_schema.sql are
  gated on `TO authenticated`. Our mobile app authenticates against
  Supabase using the anon publishable key, so its Postgres role is `anon`,
  not `authenticated`. Every attempt from the app to INSERT a push token
  was silently blocked by RLS. Result: `push_tokens` table stays empty,
  no user ever receives a notification, no matter how many times they tap
  "Allow".

  ## Fix
  Same pattern used for chat and polls admin fixes:
  - Drop the authenticated-only policies.
  - Add anon/authenticated INSERT/UPDATE/DELETE/SELECT policies that
    compare `member_id` against the member context GUC using the safe
    `NULLIF(current_setting('app.current_member_id', true), '')::uuid`
    cast so an unset/empty GUC degrades to NULL and denies access
    cleanly.

  ## Security
  - Anon callers without a member context (empty GUC) can't touch any
    rows — cast → NULL → no row matches.
  - Callers can still only affect their own token rows (member_id must
    equal the current member context).
  - Service role keeps implicit BYPASSRLS for edge functions.
*/

DROP POLICY IF EXISTS "Members can view own tokens" ON push_tokens;
DROP POLICY IF EXISTS "Members can insert own tokens" ON push_tokens;
DROP POLICY IF EXISTS "Members can update own tokens" ON push_tokens;
DROP POLICY IF EXISTS "Members can delete own tokens" ON push_tokens;

CREATE POLICY "Members can view own tokens"
  ON push_tokens FOR SELECT
  TO anon, authenticated
  USING (
    member_id = NULLIF(current_setting('app.current_member_id', true), '')::uuid
  );

CREATE POLICY "Members can insert own tokens"
  ON push_tokens FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    member_id = NULLIF(current_setting('app.current_member_id', true), '')::uuid
  );

CREATE POLICY "Members can update own tokens"
  ON push_tokens FOR UPDATE
  TO anon, authenticated
  USING (
    member_id = NULLIF(current_setting('app.current_member_id', true), '')::uuid
  )
  WITH CHECK (
    member_id = NULLIF(current_setting('app.current_member_id', true), '')::uuid
  );

CREATE POLICY "Members can delete own tokens"
  ON push_tokens FOR DELETE
  TO anon, authenticated
  USING (
    member_id = NULLIF(current_setting('app.current_member_id', true), '')::uuid
  );
