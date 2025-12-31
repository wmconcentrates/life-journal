import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

// Import modules
import { validateKeyOnStartup, getMasterKey } from './utils/keyManagement.js';
import { authenticateToken, generateToken } from './auth/jwtMiddleware.js';
import { handleGoogleAuth, handleMockAuth, getGoogleOAuthUrl } from './auth/googleAuth.js';
import { storeCredential, getCredential, storeCredentialLocal } from './utils/credentialVault.js';
import { googleMapsAgent, getLocationStats } from './agents/googleMapsAgent.js';
import { amazonAgent, getSpendingStats } from './agents/amazonAgent.js';
import { syncUserData, syncUserDataLocal, getWeekDateRange } from './sync/weeklySync.js';
import { generateWeeklySummary, getWeekNumber } from './agents/summaryAgent.js';
import { generateCoachInsight, generateReflectionPrompts } from './agents/coachAgent.js';
import { encryptData, decryptData } from './utils/encryption.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Initialize Claude
const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY
});

// Validate environment on startup
const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'CLAUDE_API_KEY',
    'JWT_SECRET',
    'ENCRYPTION_MASTER_KEY'
];

const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingEnvVars.length > 0) {
    console.error('Missing environment variables:', missingEnvVars);
    console.error('Please fill in your .env file');
    process.exit(1);
}

// Validate encryption key
if (!validateKeyOnStartup()) {
    process.exit(1);
}

// ============================================
// HEALTH & TEST ENDPOINTS
// ============================================

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

app.get('/api/test', async (req, res) => {
    try {
        // Test encryption
        const testData = { message: 'test' };
        const masterKey = getMasterKey();
        const encrypted = encryptData(testData, masterKey);
        const decrypted = decryptData(encrypted, masterKey);

        res.json({
            status: 'ok',
            encryption: decrypted.message === 'test' ? 'working' : 'failed',
            supabase: 'configured',
            claude: 'configured'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

// Get Google OAuth URL
app.get('/auth/google', (req, res) => {
    const redirectUri = req.query.redirect_uri || `${process.env.BACKEND_URL}/auth/callback/google`;
    const url = getGoogleOAuthUrl(redirectUri);
    res.json({ url });
});

// Google OAuth callback
app.post('/auth/callback/google', async (req, res) => {
    try {
        const { code, redirect_uri } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                error: 'Authorization code required',
                code: 'MISSING_CODE'
            });
        }

        const result = await handleGoogleAuth(supabase, code, redirect_uri);
        res.json(result);
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'AUTH_FAILED'
        });
    }
});

// Mock auth for testing
app.post('/auth/mock', async (req, res) => {
    try {
        const { email } = req.body;
        const result = await handleMockAuth(supabase, email || 'test@example.com');
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// SYNC ENDPOINTS
// ============================================

// Trigger data sync
app.post('/api/sync', authenticateToken, async (req, res) => {
    try {
        const { start, end } = req.body;
        const dateRange = (start && end)
            ? { start, end }
            : getWeekDateRange(0);

        const result = await syncUserData(supabase, req.userId, dateRange);
        res.json(result);
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'SYNC_FAILED'
        });
    }
});

// Test sync without auth (development only)
app.post('/api/sync/test', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Not available in production' });
    }

    try {
        const dateRange = getWeekDateRange(0);
        const result = await syncUserDataLocal('test-user', dateRange);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// TIMELINE ENDPOINTS
// ============================================

// Get timeline events
app.get('/api/timeline', authenticateToken, async (req, res) => {
    try {
        const { start, end } = req.query;
        const dateRange = (start && end)
            ? { start, end }
            : getWeekDateRange(0);

        const { data, error } = await supabase
            .from('timeline_events')
            .select('*')
            .eq('user_id', req.userId)
            .gte('event_date', dateRange.start)
            .lte('event_date', dateRange.end)
            .order('event_date', { ascending: true });

        if (error) throw error;

        // Decrypt event data
        const masterKey = getMasterKey();
        const events = data.map(record => {
            try {
                const encrypted = JSON.parse(record.event_data_encrypted);
                const decryptedData = decryptData(encrypted, masterKey);
                return {
                    id: record.id,
                    type: record.event_type,
                    timestamp: record.event_date,
                    data: decryptedData,
                    source: record.source_integration
                };
            } catch {
                return {
                    id: record.id,
                    type: record.event_type,
                    timestamp: record.event_date,
                    data: null,
                    source: record.source_integration
                };
            }
        });

        res.json({
            success: true,
            events,
            count: events.length,
            dateRange
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'TIMELINE_FETCH_FAILED'
        });
    }
});

// Get timeline for specific day
app.get('/api/timeline/:date', authenticateToken, async (req, res) => {
    try {
        const { date } = req.params;

        const { data, error } = await supabase
            .from('timeline_events')
            .select('*')
            .eq('user_id', req.userId)
            .eq('event_date', date)
            .order('created_at', { ascending: true });

        if (error) throw error;

        const masterKey = getMasterKey();
        const events = data.map(record => {
            try {
                const encrypted = JSON.parse(record.event_data_encrypted);
                const decryptedData = decryptData(encrypted, masterKey);
                return {
                    id: record.id,
                    type: record.event_type,
                    timestamp: record.event_date,
                    data: decryptedData,
                    source: record.source_integration
                };
            } catch {
                return null;
            }
        }).filter(Boolean);

        res.json({
            success: true,
            date,
            events,
            count: events.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// INSIGHTS ENDPOINTS
// ============================================

// Get weekly insight
app.get('/api/insights/weekly', authenticateToken, async (req, res) => {
    try {
        const dateRange = getWeekDateRange(0);

        // Get this week's events
        const { data: events } = await supabase
            .from('timeline_events')
            .select('*')
            .eq('user_id', req.userId)
            .gte('event_date', dateRange.start)
            .lte('event_date', dateRange.end);

        // Decrypt events
        const masterKey = getMasterKey();
        const decryptedEvents = (events || []).map(record => {
            try {
                const encrypted = JSON.parse(record.event_data_encrypted);
                return {
                    type: record.event_type,
                    timestamp: record.event_date,
                    data: decryptData(encrypted, masterKey),
                    source: record.source_integration
                };
            } catch {
                return null;
            }
        }).filter(Boolean);

        // Generate summary
        const summaryResult = await generateWeeklySummary(decryptedEvents);

        // Generate coach insight
        const coachResult = await generateCoachInsight(summaryResult.summary, []);

        // Generate reflection prompts
        const prompts = generateReflectionPrompts(summaryResult.summary);

        res.json({
            success: true,
            weekNumber: getWeekNumber(),
            dateRange,
            summary: summaryResult.summary,
            coachInsight: coachResult.insight,
            reflectionPrompts: prompts,
            eventCount: decryptedEvents.length
        });
    } catch (error) {
        console.error('Insights error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'INSIGHTS_FAILED'
        });
    }
});

// Test insights without auth
app.get('/api/insights/test', async (req, res) => {
    try {
        // Use test data
        const dateRange = { start: '2025-01-01', end: '2025-01-15' };

        const googleResult = await googleMapsAgent('test-token', dateRange);
        const amazonResult = await amazonAgent('test-token', dateRange);

        const allEvents = [
            ...(googleResult.events || []),
            ...(amazonResult.events || [])
        ];

        const summaryResult = await generateWeeklySummary(allEvents);
        const coachResult = await generateCoachInsight(summaryResult.summary, []);

        res.json({
            success: true,
            summary: summaryResult.summary,
            coachInsight: coachResult.insight,
            stats: {
                locations: getLocationStats(googleResult.events || []),
                spending: getSpendingStats(amazonResult.events || [])
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// CREDENTIAL MANAGEMENT
// ============================================

app.post('/api/credentials', authenticateToken, async (req, res) => {
    try {
        const { integration, token, tokenType } = req.body;

        if (!integration || !token) {
            return res.status(400).json({
                success: false,
                error: 'Integration and token required',
                code: 'MISSING_PARAMS'
            });
        }

        await storeCredential(supabase, req.userId, integration, token, tokenType);

        res.json({
            success: true,
            message: `Credential stored for ${integration}`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/credentials/:integration', authenticateToken, async (req, res) => {
    try {
        const { integration } = req.params;
        const token = await getCredential(supabase, req.userId, integration);

        res.json({
            success: true,
            hasCredential: !!token,
            integration
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// USER ENDPOINTS
// ============================================

app.get('/api/user', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, email, created_at')
            .eq('id', req.userId)
            .single();

        if (error) throw error;

        res.json({
            success: true,
            user: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        code: 'NOT_FOUND'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message,
        code: 'INTERNAL_ERROR'
    });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('');
    console.log('Available endpoints:');
    console.log(`  GET  /api/health          - Health check`);
    console.log(`  GET  /api/test            - Test connections`);
    console.log(`  GET  /auth/google         - Get OAuth URL`);
    console.log(`  POST /auth/callback/google - OAuth callback`);
    console.log(`  POST /auth/mock           - Mock auth (dev)`);
    console.log(`  POST /api/sync            - Sync data`);
    console.log(`  GET  /api/timeline        - Get timeline`);
    console.log(`  GET  /api/insights/weekly - Get weekly insights`);
    console.log(`  GET  /api/insights/test   - Test insights (dev)`);
});

export default app;
