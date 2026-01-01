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
import {
    generateCoachInsight,
    generateReflectionPrompts,
    generateGreeting,
    generateDaySummary,
    generateEncouragement,
    generateContextAwareGreeting,
    generateChatResponse,
    extractUserContext,
    generateConversationSummary,
    generateCheckIn
} from './agents/coachAgent.js';
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
// COACH ENDPOINTS
// ============================================

// Get AI-generated greeting
app.get('/api/coach/greeting', async (req, res) => {
    try {
        const { timeOfDay } = req.query;
        const result = await generateGreeting(timeOfDay || 'afternoon');
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get AI-generated day summary
app.post('/api/coach/day-summary', async (req, res) => {
    try {
        const { dayData } = req.body;
        const result = await generateDaySummary(dayData);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get AI-generated encouragement
app.get('/api/coach/encouragement', async (req, res) => {
    try {
        const context = req.query.context ? JSON.parse(req.query.context) : {};
        const result = await generateEncouragement(context);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get AI-generated coach insight
app.post('/api/coach/insight', async (req, res) => {
    try {
        const { currentWeekSummary, historicalSummaries } = req.body;
        const result = await generateCoachInsight(currentWeekSummary, historicalSummaries || []);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get context-aware greeting
app.get('/api/coach/greeting/contextual', authenticateToken, async (req, res) => {
    try {
        const { timeOfDay } = req.query;
        const masterKey = getMasterKey();

        // Fetch today's calendar events
        const today = new Date().toISOString().split('T')[0];
        const { data: calendarData } = await supabase
            .from('calendar_events')
            .select('*')
            .eq('user_id', req.userId)
            .eq('event_date', today);

        const calendarEvents = (calendarData || []).map(event => {
            try {
                const decrypted = decryptData(JSON.parse(event.title_encrypted), masterKey);
                return {
                    type: event.event_type,
                    title: decrypted,
                    time: event.event_time
                };
            } catch {
                return null;
            }
        }).filter(Boolean);

        // Fetch user context
        const { data: contextData } = await supabase
            .from('coach_context')
            .select('*')
            .eq('user_id', req.userId);

        const userContext = (contextData || []).map(ctx => {
            try {
                const decrypted = decryptData(JSON.parse(ctx.context_encrypted), masterKey);
                return {
                    type: ctx.context_type,
                    detail: decrypted
                };
            } catch {
                return null;
            }
        }).filter(Boolean);

        const result = await generateContextAwareGreeting(timeOfDay || 'afternoon', calendarEvents, userContext);
        res.json(result);
    } catch (error) {
        console.error('Contextual greeting error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// CHAT ENDPOINTS
// ============================================

// Send chat message and get response
app.post('/api/coach/chat', authenticateToken, async (req, res) => {
    try {
        const { message, sessionId } = req.body;
        const masterKey = getMasterKey();
        const currentSessionId = sessionId || crypto.randomUUID();

        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message required'
            });
        }

        // Fetch conversation history (last 7 days)
        const { data: historyData } = await supabase
            .from('coach_conversations')
            .select('*')
            .eq('user_id', req.userId)
            .eq('session_id', currentSessionId)
            .order('created_at', { ascending: true });

        const conversationHistory = (historyData || []).map(msg => {
            try {
                const decrypted = decryptData(JSON.parse(msg.message_encrypted), masterKey);
                return {
                    role: msg.role,
                    content: decrypted,
                    timestamp: msg.created_at
                };
            } catch {
                return null;
            }
        }).filter(Boolean);

        // Fetch user context
        const { data: contextData } = await supabase
            .from('coach_context')
            .select('*')
            .eq('user_id', req.userId);

        const userContext = (contextData || []).map(ctx => {
            try {
                const decrypted = decryptData(JSON.parse(ctx.context_encrypted), masterKey);
                return {
                    type: ctx.context_type,
                    detail: decrypted
                };
            } catch {
                return null;
            }
        }).filter(Boolean);

        // Fetch recent calendar events
        const today = new Date().toISOString().split('T')[0];
        const { data: calendarData } = await supabase
            .from('calendar_events')
            .select('*')
            .eq('user_id', req.userId)
            .gte('event_date', today)
            .limit(10);

        const calendarEvents = (calendarData || []).map(event => {
            try {
                const decrypted = decryptData(JSON.parse(event.title_encrypted), masterKey);
                return { title: decrypted, date: event.event_date };
            } catch {
                return null;
            }
        }).filter(Boolean);

        // Generate response
        const result = await generateChatResponse(message, conversationHistory, userContext, calendarEvents);

        // Store user message
        const encryptedUserMsg = encryptData(message, masterKey);
        await supabase.from('coach_conversations').insert({
            user_id: req.userId,
            session_id: currentSessionId,
            message_encrypted: JSON.stringify(encryptedUserMsg),
            role: 'user'
        });

        // Store coach response (if not auto-end)
        if (result.response) {
            const encryptedCoachMsg = encryptData(result.response, masterKey);
            await supabase.from('coach_conversations').insert({
                user_id: req.userId,
                session_id: currentSessionId,
                message_encrypted: JSON.stringify(encryptedCoachMsg),
                role: 'coach'
            });
        }

        // Extract and store any new context from user message
        const contextResult = await extractUserContext(message, userContext);
        if (contextResult.contexts && contextResult.contexts.length > 0) {
            for (const ctx of contextResult.contexts) {
                const encryptedContext = encryptData(ctx.detail, masterKey);
                await supabase.from('coach_context').insert({
                    user_id: req.userId,
                    context_type: ctx.type,
                    context_encrypted: JSON.stringify(encryptedContext),
                    source: 'chat'
                });
            }
        }

        // If auto-end, generate and store summary
        if (result.autoEnd) {
            const allHistory = [...conversationHistory, { role: 'user', content: message }];
            const summaryResult = await generateConversationSummary(allHistory);

            // Store summary in timeline_events
            const encryptedSummary = encryptData(summaryResult, masterKey);
            await supabase.from('timeline_events').insert({
                user_id: req.userId,
                event_date: today,
                event_type: 'conversation_summary',
                event_data_encrypted: JSON.stringify(encryptedSummary),
                source_integration: 'coach_chat'
            });

            result.summary = summaryResult;
        }

        res.json({
            ...result,
            sessionId: currentSessionId
        });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get chat history
app.get('/api/coach/chat/history', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.query;
        const masterKey = getMasterKey();

        let query = supabase
            .from('coach_conversations')
            .select('*')
            .eq('user_id', req.userId)
            .order('created_at', { ascending: true });

        if (sessionId) {
            query = query.eq('session_id', sessionId);
        }

        const { data, error } = await query;
        if (error) throw error;

        const messages = (data || []).map(msg => {
            try {
                const decrypted = decryptData(JSON.parse(msg.message_encrypted), masterKey);
                return {
                    id: msg.id,
                    sessionId: msg.session_id,
                    role: msg.role,
                    content: decrypted,
                    timestamp: msg.created_at
                };
            } catch {
                return null;
            }
        }).filter(Boolean);

        res.json({
            success: true,
            messages,
            count: messages.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// End chat session and generate summary
app.post('/api/coach/chat/end', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.body;
        const masterKey = getMasterKey();
        const today = new Date().toISOString().split('T')[0];

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Session ID required'
            });
        }

        // Fetch conversation history
        const { data: historyData } = await supabase
            .from('coach_conversations')
            .select('*')
            .eq('user_id', req.userId)
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        const conversationHistory = (historyData || []).map(msg => {
            try {
                const decrypted = decryptData(JSON.parse(msg.message_encrypted), masterKey);
                return {
                    role: msg.role,
                    content: decrypted
                };
            } catch {
                return null;
            }
        }).filter(Boolean);

        // Generate summary
        const summaryResult = await generateConversationSummary(conversationHistory);

        // Store summary in timeline_events
        const encryptedSummary = encryptData(summaryResult, masterKey);
        await supabase.from('timeline_events').insert({
            user_id: req.userId,
            event_date: today,
            event_type: 'conversation_summary',
            event_data_encrypted: JSON.stringify(encryptedSummary),
            source_integration: 'coach_chat'
        });

        res.json({
            success: true,
            summary: summaryResult
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// CONTEXT ENDPOINTS
// ============================================

// Get user context (what coach remembers)
app.get('/api/coach/context', authenticateToken, async (req, res) => {
    try {
        const masterKey = getMasterKey();

        const { data, error } = await supabase
            .from('coach_context')
            .select('*')
            .eq('user_id', req.userId)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        const contexts = (data || []).map(ctx => {
            try {
                const decrypted = decryptData(JSON.parse(ctx.context_encrypted), masterKey);
                return {
                    id: ctx.id,
                    type: ctx.context_type,
                    detail: decrypted,
                    source: ctx.source,
                    updatedAt: ctx.updated_at
                };
            } catch {
                return null;
            }
        }).filter(Boolean);

        res.json({
            success: true,
            contexts,
            count: contexts.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Delete context item
app.delete('/api/coach/context/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('coach_context')
            .delete()
            .eq('id', id)
            .eq('user_id', req.userId);

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// CALENDAR ENDPOINTS
// ============================================

// Get calendar events
app.get('/api/calendar/events', authenticateToken, async (req, res) => {
    try {
        const { start, end } = req.query;
        const masterKey = getMasterKey();

        let query = supabase
            .from('calendar_events')
            .select('*')
            .eq('user_id', req.userId)
            .order('event_date', { ascending: true });

        if (start) query = query.gte('event_date', start);
        if (end) query = query.lte('event_date', end);

        const { data, error } = await query;
        if (error) throw error;

        const events = (data || []).map(event => {
            try {
                const decrypted = decryptData(JSON.parse(event.title_encrypted), masterKey);
                return {
                    id: event.id,
                    title: decrypted,
                    date: event.event_date,
                    time: event.event_time,
                    type: event.event_type,
                    source: event.source
                };
            } catch {
                return null;
            }
        }).filter(Boolean);

        res.json({
            success: true,
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

// Add calendar event
app.post('/api/calendar/events', authenticateToken, async (req, res) => {
    try {
        const { title, date, time, type } = req.body;
        const masterKey = getMasterKey();

        if (!title || !date) {
            return res.status(400).json({
                success: false,
                error: 'Title and date required'
            });
        }

        const encryptedTitle = encryptData(title, masterKey);

        const { data, error } = await supabase
            .from('calendar_events')
            .insert({
                user_id: req.userId,
                title_encrypted: JSON.stringify(encryptedTitle),
                event_date: date,
                event_time: time || null,
                event_type: type || 'reminder',
                source: 'manual'
            })
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            event: {
                id: data.id,
                title,
                date,
                time,
                type: type || 'reminder'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Delete calendar event
app.delete('/api/calendar/events/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('calendar_events')
            .delete()
            .eq('id', id)
            .eq('user_id', req.userId);

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// USER SETTINGS ENDPOINTS
// ============================================

// Get user settings
app.get('/api/user/settings', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', req.userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        res.json({
            success: true,
            settings: data || {
                proactive_notifications: false,
                notification_frequency: 'daily',
                google_calendar_connected: false
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Update user settings
app.put('/api/user/settings', authenticateToken, async (req, res) => {
    try {
        const { proactive_notifications, notification_frequency, google_calendar_connected } = req.body;

        const { data, error } = await supabase
            .from('user_settings')
            .upsert({
                user_id: req.userId,
                proactive_notifications: proactive_notifications ?? false,
                notification_frequency: notification_frequency ?? 'daily',
                google_calendar_connected: google_calendar_connected ?? false,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            settings: data
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
