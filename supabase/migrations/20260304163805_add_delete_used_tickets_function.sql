/*
  # Add Delete Used Tickets Function
  
  1. New Functions
    - `delete_used_member_tickets(member_id)` - Safely deletes all used tickets for a member
    - Runs in single transaction
  
  2. Security
    - Only deletes tickets that belong to the specified member
    - Returns count of deleted tickets
*/

CREATE OR REPLACE FUNCTION delete_used_member_tickets(
  p_member_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ticket_ids uuid[];
  v_deleted_count int;
BEGIN
  -- Get all used ticket IDs for this member
  SELECT array_agg(id) INTO v_ticket_ids
  FROM tickets
  WHERE member_id::text = p_member_id
  AND status = 'used';
  
  IF v_ticket_ids IS NULL OR array_length(v_ticket_ids, 1) = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'count', 0,
      'message', 'No used tickets to delete'
    );
  END IF;
  
  -- Delete check-ins for these tickets
  DELETE FROM ticket_checkins
  WHERE ticket_id = ANY(v_ticket_ids);
  
  -- Delete the tickets
  DELETE FROM tickets
  WHERE id = ANY(v_ticket_ids);
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'count', v_deleted_count,
    'message', v_deleted_count || ' ticket(s) deleted successfully'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'count', 0,
    'message', 'Error deleting tickets: ' || SQLERRM
  );
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION delete_used_member_tickets(text) TO anon;
GRANT EXECUTE ON FUNCTION delete_used_member_tickets(text) TO authenticated;
