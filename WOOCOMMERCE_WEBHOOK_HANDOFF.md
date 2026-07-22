# WooCommerce → NK Čelik App Webhook (Developer Handoff)

Send this document to your WooCommerce/WordPress developer. It contains everything they need to (re)connect nkcelik.ba orders to the NK Čelik mobile app so purchased tickets appear automatically in the user's "Moje Karte" screen.

---

## 1. What this webhook does

When a customer buys a ticket product on **nkcelik.ba**, WooCommerce should POST the order JSON to our Supabase Edge Function. The function creates one ticket record per line-item quantity, generates a QR code, and links the ticket to the app member whose profile email matches the billing email.

- **Trigger:** Order status change (we filter server-side to `completed` and `processing`)
- **Direction:** WooCommerce → Supabase (one-way, HTTPS POST)
- **Auth:** WooCommerce's built-in **HMAC signature**, using the webhook **Secret** (REQUIRED — see §3). A wrong/empty secret → HTTP 401 and no ticket is created.
- **Body:** Standard WooCommerce `Order` JSON — no custom transformations needed

---

## 2. Endpoint

```
POST https://qqolxourbfnatlbrrrpr.supabase.co/functions/v1/woocommerce-webhook
Content-Type: application/json
```

The webhook's **Secret** must be set (§3). WooCommerce signs each delivery with
it (`X-WC-Webhook-Signature`) and our function verifies it. No other auth header
is needed.

Success response: HTTP `200` with `{ "success": true, "message": "N ticket(s) created" }`.
Already processed (re-delivery): HTTP `200` with `{ "success": true, "duplicate": true }` — safe to ignore; deliveries are idempotent.
Ignored (non-completed) order: HTTP `200` with `{ "message": "Order not completed yet" }`.
Bad/empty secret: HTTP `401` with `{ "error": "Invalid signature" }`.
Errors: HTTP `500` with `{ "error": "...", "message": "..." }`.

---

## 3. Setup in WooCommerce (5 minutes)

1. WP Admin → **WooCommerce → Settings → Advanced → Webhooks**.
2. Click **Add webhook**.
3. Fill in:

| Field | Value |
|---|---|
| Name | `NK Čelik App – Tickets` |
| Status | **Active** |
| Topic | **Order updated** |
| Delivery URL | `https://qqolxourbfnatlbrrrpr.supabase.co/functions/v1/woocommerce-webhook` |
| **Secret** | **⟨WC_WEBHOOK_SECRET — sent separately in a secure message⟩** |
| API Version | `WP REST API Integration v3` |

4. **Save**. Then open the webhook again and click **Deliver** to send a test payload — the log should show `HTTP 200` (not 401).

> **The Secret is required and must match exactly** (no leading/trailing spaces or newlines). A wrong or empty secret returns HTTP 401 and no ticket is created.
>
> **Only ONE webhook may point at this URL.** If a duplicate exists (one with the right secret, one without), each order fires both and you'll see a mix of 200 and 401 in the logs — delete the extra one. If an old webhook is failing, delete it and create a fresh one rather than re-enabling it.

---

## 4. Payload we require

We consume WooCommerce's standard order JSON. The fields we actually read:

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
      "meta_data": [              // OPTIONAL — see §5
        { "key": "event_name", "value": "NK Čelik vs Sarajevo" },
        { "key": "event_date", "value": "2026-08-15T18:00:00" }
      ]
    }
  ]
}
```

All other WooCommerce fields are ignored but harmless.

---

## 5. Event name & date (optional but recommended)

If a line-item includes these meta_data keys, we use them; otherwise we fall back to the product name and leave the date blank.

- `event_name` or `_event_name` → shown as event title on the ticket
- `event_date` or `_event_date` → ISO-8601 datetime string; shown on the ticket

Set these via a WooCommerce product custom field, an ACF field mapped to line-item meta, or your existing tickets plugin (FooEvents, Tickera, etc.). Either the `event_name` or `_event_name` form works.

---

## 5a. Season tickets ("Sezonske karte") — NEW

The app now has a separate **Sezonske** tab that shows only season tickets. To make a purchased ticket land there instead of the regular "Karte" tab, WooCommerce needs to tell us the ticket is a season ticket. Any **one** of the following is enough — pick whichever fits your setup:

**Option A (recommended) — dedicated product category**

1. In WP Admin → **Products → Categories**, create a category named e.g. `Sezonske karte` with slug `sezonske-karte`.
2. Assign all season-ticket products to that category.
3. Add this snippet to your theme's `functions.php` (or a code-snippets plugin). It appends each line item's product categories into the webhook payload so we can detect the season category server-side:

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

**Option B — per-product meta flag**

1. On each season-ticket product, add a custom field `_is_season_ticket = yes` (via the Product data → Custom fields panel, or an ACF field with that meta key).
2. Add this snippet to your theme's `functions.php`:

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

**Option C — zero-config fallback**

If neither snippet is added, we fall back to matching the **product name** against `sezonsk|season` (case-insensitive). This works if all season-ticket products literally have "Sezonska" / "Season" in their name, but is fragile — Option A or B is safer.

**Verification for season tickets**: buy a season-ticket product, then check the Supabase `tickets` table — the new row should have `is_season_ticket = true`. In the app, the ticket should appear under the **Sezonske** tab, not **Karte**.

---

## 6. QR code / ticket_code format

We generate the QR value as `{order.number}-{sequence}`, e.g. an order `#4821` with quantity 2 produces `4821-1` and `4821-2`. The developer does **not** need to send this — we create it. It must be unique per ticket; if orders on your side can share `order.number` (they normally don't), let us know.

---

## 7. Member matching (how tickets show in the app)

- We lowercase and trim `billing.email` and look up `members.email` in Supabase.
- **Match found** → ticket is linked to that member and appears in their "Moje Karte".
- **No match** → ticket is still saved, but only becomes visible when a member with that email logs in.

So the only thing the customer must do is buy on nkcelik.ba using the **same email** they have in their app profile. Nothing needs to change server-side for this.

---

## 8. Verification checklist for the developer

After creating the webhook, verify each of these:

1. In **WooCommerce → Webhooks → [your webhook] → Logs**, the most recent delivery shows **HTTP 200**.
2. Place a test order for a ticket product, mark it **Processing** or **Completed**. Within a few seconds, a new row should appear in the Supabase `tickets` table with `order_id = <that order id>` and `status = 'active'`.
3. The QR code (`ticket_code`) is `{order_number}-1`.
4. If the billing email matches a member, `member_id` is populated; otherwise it is `null` and `customer_email` is filled.

---

## 9. Common failures & how to diagnose

| Symptom | Likely cause | Fix |
|---|---|---|
| Log shows `HTTP 401` | The webhook **Secret** is wrong/empty, or a **duplicate webhook** with no secret exists | Set the Secret to the exact value we provided; delete any duplicate webhook pointing at the same URL |
| Log shows `HTTP 200` but ticket never appears in app | Order status wasn't `completed`/`processing` when webhook fired, OR email mismatch between order and member profile | Re-trigger the webhook after status hits Completed; check the member's email in the app profile |
| Log shows `HTTP 500` | Malformed payload or DB error | Copy the response body and send to us with the order number |
| Log shows `HTTP 405` | Delivery is using GET instead of POST | Recreate the webhook — WooCommerce sometimes ships broken |
| Test delivery works, real orders don't | Webhook topic is wrong | Confirm topic is **Order updated** (not "Order created" — created fires before payment) |

---

## 10. Contact / who owns what

- **You (WP dev)** own: the WooCommerce webhook config, the ticket product setup (name, price, `event_name`/`event_date` meta), and matching billing emails to app member emails at checkout.
- **We (app team)** own: the Supabase Edge Function, the `tickets` table, the mobile app UI. If a delivery lands with HTTP 200 but the ticket doesn't behave right, that's on us — send us the order ID and we'll look.

---

**Endpoint (again, for copy-paste):**
```
https://qqolxourbfnatlbrrrpr.supabase.co/functions/v1/woocommerce-webhook
```
