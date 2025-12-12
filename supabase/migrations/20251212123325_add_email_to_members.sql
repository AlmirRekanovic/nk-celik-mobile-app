/*
  # Add Email to Members Table

  1. Changes
    - Add `email` column to `members` table
    - Email is unique and used to match WooCommerce purchases
    - Add index for faster email lookups

  2. Security
    - No changes to RLS policies needed
    - Email field follows same access rules as other member fields
*/

-- Add email column to members table if it doesn't exist
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