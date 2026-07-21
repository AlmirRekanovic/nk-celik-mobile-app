# Push Notifications Setup Guide

This guide explains how to set up push notifications for NK Čelik app for news articles and polls.

## Overview

The app now supports push notifications for:
- 📰 New news articles from WordPress
- 📊 New polls and voting opportunities

## Features Implemented

### 1. Push Notification System
- ✅ Push token management in Supabase
- ✅ Edge function for sending notifications
- ✅ User notification preferences in settings
- ✅ Permission request modal with explanation
- ✅ Automatic notification on new polls
- ✅ WordPress webhook integration for news

### 2. User Experience
- Permission modal explains benefits before requesting access
- Toggle in settings to enable/disable notifications
- Only prompts once per user session
- Respects user preferences

## WordPress Webhook Setup

To enable push notifications for new articles, you need to set up a WordPress webhook:

### Step 1: Get Your Webhook URL

Your WordPress webhook URL is:
```
https://qqolxourbfnatlbrrrpr.supabase.co/functions/v1/wordpress-webhook
```

### Step 2: Install WordPress Plugin

1. Install the "WP Webhooks" or "WP REST API Webhooks" plugin in WordPress
2. Or use code to trigger webhook on post publish

### Step 3: Configure Webhook Trigger

Add this code to your WordPress theme's `functions.php` or create a custom plugin:

```php
<?php
function send_notification_on_post_publish( $post_id, $post ) {
    // Only trigger for published posts (not drafts, pages, etc.)
    if ( $post->post_status !== 'publish' || $post->post_type !== 'post' ) {
        return;
    }

    // Avoid triggering on post updates (only new posts)
    if ( get_post_meta( $post_id, '_notification_sent', true ) ) {
        return;
    }

    $webhook_url = 'https://qqolxourbfnatlbrrrpr.supabase.co/functions/v1/wordpress-webhook';

    $data = array(
        'id' => $post->ID,
        'title' => array(
            'rendered' => $post->post_title
        ),
        'excerpt' => array(
            'rendered' => get_the_excerpt( $post->ID )
        ),
        'status' => $post->post_status,
        'type' => $post->post_type
    );

    $response = wp_remote_post( $webhook_url, array(
        'headers' => array(
            'Content-Type' => 'application/json'
        ),
        'body' => json_encode( $data ),
        'timeout' => 15
    ) );

    if ( !is_wp_error( $response ) ) {
        update_post_meta( $post_id, '_notification_sent', true );
    }
}

add_action( 'publish_post', 'send_notification_on_post_publish', 10, 2 );
```

### Alternative: Using WP Webhooks Plugin

1. Install "WP Webhooks" plugin
2. Go to Settings → WP Webhooks
3. Add new webhook:
   - **Trigger**: `post_published`
   - **URL**: `https://qqolxourbfnatlbrrrpr.supabase.co/functions/v1/wordpress-webhook`
   - **Method**: POST
   - **Content Type**: application/json

## Testing

### Test WordPress Notifications
1. Publish a new post in WordPress
2. Check your mobile device for notification
3. Verify notification appears in app

### Test Poll Notifications
1. Log in as admin in the app
2. Create a new poll in "Upravljanje anketama"
3. Check that all users receive notification

## Database Schema

### Push Tokens Table
```sql
CREATE TABLE push_tokens (
  id uuid PRIMARY KEY,
  member_id uuid REFERENCES members(id),
  token text UNIQUE NOT NULL,
  platform text CHECK (platform IN ('ios', 'android', 'web')),
  enabled boolean DEFAULT true,
  created_at timestamptz,
  updated_at timestamptz
);
```

## Edge Functions

### send-push-notification
Sends push notifications to all enabled tokens.

**Endpoint**: `/functions/v1/send-push-notification`

**Request**:
```json
{
  "title": "Notification Title",
  "body": "Notification body text",
  "type": "news" | "poll",
  "data": {
    "post_id": "123",
    "poll_id": "uuid"
  }
}
```

### wordpress-webhook
Receives WordPress post publish events and triggers notifications.

**Endpoint**: `/functions/v1/wordpress-webhook`

**Request**: WordPress post object

### woocommerce-webhook
Handles WooCommerce orders and creates tickets (existing functionality).

## Troubleshooting

### Notifications Not Received
1. Check notification permissions in device settings
2. Verify user has enabled notifications in app settings
3. Check push token exists in database
4. Verify edge function logs in Supabase

### WordPress Webhook Not Triggering
1. Test webhook URL manually with curl
2. Check WordPress error logs
3. Verify webhook is triggered on post publish
4. Check Supabase edge function logs

## Security Notes

- Push tokens are stored securely in Supabase
- RLS policies ensure users can only manage their own tokens
- Webhooks use public endpoints but validate data
- Service role key used for sending notifications

## Future Enhancements

- Scheduled notifications for upcoming events
- Notification categories/topics
- Rich notifications with images
- Action buttons in notifications
- Notification history in app
