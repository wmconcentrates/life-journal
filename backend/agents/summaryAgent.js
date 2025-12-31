// Summary Generation Agent
import Anthropic from '@anthropic-ai/sdk';
import { encryptData } from '../utils/encryption.js';
import { getMasterKey } from '../utils/keyManagement.js';

let anthropicClient = null;

const getClient = () => {
    if (!anthropicClient) {
        anthropicClient = new Anthropic({
            apiKey: process.env.CLAUDE_API_KEY
        });
    }
    return anthropicClient;
};

const SUMMARY_PROMPT = `Generate a brief summary (100-150 words) of this week's life data.

Include observations about:
- Activity level and movement patterns
- Spending trends (categories, not specific amounts)
- Locations visited and time distribution
- Any notable patterns or changes

IMPORTANT PRIVACY RULES:
- EXCLUDE specific dollar amounts (use "moderate spending" or "higher than usual")
- EXCLUDE exact addresses (use neighborhood names or "home", "work")
- EXCLUDE full names of people or businesses
- Be warm and observational, like a supportive friend

Format: Write in second person ("You visited..." "Your week included...")`;

// Generate weekly summary from timeline events
export const generateWeeklySummary = async (events) => {
    console.log(`[SummaryAgent] Generating summary from ${events.length} events`);

    if (events.length === 0) {
        return {
            success: true,
            summary: "No activity data available for this week. Once you connect your accounts and sync data, you'll see a personalized summary here."
        };
    }

    // Prepare event data for Claude
    const eventSummary = prepareEventSummary(events);

    try {
        const client = getClient();

        const message = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 500,
            messages: [
                {
                    role: 'user',
                    content: `${SUMMARY_PROMPT}\n\nWeek's data:\n${JSON.stringify(eventSummary, null, 2)}`
                }
            ]
        });

        const summary = message.content[0].type === 'text' ? message.content[0].text : '';

        console.log('[SummaryAgent] Summary generated successfully');
        return {
            success: true,
            summary: summary.trim()
        };
    } catch (error) {
        console.error('[SummaryAgent] Error:', error.message);
        return {
            success: false,
            error: error.message,
            summary: null
        };
    }
};

// Prepare anonymized event summary for Claude
const prepareEventSummary = (events) => {
    const locations = events.filter(e => e.type === 'location');
    const purchases = events.filter(e => e.type === 'purchase');

    // Anonymize location data
    const locationSummary = locations.map(loc => ({
        place: loc.data.place || 'Unknown',
        duration_hours: Math.round((loc.data.duration_minutes || 0) / 60 * 10) / 10,
        time_of_day: getTimeOfDay(loc.timestamp)
    }));

    // Anonymize purchase data
    const purchaseSummary = {
        total_orders: purchases.length,
        categories: [...new Set(purchases.map(p => p.data.category))],
        spending_level: categorizeSpending(purchases)
    };

    return {
        period: {
            start: events[0]?.timestamp?.split('T')[0] || 'unknown',
            end: events[events.length - 1]?.timestamp?.split('T')[0] || 'unknown'
        },
        locations: locationSummary,
        spending: purchaseSummary,
        total_events: events.length
    };
};

const getTimeOfDay = (timestamp) => {
    const hour = new Date(timestamp).getHours();
    if (hour < 6) return 'early morning';
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
};

const categorizeSpending = (purchases) => {
    const total = purchases.reduce((sum, p) => sum + (p.data.amount || 0), 0);
    if (total === 0) return 'none';
    if (total < 100) return 'light';
    if (total < 300) return 'moderate';
    if (total < 500) return 'notable';
    return 'significant';
};

// Store summary in database
export const storeSummary = async (supabase, userId, weekNumber, summary) => {
    const masterKey = getMasterKey();
    const encrypted = encryptData({ summary }, masterKey);

    const record = {
        user_id: userId,
        week_number: weekNumber,
        encrypted_summary: JSON.stringify(encrypted),
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    };

    const { error } = await supabase
        .from('therapy_summaries')
        .upsert(record, { onConflict: 'user_id,week_number' });

    if (error) throw error;
    return { success: true };
};

// Get current week number
export const getWeekNumber = (date = new Date()) => {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
};
