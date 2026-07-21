/*
  # Secure auth and RLS overhaul

  ## What changes
  The app moves from client-asserted identity (set_member_context GUC, callable
  by anyone with the anon key) to server-issued JWTs: the `member-login` edge
  function verifies email + member number against the members table using the
  service role, then signs a short-lived HS256 JWT with the project JWT secret.
  The token carries `sub` = member uuid, `role` = 'authenticated' and an
  `email` claim, so from Postgres' point of view the caller is a normal
  authenticated user and `auth.uid()` / `auth.jwt()` work as designed.

  This migration:
  - Drops EVERY existing policy on the app tables (they were all effectively
    `USING (true)` for the anon role, or gated on the spoofable GUC).
  - Recreates least-privilege policies keyed on auth.uid().
  - Removes set_member_context() — identity is no longer client-asserted.
  - Adds atomic, SECURITY DEFINER RPCs for the operations that must not be
    done row-by-row from the client: ticket check-in (race-free), push token
    registration (upsert across owners), ticket deletion.
  - Adds a unique constraint so double-voting is impossible regardless of
    client behaviour.
  - Adds two views: `member_profiles` (safe member columns for chat display —
    the members table itself is no longer readable) and `poll_vote_counts`
    (aggregate results, so raw per-member votes never leave the database).

  ## Breaking change
  Old app builds using the anon key + set_member_context lose all access.
  That is intentional — ship the matching app update (EAS Update) together
  with this migration.
*/

-- ============================================================
-- 1. Drop all existing policies on app tables
-- ============================================================
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'members', 'polls', 'poll_votes', 'chat_messages',
        'tickets', 'ticket_checkins', 'push_tokens'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

ALTER TABLE members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls           ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens     ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Remove the spoofable identity mechanism
-- ============================================================
DROP FUNCTION IF EXISTS public.set_member_context(text);

-- ============================================================
-- 3. Helpers
-- ============================================================
-- SECURITY DEFINER so policies on other tables can consult members
-- without recursing into members' own RLS.
CREATE OR REPLACE FUNCTION public.is_current_member_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM members
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

-- Email claim from the member JWT ('' when absent).
CREATE OR REPLACE FUNCTION public.current_jwt_email()
RETURNS text
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

-- ============================================================
-- 4. members — own row only (member number doubles as the
--    login credential, so the table must never be listable)
-- ============================================================
CREATE POLICY "members_select_self"
  ON members FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_current_member_admin());
-- No INSERT/UPDATE/DELETE policies: member management happens via the
-- service role (imports, dashboard, edge functions).

-- Safe subset for chat display; definer-style view deliberately bypasses
-- members RLS but exposes only non-sensitive columns.
DROP VIEW IF EXISTS public.member_profiles;
CREATE VIEW public.member_profiles AS
  SELECT id, first_name, last_name, chat_nickname
  FROM members;

REVOKE ALL ON public.member_profiles FROM anon, public;
GRANT SELECT ON public.member_profiles TO authenticated, service_role;

-- ============================================================
-- 5. polls
-- ============================================================
CREATE POLICY "polls_select_active_or_admin"
  ON polls FOR SELECT
  TO anon, authenticated
  USING (is_active = true OR public.is_current_member_admin());

CREATE POLICY "polls_admin_insert"
  ON polls FOR INSERT
  TO authenticated
  WITH CHECK (public.is_current_member_admin());

CREATE POLICY "polls_admin_update"
  ON polls FOR UPDATE
  TO authenticated
  USING (public.is_current_member_admin())
  WITH CHECK (public.is_current_member_admin());

CREATE POLICY "polls_admin_delete"
  ON polls FOR DELETE
  TO authenticated
  USING (public.is_current_member_admin());

-- ============================================================
-- 6. poll_votes — members see only their own vote; everyone
--    (guests included) reads aggregate counts via the view
-- ============================================================
-- Deduplicate before adding the uniqueness guarantee.
DELETE FROM poll_votes a
USING poll_votes b
WHERE a.poll_id = b.poll_id
  AND a.member_id = b.member_id
  AND a.ctid > b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS uq_poll_votes_poll_member
  ON poll_votes (poll_id, member_id);

CREATE POLICY "poll_votes_select_own_or_admin"
  ON poll_votes FOR SELECT
  TO authenticated
  USING (member_id = auth.uid() OR public.is_current_member_admin());

CREATE POLICY "poll_votes_insert_own"
  ON poll_votes FOR INSERT
  TO authenticated
  WITH CHECK (member_id = auth.uid());
-- No UPDATE/DELETE: votes are immutable.

DROP VIEW IF EXISTS public.poll_vote_counts;
CREATE VIEW public.poll_vote_counts AS
  SELECT poll_id, option_value, count(*)::int AS vote_count
  FROM poll_votes
  GROUP BY poll_id, option_value;

GRANT SELECT ON public.poll_vote_counts TO anon, authenticated, service_role;

-- ============================================================
-- 7. chat_messages — members only
-- ============================================================
-- SELECT stays visible for soft-deleted rows so realtime UPDATE events
-- still reach clients (that's how live deletion works); the app filters
-- is_deleted on display.
CREATE POLICY "chat_select_members"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "chat_insert_own"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (member_id = auth.uid());

CREATE POLICY "chat_update_own_or_admin"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (member_id = auth.uid() OR public.is_current_member_admin())
  WITH CHECK (member_id = auth.uid() OR public.is_current_member_admin());
-- No hard DELETE from clients; deletion is the soft-delete UPDATE above.

-- ============================================================
-- 8. tickets & check-ins
-- ============================================================
CREATE POLICY "tickets_select_own_or_admin"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    member_id = auth.uid()
    OR (customer_email <> '' AND lower(customer_email) = public.current_jwt_email())
    OR public.is_current_member_admin()
  );
-- No client INSERT/UPDATE/DELETE: tickets are created by the WooCommerce
-- webhook (service role), checked in via check_in_ticket(), deleted via
-- the delete_* RPCs below.

CREATE POLICY "checkins_select_own_or_admin"
  ON ticket_checkins FOR SELECT
  TO authenticated
  USING (
    public.is_current_member_admin()
    OR EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_checkins.ticket_id AND t.member_id = auth.uid()
    )
  );

-- Atomic, admin-only check-in. The UPDATE ... WHERE status='active' takes a
-- row lock, so two gate scanners hitting the same code can never both succeed.
CREATE OR REPLACE FUNCTION public.check_in_ticket(
  p_ticket_code text,
  p_location text DEFAULT '',
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket tickets;
  v_last timestamptz;
BEGIN
  IF NOT public.is_current_member_admin() THEN
    RETURN jsonb_build_object('success', false, 'code', 'forbidden');
  END IF;

  UPDATE tickets
  SET status = 'used', updated_at = now()
  WHERE ticket_code = p_ticket_code AND status = 'active'
  RETURNING * INTO v_ticket;

  IF FOUND THEN
    INSERT INTO ticket_checkins (ticket_id, checked_in_by, location, notes)
    VALUES (v_ticket.id, auth.uid(), coalesce(p_location, ''), coalesce(p_notes, ''));
    RETURN jsonb_build_object('success', true, 'code', 'ok', 'ticket', to_jsonb(v_ticket));
  END IF;

  SELECT * INTO v_ticket FROM tickets WHERE ticket_code = p_ticket_code;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'not_found');
  END IF;

  IF v_ticket.status = 'used' THEN
    SELECT max(checked_in_at) INTO v_last
    FROM ticket_checkins WHERE ticket_id = v_ticket.id;
    RETURN jsonb_build_object(
      'success', false, 'code', 'already_used',
      'checked_in_at', v_last, 'ticket', to_jsonb(v_ticket)
    );
  END IF;

  RETURN jsonb_build_object('success', false, 'code', 'cancelled', 'ticket', to_jsonb(v_ticket));
END;
$$;

-- Replace the old delete RPCs that trusted a client-supplied member id.
DROP FUNCTION IF EXISTS public.delete_member_ticket(uuid, uuid);
DROP FUNCTION IF EXISTS public.delete_used_member_tickets(uuid);

CREATE OR REPLACE FUNCTION public.delete_member_ticket(p_ticket_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'not authenticated');
  END IF;

  DELETE FROM ticket_checkins tc
  USING tickets t
  WHERE tc.ticket_id = t.id
    AND t.id = p_ticket_id
    AND (t.member_id = auth.uid()
         OR (t.customer_email <> '' AND lower(t.customer_email) = public.current_jwt_email()));

  DELETE FROM tickets t
  WHERE t.id = p_ticket_id
    AND (t.member_id = auth.uid()
         OR (t.customer_email <> '' AND lower(t.customer_email) = public.current_jwt_email()));
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'ticket not found or not yours');
  END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_used_member_tickets()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'not authenticated');
  END IF;

  DELETE FROM ticket_checkins tc
  USING tickets t
  WHERE tc.ticket_id = t.id
    AND t.status = 'used'
    AND (t.member_id = auth.uid()
         OR (t.customer_email <> '' AND lower(t.customer_email) = public.current_jwt_email()));

  DELETE FROM tickets t
  WHERE t.status = 'used'
    AND (t.member_id = auth.uid()
         OR (t.customer_email <> '' AND lower(t.customer_email) = public.current_jwt_email()));
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'count', v_count);
END;
$$;

-- ============================================================
-- 9. push_tokens
-- ============================================================
CREATE POLICY "push_tokens_select_own"
  ON push_tokens FOR SELECT
  TO authenticated
  USING (member_id = auth.uid());

CREATE POLICY "push_tokens_update_own"
  ON push_tokens FOR UPDATE
  TO authenticated
  USING (member_id = auth.uid())
  WITH CHECK (member_id = auth.uid());
-- INSERT/DELETE go through the RPCs so a device token can move between
-- accounts (log out / log in as someone else) without RLS dead-ends.

CREATE OR REPLACE FUNCTION public.register_push_token(p_token text, p_platform text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_platform NOT IN ('ios', 'android', 'web') THEN
    RAISE EXCEPTION 'invalid platform';
  END IF;

  INSERT INTO push_tokens (member_id, token, platform, enabled, news_enabled, polls_enabled)
  VALUES (auth.uid(), p_token, p_platform, true, true, true)
  ON CONFLICT (token) DO UPDATE
    SET member_id = EXCLUDED.member_id,
        platform = EXCLUDED.platform,
        updated_at = now();
END;
$$;

-- Deleting by token (not by member) is deliberate: the token identifies the
-- physical device making the call, whoever it last belonged to.
CREATE OR REPLACE FUNCTION public.unregister_push_token(p_token text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  DELETE FROM push_tokens WHERE token = p_token;
END;
$$;
