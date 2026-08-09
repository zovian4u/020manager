-- Create alliance_announcements table in Supabase for permanent storage across Render bot restarts/re-deploys
CREATE TABLE IF NOT EXISTS alliance_announcements (
    id TEXT PRIMARY KEY,
    guild_id TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_channel_id TEXT NOT NULL,
    type TEXT NOT NULL,
    execute_at TIMESTAMP WITH TIME ZONE,
    interval_minutes INTEGER,
    cron_expression TEXT,
    role_ping TEXT DEFAULT 'everyone',
    image_url TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    active BOOLEAN DEFAULT TRUE,
    is_new_creation BOOLEAN DEFAULT FALSE
);

-- Disable Row Level Security (RLS) for server-side service role access
ALTER TABLE alliance_announcements DISABLE ROW LEVEL SECURITY;
