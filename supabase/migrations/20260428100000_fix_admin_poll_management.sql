/*
  # Fix Admin Poll Management

  ## Problem
  The previous "fix" (20251215082400_fix_rls_policies_security.sql) replaced
  the admin-aware INSERT/UPDATE/DELETE policies on `polls` with a single
  policy gated on `TO service_role`. Mobile clients use the `anon`
  publishable key, so admins cannot create, edit, or delete polls from the
  app — every write silently fails the RLS check.

  ## Fix
  - Drop the service-role-only catch-all policy.
  - Re-introduce admin-aware INSERT/UPDATE/DELETE policies that check the
    *current* member context (set by `set_member_context()` before each
    privileged write), not the row's `created_by`. This matches the
    pattern used by the chat admin policies.
  - Add an admin SELECT policy so admins can list inactive polls
    (`getAllPolls`) — without it, the admin dashboard only sees rows where
    `is_active = true`.
  - Use `NULLIF(current_setting('app.current_member_id', true), '')::uuid`
    so a missing/empty GUC degrades to NULL and the policy denies access
    cleanly instead of crashing the cast.

  ## Security
  - Anon callers without a member context are denied (cast → NULL → no
    matching member row → policy fails).
  - The service role still has implicit BYPASSRLS on all tables, so the
    edge functions and admin dashboard work unchanged.
*/

DROP POLICY IF EXISTS "System can manage all polls" ON polls;
DROP POLICY IF EXISTS "Admins can read all polls" ON polls;
DROP POLICY IF EXISTS "Admins can create polls" ON polls;
DROP POLICY IF EXISTS "Admins can update polls" ON polls;
DROP POLICY IF EXISTS "Admins can delete polls" ON polls;

CREATE POLICY "Admins can read all polls"
  ON polls FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = NULLIF(current_setting('app.current_member_id', true), '')::uuid
        AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can create polls"
  ON polls FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = NULLIF(current_setting('app.current_member_id', true), '')::uuid
        AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update polls"
  ON polls FOR UPDATE
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

CREATE POLICY "Admins can delete polls"
  ON polls FOR DELETE
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = NULLIF(current_setting('app.current_member_id', true), '')::uuid
        AND members.is_admin = true
    )
  );
