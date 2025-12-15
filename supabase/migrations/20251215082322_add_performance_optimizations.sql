/*
  # Performance Optimizations for Scale

  1. Indexes
    - Add index on `tickets.order_id` for faster WooCommerce order lookups
    - Add composite index on `tickets(status, created_at)` for filtered queries
    
  2. Important Notes
    - These indexes will significantly improve query performance at scale
    - order_id index helps when looking up tickets by WooCommerce order
    - Composite index helps with filtered and sorted queries
*/

-- Add index on order_id for faster lookups from WooCommerce
CREATE INDEX IF NOT EXISTS idx_tickets_order_id ON tickets(order_id);

-- Add composite index for status-based queries with date sorting
CREATE INDEX IF NOT EXISTS idx_tickets_status_created_at ON tickets(status, created_at DESC);

-- Add index on event_date for event-based queries
CREATE INDEX IF NOT EXISTS idx_tickets_event_date ON tickets(event_date) WHERE event_date IS NOT NULL;