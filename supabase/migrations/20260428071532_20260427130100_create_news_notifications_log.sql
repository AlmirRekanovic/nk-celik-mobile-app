/*
  # Create News Notifications Log

  1. New Tables
    - `news_notifications_log`
      - `id` (uuid, primary key)
      - `post_id` (integer) - WordPress post ID
      - `post_title` (text) - Title of the post that triggered the notification
      - `sent_at` (timestamptz) - When the notification was sent
      - `tokens_sent` (integer) - Number of tokens the notification was dispatched to
      - `success` (boolean) - Whether the dispatch succeeded

  2. Purpose
    - Prevents duplicate push notifications for the same WordPress post
    - Provides an audit trail of all sent news notifications
    - The send-push-notification edge function checks this log before sending

  3. Security
    - Enable RLS
    - Only service_role can insert/update (edge functions use service role key)
    - Anon/authenticated can read (for admin visibility)
*/

CREATE TABLE IF NOT EXISTS news_notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id integer NOT NULL,
  post_title text NOT NULL DEFAULT '',
  sent_at timestamptz DEFAULT now(),
  tokens_sent integer DEFAULT 0,
  success boolean DEFAULT true
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_news_notifications_log_post_id ON news_notifications_log(post_id);
CREATE INDEX IF NOT EXISTS idx_news_notifications_log_sent_at ON news_notifications_log(sent_at DESC);

ALTER TABLE news_notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read notification log"
  ON news_notifications_log FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role can insert notification log"
  ON news_notifications_log FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update notification log"
  ON news_notifications_log FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
