/*
  # Insert Admin User

  1. Purpose
    - Create an initial admin user for testing and management

  2. Admin Credentials
    - First Name: admin
    - Last Name: admin
    - Member ID: admin2025 (this is the password)
    - Admin privileges: Yes
*/

-- Insert admin user if not exists
INSERT INTO members (member_id, first_name, last_name, is_admin)
VALUES ('admin2025', 'admin', 'admin', true)
ON CONFLICT (member_id) DO NOTHING;
