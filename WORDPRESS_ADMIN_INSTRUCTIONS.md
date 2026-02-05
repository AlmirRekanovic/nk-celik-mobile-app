# WordPress Push Notifications Setup Instructions

These instructions are for the WordPress administrator to set up automatic push notifications when new posts are published.

## Overview

When a new post is published on WordPress, this system will automatically send push notifications to users who have opted in through the mobile app.

## Prerequisites

You will need:
- Admin access to your WordPress site
- The Supabase webhook URL (provided by app developer)
- Ability to install WordPress plugins

## Step 1: Install WP Webhooks Plugin

1. Log in to your WordPress admin dashboard
2. Go to **Plugins** → **Add New**
3. Search for "WP Webhooks"
4. Install and activate the **WP Webhooks** plugin (by Ironikus)
   - Or download from: https://wordpress.org/plugins/wp-webhooks/

## Step 2: Configure the Webhook

1. After activating the plugin, go to **Settings** → **WP Webhooks** in your WordPress dashboard

2. Click on the **Send Data** tab

3. Click **Add Webhook URL**

4. Configure the webhook with these settings:
   - **Trigger**: Select "Post published"
   - **Webhook URL**: Paste the URL provided by your app developer
     - Format: `https://[YOUR-SUPABASE-PROJECT-ID].supabase.co/functions/v1/wordpress-webhook`
   - **Name**: "Push Notifications on New Post"
   - **Status**: Make sure it's enabled (toggle to ON)

5. Click **Save**

## Step 3: Test the Setup

1. Create a new test post in WordPress (or use draft)
2. Publish the post
3. Check if the webhook was triggered:
   - Go back to **WP Webhooks** → **Send Data** → **Logs**
   - You should see a recent log entry with status 200 (success)

## Troubleshooting

### Webhook not triggering
- Verify the webhook URL is correct
- Check that the webhook is enabled
- Make sure you selected the "Post published" trigger

### Webhook failing (status 4xx or 5xx)
- Check the webhook URL is accessible
- Verify the URL was copied correctly without extra spaces
- Contact the app developer with the error code from the logs

### No notifications being sent
- Verify the webhook logs show status 200
- Check with app developer that the Supabase function is working
- Ensure users have enabled push notifications in the app

## What Data is Sent?

When a post is published, the following data is sent to the webhook:
- Post ID
- Post title
- Post excerpt
- Post URL
- Publication date
- Featured image URL (if available)

This data is then used to send push notifications to app users.

## Security Notes

- The webhook URL should be kept secure
- Only authorized WordPress admins should have access to webhook settings
- The system uses HTTPS for secure data transmission

## Support

If you encounter any issues:
1. Check the webhook logs in WordPress
2. Take a screenshot of any error messages
3. Contact the app developer with:
   - Error message/screenshot
   - Timestamp of when the issue occurred
   - What action you were performing

---

**Last Updated**: February 2026
