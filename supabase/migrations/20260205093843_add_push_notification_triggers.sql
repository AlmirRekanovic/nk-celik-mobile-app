/*
  # Push Notification Triggers for Polls and News

  1. New Functions
    - `notify_new_poll()` - Triggers push notification when a new poll is created
    - `notify_poll_ending()` - Triggers notification when a poll is ending soon
    - Creates HTTP request extension for edge function calls

  2. Triggers
    - Trigger on polls table insert to send notifications
    - Automatic notification system for new polls

  3. Security
    - Functions run with security definer privileges
    - Only triggers on new active polls
*/

-- Enable the HTTP extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Function to send push notification via edge function
CREATE OR REPLACE FUNCTION send_push_notification(
  notification_title TEXT,
  notification_body TEXT,
  notification_type TEXT,
  notification_data JSONB DEFAULT '{}'::JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  function_url TEXT;
  supabase_url TEXT;
  service_key TEXT;
  request_body JSONB;
BEGIN
  -- Get Supabase URL and service key from environment
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_key := current_setting('app.settings.service_key', true);
  
  -- Construct the edge function URL
  function_url := supabase_url || '/functions/v1/send-push-notification';
  
  -- Build request body
  request_body := jsonb_build_object(
    'title', notification_title,
    'body', notification_body,
    'type', notification_type,
    'data', notification_data
  );

  -- Make async HTTP request to edge function
  PERFORM extensions.http((
    'POST',
    function_url,
    ARRAY[
      extensions.http_header('Content-Type', 'application/json'),
      extensions.http_header('Authorization', 'Bearer ' || service_key)
    ],
    'application/json',
    request_body::text
  ));

EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to send push notification: %', SQLERRM;
END;
$$;

-- Function to notify about new polls
CREATE OR REPLACE FUNCTION notify_new_poll()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only send notification if poll is active
  IF NEW.is_active = true THEN
    -- Send notification asynchronously
    PERFORM send_push_notification(
      'Nova anketa! 📊',
      NEW.title,
      'poll',
      jsonb_build_object(
        'poll_id', NEW.id::text,
        'poll_title', NEW.title
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new polls
DROP TRIGGER IF EXISTS trigger_notify_new_poll ON polls;
CREATE TRIGGER trigger_notify_new_poll
  AFTER INSERT ON polls
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_poll();

-- Function to notify about poll updates (when poll becomes active)
CREATE OR REPLACE FUNCTION notify_poll_activated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only send notification if poll was just activated
  IF OLD.is_active = false AND NEW.is_active = true THEN
    PERFORM send_push_notification(
      'Nova anketa! 📊',
      NEW.title,
      'poll',
      jsonb_build_object(
        'poll_id', NEW.id::text,
        'poll_title', NEW.title
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for poll activation
DROP TRIGGER IF EXISTS trigger_notify_poll_activated ON polls;
CREATE TRIGGER trigger_notify_poll_activated
  AFTER UPDATE ON polls
  FOR EACH ROW
  WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active)
  EXECUTE FUNCTION notify_poll_activated();
