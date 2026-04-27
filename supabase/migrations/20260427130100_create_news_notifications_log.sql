/*
  # News Notifications Log (dedupe table)

  1. New tables
    - `news_notifications` — one row per WordPress post we have already
      notified about. The poller (and the optional WordPress webhook) use
      this to ensure a given post never triggers a push more than once,
      even if WordPress republishes it or the poller runs concurrently.

  2. Columns
    - `wp_post_id` (bigint, primary key) — WordPress post ID
    - `title` (text) — captured for audit/debug
    - `notified_at` (timestamptz, default now())

  3. Security
    - RLS enabled, no public policies. Only the service role (used by
      edge functions) can read/write this table. Clients do not need
      access.
*/

CREATE TABLE IF NOT EXISTS news_notifications (
  wp_post_id bigint PRIMARY KEY,
  title text NOT NULL,
  notified_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_news_notifications_notified_at
  ON news_notifications(notified_at DESC);

ALTER TABLE news_notifications ENABLE ROW LEVEL SECURITY;
