/*
  # Split Notification Preferences (news / polls)

  1. Schema changes
    - Add `news_enabled` (boolean, default true) and `polls_enabled`
      (boolean, default true) columns to `push_tokens`. The legacy
      `enabled` column is kept as a global "notifications on/off" master
      switch for backwards compatibility.
    - Backfill the new columns from the existing `enabled` value so users
      who explicitly disabled notifications stay disabled for both
      categories.

  2. Indexes
    - Partial indexes on the new columns so the fanout query only scans
      tokens that actually want each category.

  3. Notes
    - The send-push-notification edge function will read `news_enabled`
      when type='news' and `polls_enabled` when type='poll', falling
      back to `enabled` if the column is absent (defensive cross-
      version compat).
*/

ALTER TABLE push_tokens
  ADD COLUMN IF NOT EXISTS news_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS polls_enabled boolean NOT NULL DEFAULT true;

UPDATE push_tokens
  SET news_enabled = enabled,
      polls_enabled = enabled
  WHERE news_enabled IS DISTINCT FROM enabled
     OR polls_enabled IS DISTINCT FROM enabled;

CREATE INDEX IF NOT EXISTS idx_push_tokens_news_enabled
  ON push_tokens(news_enabled)
  WHERE news_enabled = true AND enabled = true;

CREATE INDEX IF NOT EXISTS idx_push_tokens_polls_enabled
  ON push_tokens(polls_enabled)
  WHERE polls_enabled = true AND enabled = true;
