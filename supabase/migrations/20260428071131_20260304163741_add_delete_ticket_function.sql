/*
  # Add Delete Ticket Function
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
  SELECT member_id INTO v_ticket_member_id
  FROM tickets
  WHERE id = p_ticket_id;

  IF v_ticket_member_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ticket not found');
  END IF;

  IF v_ticket_member_id::text != p_member_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Ticket does not belong to member');
  END IF;

  DELETE FROM ticket_checkins WHERE ticket_id = p_ticket_id;
  DELETE FROM tickets WHERE id = p_ticket_id;

  RETURN jsonb_build_object('success', true, 'message', 'Ticket deleted successfully');

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', 'Error deleting ticket: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION delete_member_ticket(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION delete_member_ticket(uuid, text) TO authenticated;
