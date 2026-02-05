# Push Notifications Setup Guide

Push notifications have been implemented for new news posts and polls. Users will receive notifications on their mobile devices when new content is published.

## Features

- Push notifications for new news articles
- Push notifications for new polls
- User preference toggle in settings
- Works on iOS and Android (not on web)
- Automatic token registration on login
- Secure storage of push tokens in Supabase

## How It Works

### 1. User Registration
When a member logs in to the app:
- The app automatically requests notification permissions
- If granted, an Expo push token is generated
- The token is stored in the `push_tokens` table in Supabase
- The token is associated with the member's ID

### 2. User Settings
Members can control notifications:
- Go to Settings tab
- Toggle "Push obavještenja" switch
- This enables/disables notifications without removing the token

### 3. Sending Notifications

#### Option A: Using the Edge Function Directly

You can send notifications by calling the edge function:

```bash
curl -X POST \
  https://[YOUR-SUPABASE-URL]/functions/v1/send-push-notification \
  -H "Authorization: Bearer [YOUR-SUPABASE-ANON-KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Nova vijest",
    "body": "Čelik pobijedio 3-0!",
    "type": "news",
    "data": {
      "postId": 12345,
      "url": "https://nkcelik.ba/..."
    }
  }'
```

#### Option B: Automating with WordPress Webhooks

To automatically send notifications when new content is published:

1. Install a WordPress plugin like "WP Webhooks" or "Zapier for WordPress"
2. Create a webhook that triggers on:
   - New post published
   - New poll created
3. Configure the webhook to call your edge function

#### Option C: Manual Testing

For testing purposes, you can use the Supabase Dashboard:
1. Go to your Supabase project
2. Navigate to Edge Functions
3. Select `send-push-notification`
4. Test with sample JSON data

## Database Schema

### push_tokens Table
- `id` (uuid) - Primary key
- `member_id` (text) - References members table
- `token` (text) - Expo push token (unique)
- `platform` (text) - ios, android, or web
- `enabled` (boolean) - Notification preference
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

## Edge Function API

### Endpoint
`POST /functions/v1/send-push-notification`

### Request Body
```json
{
  "title": "Notification Title",
  "body": "Notification message",
  "type": "news" | "poll",
  "data": {
    "postId": 123,
    "additionalData": "..."
  }
}
```

### Response
```json
{
  "message": "Push notifications sent successfully",
  "sentCount": 150,
  "results": [...]
}
```

## Important Notes

### Web Platform Limitation
- Push notifications do NOT work on web browsers
- Only works on physical iOS and Android devices
- Development builds require Expo Go or EAS Development Client

### Testing Requirements
To test push notifications, you need:
1. A physical iOS or Android device
2. Expo Go app OR a development build
3. The app must be built with EAS Build for production

### EAS Build Configuration
For production builds, you'll need:
1. An Expo account
2. EAS CLI configured
3. Push notification credentials set up in Expo

Run these commands to set up:
```bash
npm install -g eas-cli
eas login
eas build:configure
```

## Migration File

The database migration has been created at:
`supabase/migrations/20260113120000_create_push_tokens_schema.sql`

Make sure to apply this migration to your Supabase database.

## Security

- Row Level Security (RLS) is enabled on the push_tokens table
- Members can only view and manage their own tokens
- The edge function can only be called with valid Supabase credentials
- Push tokens are securely stored and never exposed to clients

## Troubleshooting

### Notifications Not Received
1. Check device notification permissions in system settings
2. Verify the push token was saved (query push_tokens table)
3. Check the member has notifications enabled in app settings
4. Verify the edge function was called successfully
5. Check Expo push notification service status

### Token Not Registering
1. Make sure you're using a physical device
2. Check console logs for permission errors
3. Verify member is logged in (not guest mode)
3. Check Supabase connection and RLS policies

## Future Enhancements

Possible improvements:
- Notification history in the app
- Scheduled notifications
- Different notification channels for news vs polls
- Rich notifications with images
- Action buttons in notifications
