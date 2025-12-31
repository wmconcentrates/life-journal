// Coach Agent - Life coaching insights
import Anthropic from '@anthropic-ai/sdk';

let anthropicClient = null;

const getClient = () => {
    if (!anthropicClient) {
        anthropicClient = new Anthropic({
            apiKey: process.env.CLAUDE_API_KEY
        });
    }
    return anthropicClient;
};

const COACH_PROMPT = `You are a supportive life coach reviewing someone's week. You have summaries of their life data (location patterns, activity level, spending categories).

Generate a 3-paragraph insight:
1. ONE THING THEY DID WELL - Be specific and encouraging. Acknowledge positive patterns.
2. ONE PATTERN YOU NOTICED - Compare to their history if available. Be curious, not judgmental.
3. ONE SMALL SUGGESTION - Make it actionable and gentle. Not preachy or prescriptive.

TONE GUIDELINES:
- Be warm and personable, like a trusted friend
- Use "you" language
- Avoid generic advice - be specific to their data
- No cliches or motivational poster language
- Keep each paragraph 2-3 sentences max

If comparing to history: Note trends gently ("I noticed this week had more..." rather than "You should...")`;

// Generate coach insight from current week + history
export const generateCoachInsight = async (currentWeekSummary, historicalSummaries = []) => {
    console.log(`[CoachAgent] Generating insight with ${historicalSummaries.length} weeks of history`);

    if (!currentWeekSummary) {
        return {
            success: true,
            insight: "Welcome! Once you have a week of data, I'll share personalized insights about your patterns and progress. Check back soon!"
        };
    }

    try {
        const client = getClient();

        const contextData = {
            currentWeek: currentWeekSummary,
            history: historicalSummaries.slice(0, 12) // Last 12 weeks max
        };

        const message = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 600,
            messages: [
                {
                    role: 'user',
                    content: `${COACH_PROMPT}\n\nData:\n${JSON.stringify(contextData, null, 2)}`
                }
            ]
        });

        const insight = message.content[0].type === 'text' ? message.content[0].text : '';

        console.log('[CoachAgent] Insight generated successfully');
        return {
            success: true,
            insight: insight.trim()
        };
    } catch (error) {
        console.error('[CoachAgent] Error:', error.message);
        return {
            success: false,
            error: error.message,
            insight: null
        };
    }
};

// Store coach insight in database
export const storeInsight = async (supabase, userId, insight, weekNumber) => {
    const record = {
        user_id: userId,
        week_number: weekNumber,
        insight: insight,
        generated_at: new Date().toISOString()
    };

    // Store in a simple insights table or append to therapy_summaries
    const { error } = await supabase
        .from('coach_insights')
        .upsert(record, { onConflict: 'user_id,week_number' });

    if (error) {
        // Table might not exist, log but don't fail
        console.warn('[CoachAgent] Could not store insight:', error.message);
    }

    return { success: true };
};

// Get historical summaries for a user
export const getHistoricalSummaries = async (supabase, userId, weeksBack = 12) => {
    const currentWeek = getWeekNumber();

    const { data, error } = await supabase
        .from('therapy_summaries')
        .select('week_number, encrypted_summary')
        .eq('user_id', userId)
        .gte('week_number', currentWeek - weeksBack)
        .lt('week_number', currentWeek)
        .order('week_number', { ascending: false });

    if (error) {
        console.warn('[CoachAgent] Could not fetch history:', error.message);
        return [];
    }

    return data || [];
};

// Generate quick reflection prompts
export const generateReflectionPrompts = (summary) => {
    const prompts = [
        "What moment from this week are you most grateful for?",
        "If you could do one thing differently next week, what would it be?",
        "What gave you energy this week? What drained it?",
        "Who did you connect with this week that made you feel good?",
        "What's one small win you want to acknowledge?"
    ];

    // Shuffle and return 3
    return prompts
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
};

// Get current week number
const getWeekNumber = (date = new Date()) => {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
};
