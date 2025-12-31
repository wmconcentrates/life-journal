// Weekly Sync Orchestration
import { googleMapsAgent } from '../agents/googleMapsAgent.js';
import { amazonAgent } from '../agents/amazonAgent.js';
import { normalizeData, validateNormalizedEvents } from '../agents/claudeNormalizer.js';
import { getCredentialLocal } from '../utils/credentialVault.js';
import { encryptData } from '../utils/encryption.js';
import { getMasterKey } from '../utils/keyManagement.js';

// Get date range for the past week
export const getWeekDateRange = (weeksAgo = 0) => {
    const end = new Date();
    end.setDate(end.getDate() - (weeksAgo * 7));

    const start = new Date(end);
    start.setDate(start.getDate() - 7);

    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
    };
};

// Sync user data from all integrations
export const syncUserData = async (supabase, userId, dateRange) => {
    console.log(`[WeeklySync] Starting sync for user ${userId}`);
    console.log(`[WeeklySync] Date range: ${dateRange.start} to ${dateRange.end}`);

    const results = {
        success: true,
        eventsAdded: 0,
        errors: [],
        sources: {}
    };

    // Run agents in parallel
    const agentPromises = [
        runAgent('google_maps', googleMapsAgent, userId, dateRange),
        runAgent('amazon', amazonAgent, userId, dateRange)
    ];

    const agentResults = await Promise.allSettled(agentPromises);

    // Process results
    let allEvents = [];

    agentResults.forEach((result, index) => {
        const sourceName = ['google_maps', 'amazon'][index];

        if (result.status === 'fulfilled' && result.value.success) {
            const { events } = result.value;
            allEvents = allEvents.concat(events);
            results.sources[sourceName] = {
                success: true,
                count: events.length
            };
        } else {
            const errorMsg = result.status === 'rejected'
                ? result.reason.message
                : result.value.error;

            results.errors.push(`${sourceName}: ${errorMsg}`);
            results.sources[sourceName] = {
                success: false,
                error: errorMsg
            };
        }
    });

    // Validate all events
    const validation = validateNormalizedEvents(allEvents);
    if (!validation.valid) {
        console.warn('[WeeklySync] Validation warnings:', validation.errors);
    }

    // Store events in database
    if (allEvents.length > 0 && supabase) {
        const storeResult = await storeTimelineEvents(supabase, userId, allEvents);
        results.eventsAdded = storeResult.count;
        if (storeResult.error) {
            results.errors.push(`Storage: ${storeResult.error}`);
        }
    } else {
        results.eventsAdded = allEvents.length;
    }

    results.success = results.errors.length === 0;
    console.log(`[WeeklySync] Completed: ${results.eventsAdded} events, ${results.errors.length} errors`);

    return results;
};

// Run a single agent
const runAgent = async (sourceName, agentFn, userId, dateRange) => {
    try {
        // Get credentials (for MVP, use mock token)
        const token = getCredentialLocal(userId, sourceName) || 'mock-token';

        // Run agent
        const result = await agentFn(token, dateRange);

        if (!result.success) {
            throw new Error(result.error || 'Agent failed');
        }

        // Normalize data through Claude if needed
        const normalizedEvents = await normalizeData(sourceName, result.events);

        return {
            success: true,
            events: normalizedEvents
        };
    } catch (error) {
        console.error(`[WeeklySync] Agent ${sourceName} failed:`, error.message);
        return {
            success: false,
            error: error.message,
            events: []
        };
    }
};

// Store timeline events in Supabase
const storeTimelineEvents = async (supabase, userId, events) => {
    try {
        const masterKey = getMasterKey();

        const records = events.map(event => {
            const encrypted = encryptData(event.data, masterKey);
            return {
                user_id: userId,
                event_date: event.timestamp.split('T')[0],
                event_type: event.type,
                event_data_encrypted: JSON.stringify(encrypted),
                source_integration: event.source,
                created_at: new Date().toISOString()
            };
        });

        const { error } = await supabase
            .from('timeline_events')
            .insert(records);

        if (error) throw error;

        return { count: records.length, error: null };
    } catch (error) {
        console.error('[WeeklySync] Storage error:', error.message);
        return { count: 0, error: error.message };
    }
};

// Sync for local testing (without Supabase)
export const syncUserDataLocal = async (userId, dateRange) => {
    return syncUserData(null, userId, dateRange);
};

// Get all events for a user in a date range
export const getTimelineEvents = async (supabase, userId, dateRange) => {
    const { data, error } = await supabase
        .from('timeline_events')
        .select('*')
        .eq('user_id', userId)
        .gte('event_date', dateRange.start)
        .lte('event_date', dateRange.end)
        .order('event_date', { ascending: true });

    if (error) throw error;

    // Decrypt event data
    const masterKey = getMasterKey();
    return data.map(record => {
        const encrypted = JSON.parse(record.event_data_encrypted);
        const decryptedData = decryptData(encrypted, masterKey);
        return {
            id: record.id,
            type: record.event_type,
            timestamp: record.event_date,
            data: decryptedData,
            source: record.source_integration
        };
    });
};
