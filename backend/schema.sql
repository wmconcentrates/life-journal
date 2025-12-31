-- Life Journal MVP Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- USER CREDENTIALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    integration TEXT NOT NULL,
    encrypted_token TEXT,
    token_type TEXT DEFAULT 'access',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_used TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    UNIQUE(user_id, integration)
);

-- Index for faster lookups
CREATE INDEX idx_user_credentials_user_id ON user_credentials(user_id);
CREATE INDEX idx_user_credentials_integration ON user_credentials(user_id, integration);

-- Enable RLS
ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;

-- Users can only access their own credentials
CREATE POLICY "Users can view own credentials" ON user_credentials
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own credentials" ON user_credentials
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own credentials" ON user_credentials
    FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- TIMELINE EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_date DATE NOT NULL,
    event_type TEXT NOT NULL,
    event_data_encrypted TEXT NOT NULL,
    source_integration TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_timeline_events_user_id ON timeline_events(user_id);
CREATE INDEX idx_timeline_events_date ON timeline_events(user_id, event_date);
CREATE INDEX idx_timeline_events_type ON timeline_events(user_id, event_type);

-- Enable RLS
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

-- Users can only access their own events
CREATE POLICY "Users can view own events" ON timeline_events
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own events" ON timeline_events
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own events" ON timeline_events
    FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- THERAPY SUMMARIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS therapy_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    encrypted_summary TEXT NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    recalled_at TIMESTAMPTZ,
    UNIQUE(user_id, week_number)
);

-- Index for week number lookups
CREATE INDEX idx_therapy_summaries_user_week ON therapy_summaries(user_id, week_number);

-- Enable RLS
ALTER TABLE therapy_summaries ENABLE ROW LEVEL SECURITY;

-- Users can only access their own summaries
CREATE POLICY "Users can view own summaries" ON therapy_summaries
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own summaries" ON therapy_summaries
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own summaries" ON therapy_summaries
    FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- COACH INSIGHTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS coach_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    insight TEXT NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, week_number)
);

-- Enable RLS
ALTER TABLE coach_insights ENABLE ROW LEVEL SECURITY;

-- Users can only access their own insights
CREATE POLICY "Users can view own insights" ON coach_insights
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own insights" ON coach_insights
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================
-- RECAP REELS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS recap_reels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    period TEXT NOT NULL,
    video_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE recap_reels ENABLE ROW LEVEL SECURITY;

-- Users can only access their own reels
CREATE POLICY "Users can view own reels" ON recap_reels
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own reels" ON recap_reels
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================
-- HELPER FUNCTION: Update timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users table
CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Apply trigger to user_credentials table
CREATE TRIGGER user_credentials_updated_at
    BEFORE UPDATE ON user_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================
-- GRANT PERMISSIONS (for anon/authenticated roles)
-- ============================================
-- These allow the app to interact with tables via Supabase client

GRANT SELECT, INSERT, UPDATE ON users TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_credentials TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON timeline_events TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON therapy_summaries TO anon, authenticated;
GRANT SELECT, INSERT ON coach_insights TO anon, authenticated;
GRANT SELECT, INSERT ON recap_reels TO anon, authenticated;

-- ============================================
-- DONE
-- ============================================
-- After running this, your Supabase database is ready!
