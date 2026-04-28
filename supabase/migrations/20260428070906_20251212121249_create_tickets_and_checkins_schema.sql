/*
  # Create Tickets and Check-ins Schema

  1. New Tables
    - `tickets`
    - `ticket_checkins`

  2. Security
    - Enable RLS on both tables
    - Admin and member access policies
*/

CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id integer NOT NULL,
  product_id integer NOT NULL,
  ticket_code text UNIQUE NOT NULL,
  ticket_type text NOT NULL DEFAULT '',
  customer_email text NOT NULL DEFAULT '',
  customer_name text NOT NULL DEFAULT '',
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  event_name text NOT NULL DEFAULT '',
  event_date timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_ticket_code ON tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_tickets_customer_email ON tickets(customer_email);
CREATE INDEX IF NOT EXISTS idx_tickets_member_id ON tickets(member_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

CREATE TABLE IF NOT EXISTS ticket_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  checked_in_at timestamptz DEFAULT now(),
  checked_in_by uuid REFERENCES members(id) ON DELETE SET NULL,
  location text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_checkins_ticket_id ON ticket_checkins(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_checkins_checked_in_by ON ticket_checkins(checked_in_by);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "Members can view own tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (member_id = auth.uid());

CREATE POLICY "Admins can insert tickets"
  ON tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can update tickets"
  ON tickets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = auth.uid()
      AND members.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "Admins can view all check-ins"
  ON ticket_checkins FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = auth.uid()
      AND members.is_admin = true
    )
  );

CREATE POLICY "Members can view check-ins for own tickets"
  ON ticket_checkins FOR SELECT
  TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM tickets
      WHERE member_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert check-ins"
  ON ticket_checkins FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = auth.uid()
      AND members.is_admin = true
    )
  );
