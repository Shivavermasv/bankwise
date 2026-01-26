-- Run this SQL command in your PostgreSQL database to fix the profile_photo column type
-- WARNING: This will remove any existing data in the profile_photo column

ALTER TABLE users DROP COLUMN IF EXISTS profile_photo;
ALTER TABLE users ADD COLUMN profile_photo BYTEA;

