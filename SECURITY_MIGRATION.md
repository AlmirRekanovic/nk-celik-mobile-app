# Security Migration — Deployment Guide

This release replaces the client-asserted auth model (anon key +
`set_member_context`) with server-issued JWTs and real row-level security.

> ## Status (2026-07-22)
> **Backend is fully deployed and verified on the live project (`nkcelik`).**
> - ✅ Secrets set: `JWT_SECRET`, `WC_WEBHOOK_SECRET`, `WORDPRESS_WEBHOOK_SECRET`
> - ✅ Migrations `20260721160000` + `20260721170000` applied and recorded
> - ✅ All four edge functions deployed (member-login, send-push-notification,
>   woocommerce-webhook, wordpress-webhook)
> - ✅ Verified: valid login works, name-fallback login works, wildcard-injection
>   login rejected, anon cannot read members/tickets, guests can read vote counts
>
> **Because the migration is live, the old app build no longer works for end
> users** — they cannot log in until the new build (see below) is distributed.
> That is the one urgent remaining item.
>
> **Remaining manual steps (need a human):**
> 1. Distribute the new Android build (in progress on EAS) to users.
> 2. WooCommerce → Settings → Advanced → Webhooks: set each webhook's **Secret**
>    to the `WC_WEBHOOK_SECRET` value.
> 3. WordPress webhook sender: add header `X-Webhook-Secret: <WORDPRESS_WEBHOOK_SECRET>`.
> 4. **Revoke** the old WooCommerce REST API consumer key/secret (they were
>    leaked via `eas.json` + old bundles).
>
> The steps below are the original runbook, kept for reference / re-deploys.

## What changed

| Area | Before | After |
|---|---|---|
| Login | Client queried `members` directly; member number acted as password against a publicly readable table | `member-login` edge function verifies credentials server-side and returns a signed JWT (30-day expiry, silently renewed). Accepts email+member# OR, for members with no email on file, first+last name+member# |
| RLS | `USING (true)` for the anon role on members, tickets, check-ins; identity via spoofable `set_member_context()` | Least-privilege policies keyed on `auth.uid()`; `set_member_context` removed |
| Members table | Fully readable/writable with the anon key (names, emails, member numbers, admin flags) | Not accessible to clients; chat names come from the `member_profiles` view (safe columns only) |
| Ticket check-in | Client-side read → insert → update (racy, anon-writable) | Atomic admin-only `check_in_ticket()` RPC |
| Ticket codes | `orderNumber-1` (guessable) | `orderNumber-<random hex>` |
| WooCommerce webhook | Unauthenticated — anyone could mint tickets | HMAC signature verification (`x-wc-webhook-signature`) |
| Push broadcast | Callable with the anon key by anyone | Requires the service role or an admin member JWT |
| Poll votes | All raw votes (member → choice) publicly readable; double-vote race | Members read only their own vote; aggregates via `poll_vote_counts` view; DB unique constraint |
| WC consumer keys | Embedded in the app bundle via `EXPO_PUBLIC_*` | Removed from the app entirely |

## Deployment steps (in order)

### 1. Set edge function secrets

Get the **legacy JWT secret** from Supabase Dashboard → Project Settings →
API → JWT Settings ("JWT Secret"). Then:

```bash
supabase secrets set JWT_SECRET='<legacy JWT secret>'
supabase secrets set WC_WEBHOOK_SECRET='<generate a long random string>'
supabase secrets set WORDPRESS_WEBHOOK_SECRET='<generate another random string>'
```

> Note: this requires the project's legacy JWT secret (HS256) to be active,
> which is the default. If the project is ever migrated to asymmetric JWT
> signing keys, `member-login` must be updated accordingly.

### 2. Apply the database migration

```bash
supabase db push
```

This applies `20260721160000_secure_auth_and_rls_overhaul.sql`. From this
moment, **old app builds can no longer read or write anything** — that is the
point of the migration.

### 3. Deploy the edge functions

```bash
supabase functions deploy member-login --no-verify-jwt
supabase functions deploy send-push-notification
supabase functions deploy woocommerce-webhook --no-verify-jwt
supabase functions deploy wordpress-webhook --no-verify-jwt
```

`--no-verify-jwt` is required where callers can't present a Supabase JWT
(login happens before a token exists; WooCommerce/WordPress send none —
those two are protected by their shared-secret/HMAC checks instead).
`send-push-notification` does its own authorization (service role or admin
member JWT) on top of the gateway check.

### 4. WooCommerce & WordPress configuration

- In WooCommerce → Settings → Advanced → Webhooks, set the webhook **Secret**
  to the same value as `WC_WEBHOOK_SECRET`. Deliveries without a valid
  signature are now rejected.
- Configure the WordPress webhook sender to include header
  `X-Webhook-Secret: <WORDPRESS_WEBHOOK_SECRET>`.
- **Revoke the old WooCommerce REST API consumer key/secret**
  (WooCommerce → Settings → Advanced → REST API). They were embedded in
  previously shipped app bundles **and were hardcoded in `eas.json`** (now
  removed), so they must be treated as leaked. The app no longer uses them
  (the shop is a WebView).

### 5. Ship the app update

Build/publish the app (EAS build or EAS Update). Logged-in members are
migrated automatically: on first launch the app silently exchanges the
stored email + member number for a JWT — nobody has to log in again.

### 6. Cleanup

- Remove `EXPO_PUBLIC_WC_CONSUMER_KEY` / `EXPO_PUBLIC_WC_CONSUMER_SECRET`
  from your local `.env` and from any EAS secrets.

## How auth works now

1. Login screen sends email + member number to `member-login`.
2. The function checks the pair against `members` using the service role,
   updates `last_login_at`, and returns a 30-day HS256 JWT
   (`sub` = member uuid, `role` = authenticated, `email`, `is_admin`) plus
   the member profile. Invalid attempts get a generic 401 and are logged.
3. The app stores token + profile; the Supabase client presents the token on
   every REST/realtime request via the `accessToken` hook, so `auth.uid()`
   and `auth.jwt()` work in RLS. Guests fall back to the anon key and reach
   only data with explicit anon policies (active polls, vote counts).
4. The app silently re-issues the token when less than 7 days of lifetime
   remain, using the stored credentials.

## Known limitations (accepted for this "minimum change" step)

- The member number is still the permanent credential. It is printed on
  membership cards and known to club staff. The recommended next step is an
  activation/claim flow (member number becomes a one-time claim code, then
  email OTP login) — see the review discussion.
- Rate limiting in `member-login` is per-isolate/in-memory (best effort).
  Failed attempts are logged; watch the function logs for abuse.
- The `member_profiles` and `poll_vote_counts` views intentionally use
  definer semantics (they expose only safe, aggregate columns). Supabase's
  linter may flag them — this is by design.
