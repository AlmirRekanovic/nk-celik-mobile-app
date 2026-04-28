/*
  # Add Member Context Function
*/

CREATE OR REPLACE FUNCTION set_member_context(member_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_member_id', member_id, true);
END;
$$;
