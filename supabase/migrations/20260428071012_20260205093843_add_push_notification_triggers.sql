/*
  # Push Notification Triggers for Polls and News
*/

CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

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
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_key := current_setting('app.settings.service_key', true);
  function_url := supabase_url || '/functions/v1/send-push-notification';
  request_body := jsonb_build_object(
    'title', notification_title,
    'body', notification_body,
    'type', notification_type,
    'data', notification_data
  );

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
    RAISE WARNING 'Failed to send push notification: %', SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION notify_new_poll()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.is_active = true THEN
    PERFORM send_push_notification(
      'Nova anketa!',
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

DROP TRIGGER IF EXISTS trigger_notify_new_poll ON polls;
CREATE TRIGGER trigger_notify_new_poll
  AFTER INSERT ON polls
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_poll();

CREATE OR REPLACE FUNCTION notify_poll_activated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.is_active = false AND NEW.is_active = true THEN
    PERFORM send_push_notification(
      'Nova anketa!',
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

DROP TRIGGER IF EXISTS trigger_notify_poll_activated ON polls;
CREATE TRIGGER trigger_notify_poll_activated
  AFTER UPDATE ON polls
  FOR EACH ROW
  WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active)
  EXECUTE FUNCTION notify_poll_activated();
