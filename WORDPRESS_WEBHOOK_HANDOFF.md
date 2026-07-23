# WordPress (News) → NK Čelik App Webhook (Developer Handoff)

Hand this to your **WordPress** developer/admin. It sends a **push notification**
to the NK Čelik mobile app whenever a **new article is published** on nkcelik.ba.

> This is the **news** webhook. It is **separate** from the tickets webhook —
> tickets use **WooCommerce → Webhooks** (see `WOOCOMMERCE_WEBHOOK_HANDOFF.md`).
> News uses a **WordPress post-published trigger**. You cannot reuse one webhook
> for both; they are different events (an order vs. a blog post) going to
> different URLs. Set up **both**, separately.

---

## 1. What it does
When a post is **published**, WordPress POSTs it to our Supabase function, which
sends a **"Nove vijesti!"** push notification (with the post title) to every app
member who has news notifications enabled.

- **Direction:** WordPress → Supabase (HTTPS POST, one-way)
- **Trigger:** Post published (`post` type only)
- **Auth:** a shared secret sent as an HTTP header `X-Webhook-Secret` (REQUIRED)

## 2. Endpoint
```
POST https://qqolxourbfnatlbrrrpr.supabase.co/functions/v1/wordpress-webhook
```

## 3. Setup — using the "WP Webhooks" plugin (already installed)
The site already has **WP Webhooks 3.4.3**. Configure a **Send Data** trigger:

1. WP Admin → **WP Webhooks → Send Data** (or "Triggers").
2. Add/enable the trigger **"Post created / published"** (fires when a post is published).
3. Set the **Webhook URL** — **EASIEST: put the secret in the URL** (no custom header needed):
   ```
   https://qqolxourbfnatlbrrrpr.supabase.co/functions/v1/wordpress-webhook?secret=⟨WORDPRESS_WEBHOOK_SECRET⟩
   ```
   That single change is all the auth required.
4. Leave the body as the default post payload (see §4 — both formats are accepted).
5. Save. If **more than one** trigger/webhook points at this URL, put the
   `?secret=` on **all** of them (or delete the duplicates).

> **Alternative to the query param:** use the plain URL
> (`…/wordpress-webhook`) plus a request header `X-Webhook-Secret: <value>`.
> Either works — the query param just avoids the plugin's custom-header quirks.
>
> If auth fails you get **HTTP 401** with a `diagnostic` object in the response
> body (shown in your delivery log) that says exactly what's missing.

## 4. Payload (either format works)
Our function accepts **both** the WordPress REST shape and the WP Webhooks shape:
```jsonc
// WP REST style
{ "id": 123, "status": "publish", "type": "post",
  "title": { "rendered": "Naslov" }, "excerpt": { "rendered": "..." } }

// WP Webhooks plugin style
{ "post_id": 123, "post": { "ID": 123, "post_status": "publish",
  "post_type": "post", "post_title": "Naslov", "post_excerpt": "..." } }
```
We only notify for `status = publish` and `type = post`. Pages/drafts/other types
are acknowledged with 200 and ignored.

## 5. Responses
- `200 { "success": true }` — notification sent.
- `200 { "message": "Post not published" }` — draft/other status/type; ignored.
- `401 { "error": "Unauthorized" }` — the `X-Webhook-Secret` header is missing/wrong. **Fix the header.**

## 6. How to verify
1. In WP Webhooks, use the trigger's **"Send demo"** / test, or publish a real test post.
2. The plugin's delivery log (and our side) should show **HTTP 200** (not 401).
3. App members with news notifications on should receive a **"Nove vijesti!"** push within a few seconds.

---

**Endpoint (copy-paste):**
```
https://qqolxourbfnatlbrrrpr.supabase.co/functions/v1/wordpress-webhook
```
