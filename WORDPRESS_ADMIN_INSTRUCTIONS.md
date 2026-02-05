# WordPress Push Notifications Setup - Instructions for Admin

## Overview
This document provides step-by-step instructions for setting up push notifications in WordPress to automatically notify app users when new articles are published.

## What You Need

1. **Your Supabase Function URL:**
   ```
   https://[YOUR-SUPABASE-PROJECT-ID].supabase.co/functions/v1/wordpress-webhook
   ```
   (Ask your developer for the exact URL)

2. **Webhook Secret Key:**
   (Ask your developer for the authentication key)

---

## Step 1: Install a Webhook Plugin

You need to install a WordPress plugin that can send webhooks when posts are published. Here are two recommended options:

### Option A: WP Webhooks (Recommended - Free)

1. Go to **WordPress Admin Dashboard**
2. Navigate to **Plugins → Add New**
3. Search for **"WP Webhooks"**
4. Click **Install Now** on "WP Webhooks - Automations, Webhooks, and Integrations"
5. Click **Activate**

### Option B: Zapier for WordPress

1. Go to **WordPress Admin Dashboard**
2. Navigate to **Plugins → Add New**
3. Search for **"Zapier for WordPress"**
4. Install and activate the plugin

---

## Step 2: Configure the Webhook (Using WP Webhooks)

### Step 2.1: Access WP Webhooks Settings

1. In WordPress Admin, go to **Settings → WP Webhooks**
2. Click on the **"Send Data"** tab

### Step 2.2: Add New Webhook Trigger

1. Click **"Add Webhook URL"**
2. In the **Webhook URL** field, enter:
   ```
   https://[YOUR-SUPABASE-PROJECT-ID].supabase.co/functions/v1/wordpress-webhook
   ```
   (Use the exact URL provided by your developer)

3. In the **Webhook Name** field, enter:
   ```
   NK Celik App Push Notifications
   ```

### Step 2.3: Configure Trigger Settings

1. In the **Webhook Trigger** dropdown, select **"Post Published"**
2. Under **Post Types**, make sure **"Post"** is selected
3. Under **Post Status**, select **"Publish"**

### Step 2.4: Configure Request Settings

1. **Method**: Select **POST**
2. **Content-Type**: Select **application/json**
3. **Authentication**:
   - Select **"Bearer Token"** if available
   - Enter the authentication key provided by your developer

### Step 2.5: Save the Webhook

1. Click **"Save Webhook"**
2. Test it by publishing a new post (see Testing section below)

---

## Step 3: Test the Setup

### Create a Test Post

1. Go to **Posts → Add New**
2. Create a test post with:
   - **Title**: "Test Push Notification"
   - **Content**: Add some sample content
3. Click **Publish**

### Verify it Works

After publishing:
1. The webhook should automatically send data to the app
2. App users with notifications enabled should receive a push notification
3. Ask your developer to check if the notification was sent successfully

### Check for Errors

If notifications don't work:
1. Go to **Settings → WP Webhooks → Send Data**
2. Click on your webhook
3. Scroll down to **"Webhook Logs"** to see if there are any errors
4. Share any error messages with your developer

---

## Step 4: Troubleshooting

### Common Issues

**Issue: Webhook not triggering**
- Solution: Make sure the post status is "Published" (not "Draft" or "Scheduled")
- Check that the webhook trigger is set to "Post Published"

**Issue: 401 Unauthorized error**
- Solution: The authentication key may be incorrect
- Contact your developer for the correct key

**Issue: 404 Not Found error**
- Solution: The webhook URL may be incorrect
- Verify the URL with your developer

**Issue: Notifications not received by users**
- This is not a WordPress issue
- Ask users to check their app notification settings
- Contact your developer to verify the push notification service

---

## Alternative Setup Using Zapier (If Using Zapier Plugin)

1. Install and activate **Zapier for WordPress** plugin
2. Go to **Settings → Zapier**
3. Create a new Zap:
   - **Trigger**: WordPress - New Post
   - **Action**: Webhooks by Zapier - POST
   - **URL**: Your Supabase function URL
   - **Payload Type**: JSON
   - **Data**: Map WordPress post data to JSON

---

## Important Notes

1. **Only Published Posts Trigger Notifications**: Drafts, scheduled posts, and updates to existing posts will NOT send notifications
2. **Post Type Must Be "Post"**: Pages, custom post types, etc. will NOT trigger notifications
3. **No Duplicates**: The same post being republished will send another notification
4. **Users Must Opt-In**: Only users who have enabled push notifications in the app will receive them

---

## Need Help?

If you encounter any issues:
1. Check the webhook logs in the plugin settings
2. Take screenshots of any error messages
3. Contact your developer with:
   - The error message
   - What you were doing when it happened
   - Screenshots of your webhook configuration

---

## Summary Checklist

- [ ] Installed webhook plugin (WP Webhooks or Zapier)
- [ ] Added Supabase function URL
- [ ] Configured trigger for "Post Published"
- [ ] Set method to POST
- [ ] Added authentication key
- [ ] Saved webhook configuration
- [ ] Tested with a sample post
- [ ] Verified notifications are being received
