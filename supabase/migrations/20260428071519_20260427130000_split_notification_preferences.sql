/*
  # Split Notification Preferences

  1. Changes
    - Add `news_enabled` column to `push_tokens` table (separate toggle for news notifications)
    - Add `polls_enabled` column to `push_tokens` table (separate toggle for poll notifications)
    - Migrate existing `enabled` values to both new columns
    - Keep `enabled` as a master switch (token is active at all)

  2. Purpose
    - Allows members to independently control news vs poll push notifications
    - The `enabled` column remains as the master switch for the token itself
    - `news_enabled` and `polls_enabled` filter which notification types are sent
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'push_tokens' AND column_name = 'news_enabled'
  ) THEN
    ALTER TABLE push_tokens ADD COLUMN news_enabled boolean DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'push_tokens' AND column_name = 'polls_enabled'
  ) THEN
    ALTER TABLE push_tokens ADD COLUMN polls_enabled boolean DEFAULT true;
  END IF;
END $$;

-- Migrate existing enabled value to both new columns
UPDATE push_tokens
SET
  news_enabled = enabled,
  polls_enabled = enabled
WHERE news_enabled IS NULL OR polls_enabled IS NULL;

-- Index for fast filtering by notification type
CREATE INDEX IF NOT EXISTS idx_push_tokens_news_enabled ON push_tokens(news_enabled) WHERE news_enabled = true;
CREATE INDEX IF NOT EXISTS idx_push_tokens_polls_enabled ON push_tokens(polls_enabled) WHERE polls_enabled = true;
