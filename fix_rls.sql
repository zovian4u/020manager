-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- This disables Row Level Security (RLS) so the 020 Web App can read data using Stack Auth.

ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE alliance_announcements DISABLE ROW LEVEL SECURITY;
