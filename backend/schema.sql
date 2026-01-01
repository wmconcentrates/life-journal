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
-- COACH CONVERSATIONS TABLE (7-day auto-expire)
-- ============================================
CREATE TABLE IF NOT EXISTS coach_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    message_encrypted TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'coach')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Indexes for performance
CREATE INDEX idx_coach_conversations_user ON coach_conversations(user_id);
CREATE INDEX idx_coach_conversations_session ON coach_conversations(user_id, session_id);
CREATE INDEX idx_coach_conversations_expires ON coach_conversations(expires_at);

-- Enable RLS
ALTER TABLE coach_conversations ENABLE ROW LEVEL SECURITY;

-- Users can only access their own conversations
CREATE POLICY "Users can view own conversations" ON coach_conversations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own conversations" ON coach_conversations
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own conversations" ON coach_conversations
    FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- COACH CONTEXT TABLE (permanent memory)
-- ============================================
CREATE TABLE IF NOT EXISTS coach_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    context_type TEXT NOT NULL,
    context_encrypted TEXT NOT NULL,
    source TEXT DEFAULT 'chat',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX idx_coach_context_user ON coach_context(user_id);
CREATE INDEX idx_coach_context_type ON coach_context(user_id, context_type);

-- Enable RLS
ALTER TABLE coach_context ENABLE ROW LEVEL SECURITY;

-- Users can only access their own context
CREATE POLICY "Users can view own context" ON coach_context
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own context" ON coach_context
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own context" ON coach_context
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own context" ON coach_context
    FOR DELETE USING (user_id = auth.uid());

-- Apply updated_at trigger
CREATE TRIGGER coach_context_updated_at
    BEFORE UPDATE ON coach_context
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================
-- CALENDAR EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title_encrypted TEXT NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME,
    event_type TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual',
    google_event_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_calendar_events_user ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_date ON calendar_events(user_id, event_date);
CREATE INDEX idx_calendar_events_google ON calendar_events(user_id, google_event_id);

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Users can only access their own events
CREATE POLICY "Users can view own calendar" ON calendar_events
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own calendar" ON calendar_events
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own calendar" ON calendar_events
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own calendar" ON calendar_events
    FOR DELETE USING (user_id = auth.uid());

-- Apply updated_at trigger
CREATE TRIGGER calendar_events_updated_at
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================
-- USER SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    proactive_notifications BOOLEAN DEFAULT false,
    notification_frequency TEXT DEFAULT 'daily',
    google_calendar_connected BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Users can only access their own settings
CREATE POLICY "Users can view own settings" ON user_settings
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own settings" ON user_settings
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own settings" ON user_settings
    FOR UPDATE USING (user_id = auth.uid());

-- Apply updated_at trigger
CREATE TRIGGER user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================
-- GRANT PERMISSIONS FOR NEW TABLES
-- ============================================
GRANT SELECT, INSERT, DELETE ON coach_conversations TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON coach_context TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON calendar_events TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON user_settings TO anon, authenticated;

-- ============================================
-- DONE
-- ============================================
-- After running this, your Supabase database is ready!
