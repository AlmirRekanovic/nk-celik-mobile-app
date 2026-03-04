/*
  # Link Tickets to Members by Email
  
  1. New Functions
    - `link_tickets_by_email()` - Function to automatically link tickets to members based on matching email
  
  2. Purpose
    - Helps resolve issues where tickets were created with NULL member_id
    - Can be called manually or scheduled to run periodically
    - Matches tickets.customer_email with members.email
*/

CREATE OR REPLACE FUNCTION link_tickets_by_email()
RETURNS TABLE(
  tickets_updated INTEGER,
  details JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
  update_details JSONB;
BEGIN
  WITH updated_tickets AS (
    UPDATE tickets t
    SET member_id = m.id
    FROM members m
    WHERE t.member_id IS NULL
      AND t.customer_email IS NOT NULL
      AND m.email IS NOT NULL
      AND LOWER(TRIM(t.customer_email)) = LOWER(TRIM(m.email))
    RETURNING t.id, t.order_id, t.customer_email, m.id as member_id, m.first_name, m.last_name
  )
  SELECT 
    COUNT(*)::INTEGER,
    jsonb_agg(
      jsonb_build_object(
        'ticket_id', id,
        'order_id', order_id,
        'email', customer_email,
        'member_name', first_name || ' ' || last_name
      )
    )
  INTO updated_count, update_details
  FROM updated_tickets;
  
  RETURN QUERY SELECT updated_count, update_details;
END;
$$;
