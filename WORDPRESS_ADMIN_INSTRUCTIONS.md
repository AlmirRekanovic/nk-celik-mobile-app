# NK Čelik App — WordPress / WooCommerce Integration Guide

This is the single hand-off doc for the WordPress / WooCommerce developer. It covers all three integrations between **nkcelik.ba** and the NK Čelik mobile app:

1. **Push notifications** — send a push to app users when a new news post is published on WordPress.
2. **Tickets** — automatically create a ticket in the app when someone buys a ticket product in WooCommerce.
3. **Season tickets** — same as (2) but the ticket appears in the app's separate "Sezonske" tab.

All three send data to Supabase Edge Functions on the same project. Nothing needs to change on the app / backend side — everything below can be done from the WordPress admin.

> **Supabase project ref:** `qqolxourbfnatlbrrrpr` — appears in every endpoint URL below.

---

# Part 1 — Push Notifications for New Posts

Fires a push notification to every opted-in app user whenever a new post is published on WordPress.

## Endpoint

```
POST https://qqolxourbfnatlbrrrpr.supabase.co/functions/v1/wordpress-webhook
Content-Type: application/json
```

No auth header required by default. If we later enable `WORDPRESS_WEBHOOK_SECRET` on the function, we'll share the value and you'll need to send it as the `X-Webhook-Secret` header — we'll flag you if/when that happens.

## Setup (choose ONE of the two options)

### Option A — WP Webhooks plugin (5 minutes, no code)

1. WP Admin → **Plugins → Add New** → search **"WP Webhooks"** by Ironikus → **Install & Activate**
2. WP Admin → **Settings → WP Webhooks** → **Send Data** tab → **Add Webhook URL**
3. Configure:
   - **Trigger:** `Post published`
   - **Webhook URL:** `https://qqolxourbfnatlbrrrpr.supabase.co/functions/v1/wordpress-webhook`
   - **Name:** `NK Čelik App – Push Notifications on New Post`
   - **Status:** ON
4. Save.

### Option B — theme snippet (no plugin)

Paste into your theme's `functions.php` (or a code-snippets plugin). Guards against firing twice for the same post via post meta:

```php
add_action('publish_post', function ($post_id, $post) {
    if ($post->post_status !== 'publish' || $post->post_type !== 'post') {
        return;
    }
    if (get_post_meta($post_id, '_nkcelik_notification_sent', true)) {
        return;
    }

    $webhook_url = 'https://qqolxourbfnatlbrrrpr.supabase.co/functions/v1/wordpress-webhook';

    $payload = [
        'id'      => $post->ID,
        'title'   => ['rendered' => $post->post_title],
        'excerpt' => ['rendered' => get_the_excerpt($post->ID)],
        'status'  => $post->post_status,
        'type'    => $post->post_type,
    ];

    $response = wp_remote_post($webhook_url, [
        'headers' => ['Content-Type' => 'application/json'],
        'body'    => wp_json_encode($payload),
        'timeout' => 15,
    ]);

    if (!is_wp_error($response)) {
        update_post_meta($post_id, '_nkcelik_notification_sent', true);
    }
}, 10, 2);
```

## What we read from the payload

- `id` — used for deduplication (we won't fire twice for the same post ID)
- `title.rendered` — becomes the notification body
- `excerpt.rendered` — used if you extend the payload to include a body preview
- `status` — must be `publish`
- `type` — must be `post`

## Verify

1. Publish a test post in WordPress.
2. Check WP Webhooks → **Logs** (Option A) or your PHP error log (Option B). You should see **HTTP 200**.
3. On any device with the app installed + notifications enabled, a push arrives within a few seconds.

---

# Part 2 — WooCommerce Ticket Webhook

Fires when a customer buys a ticket product on nkcelik.ba. The webhook creates one ticket per line-item quantity, generates a QR code, and links the ticket to the app member whose profile email matches the billing email.

- **Trigger:** Order status change (we filter server-side to `completed` and `processing`)
- **Direction:** WooCommerce → Supabase, HTTPS POST
- **Auth:** None required (endpoint is public, JWT verification is disabled on this function)
- **Body:** Standard WooCommerce `Order` JSON — no custom transformations needed

## Endpoint

```
POST https://qqolxourbfnatlbrrrpr.supabase.co/functions/v1/woocommerce-webhook
Content-Type: application/json
```

Responses:
- Success: HTTP `200` with `{ "success": true, "message": "N ticket(s) created" }`
- Ignored (non-completed) order: HTTP `200` with `{ "message": "Order not completed yet" }`
- Errors: HTTP `500` with `{ "error": "...", "message": "..." }`

## Setup in WooCommerce (5 minutes)

1. WP Admin → **WooCommerce → Settings → Advanced → Webhooks** → **Add webhook**.
2. Fill in:

| Field | Value |
|---|---|
| Name | `NK Čelik App – Tickets` |
| Status | **Active** |
| Topic | **Order updated** |
| Delivery URL | `https://qqolxourbfnatlbrrrpr.supabase.co/functions/v1/woocommerce-webhook` |
| Secret | *(leave empty)* |
| API Version | `WP REST API Integration v3` |

3. **Save**. Open the webhook again → **Deliver** to send a test payload → log should show `HTTP 200`.

> If an old webhook pointing to the same URL exists but is inactive or failing, delete it and create a fresh one — WooCommerce sometimes caches a bad state on toggle.

## Payload we require

We read the following fields from WooCommerce's standard order JSON:

```jsonc
{
  "id": 12345,                    // required — used as order_id
  "number": "12345",              // required — used as QR code prefix
  "status": "completed",          // required — must be "completed" or "processing"
  "billing": {
    "first_name": "Marko",        // required
    "last_name": "Marković",      // required
    "email": "marko@example.com"  // required — used to match app member
  },
  "line_items": [
    {
      "id": 1,
      "name": "VIP Karta – NK Čelik vs Sarajevo",  // used as ticket_type + fallback event name
      "product_id": 123,          // required
      "quantity": 2,              // required — one ticket created per unit
      "sku": "TICKET-VIP-001",
      "price": 50.00,
      "total": "100.00",
      "meta_data": [              // OPTIONAL — see below
        { "key": "event_name", "value": "NK Čelik vs Sarajevo" },
        { "key": "event_date", "value": "2026-08-15T18:00:00" }
      ]
    }
  ]
}
```

All other WooCommerce fields are ignored but harmless.

## Event name & date (optional but recommended)

If a line-item includes these `meta_data` keys, we use them; otherwise we fall back to the product name and leave the date blank.

- `event_name` or `_event_name` → shown as event title on the ticket
- `event_date` or `_event_date` → ISO-8601 datetime string; shown on the ticket

Set these via a WooCommerce product custom field, an ACF field mapped to line-item meta, or your existing tickets plugin (FooEvents, Tickera, etc.). Either the `event_name` or `_event_name` form works.

## QR code / ticket_code

We generate the QR value as `{order.number}-{sequence}`, e.g. an order `#4821` with quantity 2 produces `4821-1` and `4821-2`. You don't need to send this — we create it. It must be unique per ticket; if orders on your side can share `order.number` (they normally don't), let us know.

## Member matching (how tickets show in the app)

- We lowercase and trim `billing.email`, then look up `members.email` in Supabase.
- **Match found** → ticket is linked to that member and appears in their "Moje Karte".
- **No match** → ticket is still saved, but only becomes visible when a member with that email logs in.

The only thing the customer must do is buy on nkcelik.ba using the **same email** they have in their app profile.

## Verification checklist

1. In **WooCommerce → Webhooks → [your webhook] → Logs**, the most recent delivery shows **HTTP 200**.
2. Place a test order for a ticket product, mark it **Processing** or **Completed**. Within a few seconds a new row should appear in the Supabase `tickets` table with `order_id = <that order id>` and `status = 'active'`.
3. The QR code (`ticket_code`) is `{order_number}-1`.
4. If billing email matches a member, `member_id` is populated; otherwise it's `null` and `customer_email` is filled.

---

# Part 3 — Season Tickets ("Sezonske karte")

The app has a **separate "Sezonske" tab** that only shows season tickets. For a ticket to land there instead of the regular "Karte" tab, WooCommerce needs to signal that the product is a season ticket. **This is an extension of Part 2** — same webhook, same endpoint, just extra data on the payload.

Pick **ONE** of the three options below.

## Option A (recommended) — dedicated product category

1. WP Admin → **Products → Categories** → create a category named e.g. `Sezonske karte` with slug `sezonske-karte`.
2. Assign all season-ticket products to that category.
3. Add this snippet to `functions.php` (or a code-snippets plugin). It appends each line item's product categories into the webhook payload so we can detect the season category server-side:

   ```php
   add_filter('woocommerce_webhook_payload', function ($payload, $resource, $resource_id, $webhook_id) {
       if ($resource !== 'order' || empty($payload['line_items'])) {
           return $payload;
       }
       foreach ($payload['line_items'] as &$item) {
           if (empty($item['product_id'])) {
               continue;
           }
           $terms = wp_get_post_terms($item['product_id'], 'product_cat', ['fields' => 'slugs']);
           if (is_wp_error($terms) || empty($terms)) {
               continue;
           }
           if (!isset($item['meta_data']) || !is_array($item['meta_data'])) {
               $item['meta_data'] = [];
           }
           $item['meta_data'][] = [
               'key'   => '_product_categories',
               'value' => implode(',', $terms),
           ];
       }
       return $payload;
   }, 10, 4);
   ```

   Our webhook detects any category slug containing `sezonsk` or `season` and marks the ticket as a season ticket.

## Option B — per-product meta flag

1. On each season-ticket product, add a custom field `_is_season_ticket = yes` (via Product data → Custom fields, or an ACF field with that meta key).
2. Add this snippet to `functions.php`:

   ```php
   add_filter('woocommerce_webhook_payload', function ($payload, $resource, $resource_id, $webhook_id) {
       if ($resource !== 'order' || empty($payload['line_items'])) {
           return $payload;
       }
       foreach ($payload['line_items'] as &$item) {
           if (empty($item['product_id'])) {
               continue;
           }
           $is_season = get_post_meta($item['product_id'], '_is_season_ticket', true);
           if ($is_season) {
               if (!isset($item['meta_data']) || !is_array($item['meta_data'])) {
                   $item['meta_data'] = [];
               }
               $item['meta_data'][] = [
                   'key'   => '_is_season_ticket',
                   'value' => $is_season,
               ];
           }
       }
       return $payload;
   }, 10, 4);
   ```

   Any truthy value (`yes`, `true`, `1`, `on`) marks the ticket as a season ticket.

## Option C — zero-config fallback

If you don't add either snippet, we fall back to matching the **product name** against `sezonsk|season` (case-insensitive). This works if all season-ticket products literally contain "Sezonska" / "Season" in their name, but is fragile — Option A or B is safer.

## Verify

Buy (or test-order) a season-ticket product → check the Supabase `tickets` table → the new row should have `is_season_ticket = true` → in the app, the ticket appears under **Sezonske**, not **Karte**.

---

# Troubleshooting (all three integrations)

| Symptom | Likely cause | Fix |
|---|---|---|
| WordPress webhook log shows `HTTP 401 Unauthorized` | We turned on `WORDPRESS_WEBHOOK_SECRET` but you're not sending the `X-Webhook-Secret` header | Add the header value we share with you |
| WooCommerce webhook log shows `HTTP 401 Unauthorized` | The Edge Function has "Verify JWT" enabled in the Supabase dashboard | We need to toggle it OFF in Supabase → Edge Functions → `woocommerce-webhook` → Settings (this is on our side, not yours) |
| Log shows `HTTP 200` but ticket never appears in the app | Order status wasn't `completed`/`processing` when webhook fired, OR email mismatch between order and member profile | Re-trigger the webhook after status hits Completed; check the member's email in the app profile |
| Log shows `HTTP 200` but push notification never arrives | User hasn't enabled notifications in the app OR is testing on a device without the app installed | Have a real user with notifications enabled test on a physical device (push doesn't work in the web app / simulator) |
| Log shows `HTTP 500` | Malformed payload or DB error | Copy the response body and send it to us with the order number / post ID |
| Log shows `HTTP 405` | Delivery is using GET instead of POST | Recreate the webhook — WooCommerce sometimes ships broken |
| Test delivery works, real orders don't | Webhook topic is wrong | Confirm topic is **Order updated** (not "Order created" — created fires before payment) |
| Season-ticket product lands in "Karte" tab instead of "Sezonske" | The season-detection snippet isn't installed, or the category slug doesn't contain `sezonsk`/`season` | Verify the snippet is active in `functions.php`; verify the slug matches |

---

# Contact / who owns what

- **You (WP admin / dev)** own: the WordPress webhook / WooCommerce webhook config, the ticket product setup (name, price, `event_name`/`event_date` meta, season category), the `functions.php` snippets, and matching billing emails to app member emails at checkout.
- **We (app team)** own: the Supabase Edge Functions, the `tickets` / `push_tokens` tables, the mobile app UI. If a delivery lands with HTTP 200 but the ticket/notification doesn't behave right, that's on us — send us the order ID / post ID and we'll look.

---

# Endpoints (copy-paste reference)

| Integration | URL |
|---|---|
| Push notifications | `https://qqolxourbfnatlbrrrpr.supabase.co/functions/v1/wordpress-webhook` |
| Tickets (regular + season) | `https://qqolxourbfnatlbrrrpr.supabase.co/functions/v1/woocommerce-webhook` |
