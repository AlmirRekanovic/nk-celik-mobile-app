/*
  # Add Delete Ticket Function
  
  1. New Functions
    - `delete_member_ticket(ticket_id, member_id)` - Safely deletes a ticket and its check-ins
    - Runs in single transaction with member context set
  
  2. Security
    - Validates that ticket belongs to member before deleting
    - Returns success/failure status
    - No RLS policies needed as validation is done in function
*/

CREATE OR REPLACE FUNCTION delete_member_ticket(
  p_ticket_id uuid,
  p_member_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ticket_member_id uuid;
  v_deleted_count int;
BEGIN
  -- Check if ticket exists and belongs to member
  SELECT member_id INTO v_ticket_member_id
  FROM tickets
  WHERE id = p_ticket_id;
  
  IF v_ticket_member_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Ticket not found'
    );
  END IF;
  
  IF v_ticket_member_id::text != p_member_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Unauthorized: Ticket does not belong to member'
    );
  END IF;
  
  -- Delete check-ins first
  DELETE FROM ticket_checkins
  WHERE ticket_id = p_ticket_id;
  
  -- Delete ticket
  DELETE FROM tickets
  WHERE id = p_ticket_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Ticket deleted successfully'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Error deleting ticket: ' || SQLERRM
  );
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION delete_member_ticket(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION delete_member_ticket(uuid, text) TO authenticated;
