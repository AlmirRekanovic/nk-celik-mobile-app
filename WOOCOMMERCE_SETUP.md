# WooCommerce Webhook Setup - Automatic Ticket Sync

This guide explains how to set up automatic ticket sync from your WooCommerce store to the NK Čelik mobile app.

## How It Works

1. **Customer buys ticket on nkcelik.ba**
2. **WooCommerce automatically sends webhook notification**
3. **Our server creates ticket in database**
4. **User opens app → ticket appears in "Moje Karte"**
5. **User shows QR code at entrance → staff scans it**

## Prerequisites

- WooCommerce admin access to nkcelik.ba
- Users must use **same email** for:
  - WooCommerce purchase (checkout email)
  - App login (member email)

## Setup Instructions

### Step 1: Log into WordPress Admin

1. Go to `https://nkcelik.ba/wp-admin`
2. Log in with your admin credentials

### Step 2: Navigate to WooCommerce Webhooks

1. In the left sidebar, hover over **WooCommerce**
2. Click **Settings**
3. Click on the **Advanced** tab at the top
4. Click **Webhooks** in the sub-menu

### Step 3: Create New Webhook

1. Click **Add webhook** button at the top
2. Fill in the following details:

#### Webhook Configuration

**Name:** `NK Čelik App - Order Completed`

**Status:** `Active` (important!)

**Topic:** `Order updated` (select from dropdown)

**Delivery URL:**
```
https://oosnrzkrxyjzpopbnpxt.supabase.co/functions/v1/woocommerce-webhook
```

**Secret:** (leave empty - not required)

**API Version:** `WP REST API Integration v3`

3. Click **Save webhook**

### Step 4: Test the Webhook (Optional)

After saving, WooCommerce will show a test button:

1. Find your newly created webhook in the list
2. Click on it to view details
3. Click **Deliver** button to send a test payload
4. Check **Response** - you should see `200 OK` status

## How Tickets Are Created

### Automatic Matching

The system automatically matches tickets to app users by email:

- **Email in WooCommerce order = Email in member profile** → Ticket linked to member
- **Email doesn't match** → Ticket stored but not visible in app (until member adds email)

### Ticket Information

Each ticket includes:
- Order ID and number
- Product name (ticket type)
- Customer name and email
- Event name and date (if provided in product)
- Unique QR code (auto-generated)
- Status (active, used, cancelled)

### Multiple Tickets

If customer buys multiple quantities:
- One separate ticket created for each quantity
- Each ticket has unique QR code
- All tickets appear in customer's app

## User Requirements

### For Automatic Sync to Work

Users must:
1. **Have account in app** (logged in with member ID)
2. **Add email to their profile** that matches WooCommerce order email
3. Open app after purchase to see tickets

### Adding Email to Member Profile

Currently, emails must be added manually to the database:

1. Go to Supabase Dashboard
2. Navigate to **Table Editor** → **members** table
3. Find the member by `member_id` or name
4. Click to edit, add their email
5. Save changes

**Future improvement:** Add email field to member profile in app settings

## Troubleshooting

### Tickets Not Appearing in App

**Problem:** User bought ticket but doesn't see it in app

**Solutions:**
1. Verify webhook is **Active** in WooCommerce
2. Check if user's **email in app matches order email**
3. Check webhook delivery logs in WooCommerce:
   - Go to WooCommerce → Settings → Advanced → Webhooks
   - Click on the webhook
   - Check **Logs** section for delivery status
4. Verify order status is **Completed** or **Processing**

### Webhook Delivery Failed

**Problem:** Webhook shows failed delivery in logs

**Check:**
1. Webhook URL is correct (no typos)
2. Your site can reach external URLs (check with hosting provider)
3. Check Edge Function logs in Supabase Dashboard

### User Can't Log In

**Problem:** User trying to use email instead of member ID

**Solution:**
- App uses member ID for login (not email)
- Email is only used for matching WooCommerce orders
- User must log in with their **member_id** (from club)

## Webhook Payload Example

This is what WooCommerce sends to our server:

```json
{
  "id": 12345,
  "number": "12345",
  "status": "completed",
  "currency": "BAM",
  "date_created": "2024-12-12T10:30:00",
  "billing": {
    "first_name": "Marko",
    "last_name": "Marković",
    "email": "marko@example.com"
  },
  "line_items": [
    {
      "id": 1,
      "name": "VIP Karta - NK Čelik vs Sarajevo",
      "product_id": 123,
      "quantity": 2,
      "sku": "TICKET-VIP-001",
      "price": 50.00,
      "total": "100.00"
    }
  ]
}
```

## Security Notes

- Webhook endpoint is public (no authentication required)
- This is standard for WooCommerce webhooks
- Our server validates incoming data
- Only creates tickets for completed/processing orders
- Uses Supabase Row Level Security for data access

## Next Steps

After setup is complete:

1. **Test with real order** - place a test order on nkcelik.ba
2. **Verify ticket appears** in app "Moje Karte" section
3. **Test QR code scanning** at entrance with admin account
4. Monitor webhook deliveries in first few days

## Support

If you need help with setup:
- Check webhook logs in WooCommerce admin
- Check Edge Function logs in Supabase Dashboard
- Verify user emails match between WooCommerce and app

---

**Last updated:** 2024-12-12
