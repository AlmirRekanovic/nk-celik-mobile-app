/*
  # Create Chat System Schema
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'chat_nickname'
  ) THEN
    ALTER TABLE members ADD COLUMN chat_nickname text UNIQUE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_member_id ON chat_messages(member_id);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read all messages" ON chat_messages;
CREATE POLICY "Members can read all messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    is_deleted = false AND
    EXISTS (SELECT 1 FROM members WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Members can send messages" ON chat_messages;
CREATE POLICY "Members can send messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id = auth.uid() AND
    EXISTS (SELECT 1 FROM members WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Members can update own messages" ON chat_messages;
CREATE POLICY "Members can update own messages"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (member_id = auth.uid())
  WITH CHECK (member_id = auth.uid());

DROP POLICY IF EXISTS "Members can delete own messages" ON chat_messages;
CREATE POLICY "Members can delete own messages"
  ON chat_messages FOR DELETE
  TO authenticated
  USING (member_id = auth.uid());

CREATE OR REPLACE FUNCTION generate_chat_nickname(p_first_name text, p_last_name text)
RETURNS text AS $$
DECLARE
  base_nickname text;
  final_nickname text;
  counter int := 0;
BEGIN
  base_nickname := lower(regexp_replace(p_first_name || p_last_name, '\s+', '', 'g'));
  final_nickname := base_nickname;
  WHILE EXISTS (SELECT 1 FROM members WHERE chat_nickname = final_nickname) LOOP
    counter := counter + 1;
    IF counter = 1 THEN
      final_nickname := base_nickname || 'celik';
    ELSE
      final_nickname := base_nickname || 'celik' || counter;
    END IF;
  END LOOP;
  RETURN final_nickname;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  member_record RECORD;
  new_nickname text;
BEGIN
  FOR member_record IN
    SELECT id, first_name, last_name FROM members WHERE chat_nickname IS NULL
  LOOP
    new_nickname := generate_chat_nickname(member_record.first_name, member_record.last_name);
    UPDATE members SET chat_nickname = new_nickname WHERE id = member_record.id;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION auto_generate_chat_nickname()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.chat_nickname IS NULL THEN
    NEW.chat_nickname := generate_chat_nickname(NEW.first_name, NEW.last_name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_generate_chat_nickname ON members;
CREATE TRIGGER trg_auto_generate_chat_nickname
  BEFORE INSERT ON members
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_chat_nickname();
