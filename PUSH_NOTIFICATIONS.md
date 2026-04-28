# Push Notifications

Users get push notifications for two events:

- **News** — a new article is published on https://nkcelik.ba
- **Polls** — admin opens a new poll, or activates an existing one

Notifications fan out to every device whose member has the relevant
preference enabled, via Expo's push service.

## Architecture

```
                    ┌──────────────────────┐
WordPress publish ─►│ wordpress-webhook    │──┐
                    │ (Supabase Edge Fn)   │  │
                    └──────────────────────┘  │
                                              ▼
Cron (every 10 min) ┌──────────────────────┐  ┌────────────────────────┐
                  ─►│ news-poller          │─►│ send-push-notification │─► Expo ─► devices
                    │ (Supabase Edge Fn)   │  │ (Supabase Edge Fn)     │
                    └──────────────────────┘  └────────────────────────┘
                                              ▲
DB INSERT/UPDATE  ─► notify_new_poll trigger ─┘
on `polls`
```

The webhook and the poller are **redundant by design** — either one alone is
enough. The dedup table `news_notifications(wp_post_id)` ensures a given
WordPress post never triggers more than one push, no matter which path
delivers it first.

## Database schema

| Table | Purpose |
|---|---|
| `push_tokens` | One row per device. Columns: `member_id`, `token`, `platform`, `enabled` (master switch), `news_enabled`, `polls_enabled` |
| `news_notifications` | Idempotency log. Primary key is `wp_post_id` |

RLS lets each member manage only their own `push_tokens` rows; no client
ever reads/writes `news_notifications`.

## Required deployment steps

After applying the migrations, you also need to do these **once**:

### 1. Deploy edge functions

```bash
npx supabase login
npx supabase link --project-ref qqolxourbfnatlbrrrpr
npx supabase functions deploy send-push-notification
npx supabase functions deploy wordpress-webhook
npx supabase functions deploy news-poller
```

### 2. Set edge function secrets

```bash
# Required for both webhook and poller — generated once, kept in WordPress
npx supabase secrets set WORDPRESS_WEBHOOK_SECRET="$(openssl rand -hex 32)"

# Optional — override the default WordPress URL for the poller
npx supabase secrets set WP_BASE_URL="https://nkcelik.ba/wp-json/wp/v2"
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

### 3. Set the GUCs the polls trigger reads

The `notify_new_poll` trigger calls `send_push_notification` over HTTP and
needs the project URL + service key. These are intentionally NOT in any
migration — set them per-environment via the Supabase SQL editor:

```sql
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://qqolxourbfnatlbrrrpr.supabase.co';
ALTER DATABASE postgres SET app.settings.service_key  = 'YOUR_SERVICE_ROLE_KEY';
```

Reload the connection (or restart the project) for the changes to take
effect.

### 4. Schedule the news poller

In the Supabase dashboard → Database → Cron → New Cron Job:

| Field | Value |
|---|---|
| Name | `news-poller` |
| Schedule | `*/10 * * * *` (every 10 minutes) |
| HTTP Request | `POST https://qqolxourbfnatlbrrrpr.supabase.co/functions/v1/news-poller` |
| Headers | `Authorization: Bearer <service-role-key>` |

This is the **fallback** — if WordPress isn't configured to call the
webhook, the poller still catches new posts.

### 5. (Optional) Wire up the WordPress webhook

For real-time delivery (vs. up to 10-minute lag from the poller), install
[WP Webhooks](https://wp-webhooks.com/) (or any plugin that POSTs on
`save_post`) and configure it to:

- URL: `https://qqolxourbfnatlbrrrpr.supabase.co/functions/v1/wordpress-webhook`
- Method: `POST`
- Header: `X-Webhook-Secret: <same value as WORDPRESS_WEBHOOK_SECRET>`
- Body: full WordPress post JSON (the plugin's default for `post_updated`)

Without the secret header the webhook returns 401, so leaking the URL
alone does not let attackers spam your users.

## Per-category preferences

Each member has three flags on `push_tokens`:

- `enabled` — master switch (off → no notifications at all)
- `news_enabled` — gates news pushes
- `polls_enabled` — gates poll pushes

The `send-push-notification` edge function filters tokens by both the
master switch and the category column for each request.

## Local testing

```bash
# Send a fake news notification to all opted-in devices
curl -X POST \
  https://qqolxourbfnatlbrrrpr.supabase.co/functions/v1/send-push-notification \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "body": "Test body",
    "type": "news",
    "data": {}
  }'

# Trigger the poller manually
curl -X POST \
  https://qqolxourbfnatlbrrrpr.supabase.co/functions/v1/news-poller \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
```

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| No notifications at all | Master switch off, or `push_tokens` row missing — confirm registration in app settings |
| News works but polls don't | `app.settings.supabase_url` / `app.settings.service_key` not set on the database (step 3) |
| Polls work but news doesn't | Cron not scheduled (step 4) and WordPress not configured (step 5) |
| Webhook returns 401 | Plugin isn't sending `X-Webhook-Secret`, or the value doesn't match the Supabase secret |
| Same article notified twice | Check that migration `20260427130100_create_news_notifications_log.sql` has been applied |
| Token errors in edge fn logs | Expected — invalid Expo tokens are auto-deleted from `push_tokens` after the first failed delivery |

## Future enhancements

- Match notifications send a poll-style push when a fixture is announced
- Targeted notifications (admin can send to specific members or groups)
- In-app notification inbox so users can see history
