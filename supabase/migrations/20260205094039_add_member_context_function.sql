/*
  # Add Member Context Function

  1. New Functions
    - `set_member_context` - Sets the current member ID in session context for RLS policies
  
  2. Purpose
    - Allows custom authentication to work with RLS policies
    - Used by push notification system and other features
*/

-- Create function to set member context
CREATE OR REPLACE FUNCTION set_member_context(member_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_member_id', member_id, true);
END;
$$;
