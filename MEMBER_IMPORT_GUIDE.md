# Member Import Guide

This guide explains how to import members into the database for the NK Čelik app.

## Database Schema

Members are stored in the `members` table with the following fields:
- `id` (UUID) - Auto-generated
- `email` (text) - Member's email address
- `member_id` (text) - Membership number (used as password)
- `first_name` (text) - Member's first name
- `last_name` (text) - Member's last name
- `is_admin` (boolean) - Admin privileges flag
- `created_at` (timestamp) - Auto-generated
- `last_login_at` (timestamp) - Updated on login

## Login System

Members log in using:
- **Email**: The email address provided to the club
- **Password**: Their membership number (članski broj)

## How to Import Members

### Option 1: Using Supabase Dashboard

1. Log into your Supabase dashboard
2. Navigate to the Table Editor
3. Select the `members` table
4. Click "Insert" and add each member with:
   - email
   - member_id (their membership number)
   - first_name
   - last_name
   - is_admin (true/false)

### Option 2: Using SQL Insert

Execute SQL queries in the Supabase SQL Editor:

```sql
INSERT INTO members (email, member_id, first_name, last_name, is_admin)
VALUES
  ('john.doe@example.com', '12345', 'John', 'Doe', false),
  ('jane.smith@example.com', '67890', 'Jane', 'Smith', false),
  ('admin@nkcelik.com', 'admin123', 'Admin', 'User', true);
```

### Option 3: Bulk Import via CSV

1. Prepare a CSV file with columns: `email`, `member_id`, `first_name`, `last_name`, `is_admin`
2. In Supabase Dashboard, go to the `members` table
3. Click "Insert" > "Import from CSV"
4. Upload your CSV file

## Example CSV Format

```csv
email,member_id,first_name,last_name,is_admin
john.doe@example.com,12345,John,Doe,false
jane.smith@example.com,67890,Jane,Smith,false
admin@nkcelik.com,admin123,Admin,User,true
```

## Important Notes

- **Email must be unique** - Each member needs a unique email address
- **member_id is stored as plain text** - This is the password members will use to log in
- **Passwords are not hashed** - For simplicity, membership numbers are stored and compared directly
- **Admin privileges** - Set `is_admin` to `true` for users who should be able to create polls and access admin features

## Security Considerations

Currently, passwords (membership numbers) are stored in plain text. This is acceptable for:
- Internal club applications
- When membership numbers are not sensitive
- Small user bases with controlled access

If you need stronger security, consider implementing password hashing in the future.
