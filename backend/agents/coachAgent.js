// Coach Agent - Life coaching insights with McConaughey/Dude persona
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

// The Coach Persona - Matthew McConaughey meets The Dude
const COACH_PERSONA = `You are a life coach with the personality of Matthew McConaughey mixed with The Dude from The Big Lebowski.

YOUR VOICE:
- Laid-back, genuine, encouraging
- Use casual phrases like "alright alright alright", "that's beautiful, man", "the dude abides"
- Make the user feel good about themselves without being cheesy
- Speak like a cool, wise friend who's genuinely happy to see them
- Philosophical but not preachy - more "zen surfer" than "motivational speaker"
- Occasionally reference life as a journey, a garden, or a ride
- Keep it real and grounded, not overly enthusiastic

EXAMPLE PHRASES YOU MIGHT USE:
- "Hey man, you crushed it this week. Take a breath, you earned it."
- "Alright alright alright... look at you showing up."
- "The Dude would be proud. You kept it real."
- "That's beautiful, man. That's what it's all about."
- "Life's a garden, dig it? And you're planting good seeds."
- "Sometimes you gotta slow down to speed up, you know what I mean?"

NEVER:
- Be preachy or give unsolicited advice
- Use corporate motivational language
- Sound like a generic life coach
- Be overly enthusiastic or fake`;

const COACH_INSIGHT_PROMPT = `${COACH_PERSONA}

You're checking in on someone's week. You have their life data below.

Generate a 2-3 sentence insight that:
1. Acknowledges something specific from their week
2. Makes them feel good about showing up
3. Sounds exactly like our laid-back coach persona

Keep it short, warm, and genuine. No bullet points or structure - just talk to them like a friend.`;

const GREETING_PROMPT = `${COACH_PERSONA}

Generate a short greeting (1-2 sentences max) for someone opening the app.

Time of day: {timeOfDay}

Make it:
- Warm and personal
- Match the time of day naturally
- Sound like you're genuinely happy to see them
- End with something encouraging

Just the greeting, nothing else.`;

const DAY_SUMMARY_PROMPT = `${COACH_PERSONA}

Someone is looking at a specific day from their calendar. Here's what they did:

{dayData}

Give them a quick 1-2 sentence reaction to their day. Be specific to what they actually did. Make them feel good about it. Sound like our laid-back coach.

Just the reaction, nothing else.`;

// Generate coach insight from current week + history
export const generateCoachInsight = async (currentWeekSummary, historicalSummaries = []) => {
    console.log(`[CoachAgent] Generating insight with ${historicalSummaries.length} weeks of history`);

    if (!currentWeekSummary) {
        return {
            success: true,
            insight: "Hey man, welcome to the journey. Once you've got a week under your belt, I'll have some real talk for you. Just keep showing up, that's all that matters."
        };
    }

    try {
        const client = getClient();

        const contextData = {
            currentWeek: currentWeekSummary,
            history: historicalSummaries.slice(0, 12)
        };

        const message = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 300,
            messages: [
                {
                    role: 'user',
                    content: `${COACH_INSIGHT_PROMPT}\n\nData:\n${JSON.stringify(contextData, null, 2)}`
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
            insight: "Hey man, the universe is being a little weird right now. Check back in a bit."
        };
    }
};

// Generate time-based greeting
export const generateGreeting = async (timeOfDay = 'afternoon') => {
    console.log(`[CoachAgent] Generating ${timeOfDay} greeting`);

    try {
        const client = getClient();

        const prompt = GREETING_PROMPT.replace('{timeOfDay}', timeOfDay);

        const message = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 100,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        });

        const greeting = message.content[0].type === 'text' ? message.content[0].text : '';

        return {
            success: true,
            greeting: greeting.trim()
        };
    } catch (error) {
        console.error('[CoachAgent] Greeting error:', error.message);
        // Fallback greetings
        const fallbacks = {
            morning: "Rise and shine, buddy. Let's make today count.",
            afternoon: "Afternoon, my friend. You're doing better than you think.",
            evening: "Evening, brother. Take a moment to appreciate the day."
        };
        return {
            success: true,
            greeting: fallbacks[timeOfDay] || fallbacks.afternoon
        };
    }
};

// Generate day summary reaction
export const generateDaySummary = async (dayData) => {
    console.log('[CoachAgent] Generating day summary');

    if (!dayData || Object.keys(dayData).length === 0) {
        return {
            success: true,
            summary: "A quiet day, man. Sometimes those are the best ones. The Dude abides."
        };
    }

    try {
        const client = getClient();

        const prompt = DAY_SUMMARY_PROMPT.replace('{dayData}', JSON.stringify(dayData, null, 2));

        const message = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 150,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        });

        const summary = message.content[0].type === 'text' ? message.content[0].text : '';

        return {
            success: true,
            summary: summary.trim()
        };
    } catch (error) {
        console.error('[CoachAgent] Day summary error:', error.message);
        return {
            success: true,
            summary: "Alright alright alright... looks like you had a day worth remembering."
        };
    }
};

// Generate encouragement based on activity
export const generateEncouragement = async (context = {}) => {
    console.log('[CoachAgent] Generating encouragement');

    try {
        const client = getClient();

        const message = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 100,
            messages: [
                {
                    role: 'user',
                    content: `${COACH_PERSONA}\n\nGenerate a single encouraging sentence for someone checking their life journal app. Context: ${JSON.stringify(context)}\n\nJust the encouragement, 1 sentence max.`
                }
            ]
        });

        const encouragement = message.content[0].type === 'text' ? message.content[0].text : '';

        return {
            success: true,
            encouragement: encouragement.trim()
        };
    } catch (error) {
        console.error('[CoachAgent] Encouragement error:', error.message);
        return {
            success: true,
            encouragement: "You're doing better than you think. Trust me on that one."
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

    const { error } = await supabase
        .from('coach_insights')
        .upsert(record, { onConflict: 'user_id,week_number' });

    if (error) {
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

// Generate quick reflection prompts (with persona)
export const generateReflectionPrompts = (summary) => {
    const prompts = [
        "What moment from this week made you smile, man?",
        "If you could do one thing differently, what would it be? No judgment.",
        "What gave you energy? What took it away?",
        "Who made your week a little brighter?",
        "What's one small win you want to celebrate?"
    ];

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
