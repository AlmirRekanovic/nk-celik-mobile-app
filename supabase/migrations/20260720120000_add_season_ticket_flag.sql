/*
  # Add season-ticket flag to tickets

  Adds an `is_season_ticket` boolean column to distinguish season tickets
  (sezonske karte) from single-match tickets (utakmice). The WooCommerce
  webhook sets this on insert based on product category / line-item meta.

  Backfill: existing rows default to `false` (single-match tickets).
  Index: partial index on (member_id) where is_season_ticket = true, since
  the "Sezonske" tab query filters by this flag and member.
*/

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS is_season_ticket boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tickets_season_member
  ON tickets (member_id)
  WHERE is_season_ticket = true;

CREATE INDEX IF NOT EXISTS idx_tickets_season_email
  ON tickets (customer_email)
  WHERE is_season_ticket = true;
