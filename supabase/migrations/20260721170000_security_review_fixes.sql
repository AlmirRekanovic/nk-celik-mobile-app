/*
  # Security review fixes (follow-up to 20260721160000)

  A review of the applied overhaul found issues the first migration did not
  fully close. This migration fixes them.

  ## C1 (critical) — remove the legacy client-trusting ticket-delete RPCs
  The prior migration tried to drop `delete_member_ticket(uuid, uuid)` and
  `delete_used_member_tickets(uuid)`, but the functions that actually exist in
  production take a TEXT member id: `delete_member_ticket(uuid, text)` and
  `delete_used_member_tickets(text)`. `DROP IF EXISTS` on the wrong signature
  is a silent no-op, so the originals survived — SECURITY DEFINER, granted to
  anon, and trusting a client-supplied member id. Anyone with the public anon
  key could therefore delete any member's tickets. Drop the real signatures.

  ## M4 — unregister_push_token now only removes the caller's own tokens.
  ## L1 — all SECURITY DEFINER functions recreated with a locked-down
  search_path and fully schema-qualified references so a session-local
  temp table can't shadow `members`/`tickets` and escalate.
*/

-- ============================================================
-- C1: drop the legacy anon-callable delete functions (real signatures)
-- ============================================================
DROP FUNCTION IF EXISTS public.delete_member_ticket(uuid, text);
DROP FUNCTION IF EXISTS public.delete_used_member_tickets(text);

-- ============================================================
-- L1: recreate SECURITY DEFINER functions, hardened.
--   - search_path = pg_catalog so built-ins resolve but public/pg_temp do not
--   - every public relation/function reference fully qualified, so a
--     pg_temp.members shadow can never be resolved
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_current_member_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

CREATE OR REPLACE FUNCTION public.current_jwt_email()
RETURNS text
LANGUAGE sql STABLE
SET search_path = pg_catalog
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

CREATE OR REPLACE FUNCTION public.check_in_ticket(
  p_ticket_code text,
  p_location text DEFAULT '',
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_ticket public.tickets;
  v_last timestamptz;
BEGIN
  IF NOT public.is_current_member_admin() THEN
    RETURN jsonb_build_object('success', false, 'code', 'forbidden');
  END IF;

  UPDATE public.tickets
  SET status = 'used', updated_at = now()
  WHERE ticket_code = p_ticket_code AND status = 'active'
  RETURNING * INTO v_ticket;

  IF FOUND THEN
    INSERT INTO public.ticket_checkins (ticket_id, checked_in_by, location, notes)
    VALUES (v_ticket.id, auth.uid(), coalesce(p_location, ''), coalesce(p_notes, ''));
    RETURN jsonb_build_object('success', true, 'code', 'ok', 'ticket', to_jsonb(v_ticket));
  END IF;

  SELECT * INTO v_ticket FROM public.tickets WHERE ticket_code = p_ticket_code;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'not_found');
  END IF;

  IF v_ticket.status = 'used' THEN
    SELECT max(checked_in_at) INTO v_last
    FROM public.ticket_checkins WHERE ticket_id = v_ticket.id;
    RETURN jsonb_build_object(
      'success', false, 'code', 'already_used',
      'checked_in_at', v_last, 'ticket', to_jsonb(v_ticket)
    );
  END IF;

  RETURN jsonb_build_object('success', false, 'code', 'cancelled', 'ticket', to_jsonb(v_ticket));
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_member_ticket(p_ticket_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE v_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'not authenticated');
  END IF;

  DELETE FROM public.ticket_checkins tc
  USING public.tickets t
  WHERE tc.ticket_id = t.id
    AND t.id = p_ticket_id
    AND (t.member_id = auth.uid()
         OR (t.customer_email <> '' AND lower(t.customer_email) = public.current_jwt_email()));

  DELETE FROM public.tickets t
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
SET search_path = pg_catalog
AS $$
DECLARE v_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'not authenticated');
  END IF;

  DELETE FROM public.ticket_checkins tc
  USING public.tickets t
  WHERE tc.ticket_id = t.id
    AND t.status = 'used'
    AND (t.member_id = auth.uid()
         OR (t.customer_email <> '' AND lower(t.customer_email) = public.current_jwt_email()));

  DELETE FROM public.tickets t
  WHERE t.status = 'used'
    AND (t.member_id = auth.uid()
         OR (t.customer_email <> '' AND lower(t.customer_email) = public.current_jwt_email()));
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'count', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.register_push_token(p_token text, p_platform text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_platform NOT IN ('ios', 'android', 'web') THEN
    RAISE EXCEPTION 'invalid platform';
  END IF;

  INSERT INTO public.push_tokens (member_id, token, platform, enabled, news_enabled, polls_enabled)
  VALUES (auth.uid(), p_token, p_platform, true, true, true)
  ON CONFLICT (token) DO UPDATE
    SET member_id = EXCLUDED.member_id,
        platform = EXCLUDED.platform,
        updated_at = now();
END;
$$;

-- M4: only the owner may remove a token now.
CREATE OR REPLACE FUNCTION public.unregister_push_token(p_token text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  DELETE FROM public.push_tokens WHERE token = p_token AND member_id = auth.uid();
END;
$$;
