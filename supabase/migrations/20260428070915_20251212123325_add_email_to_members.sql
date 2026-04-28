/*
  # Add Email to Members Table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'email'
  ) THEN
    ALTER TABLE members ADD COLUMN email text UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
  END IF;
END $$;
