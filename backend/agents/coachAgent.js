// Coach Agent - Life coaching insights with warm, grounded friend persona
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

// The Coach Persona - Warm, grounded friend
const COACH_PERSONA = `You are a life coach with the personality of a supportive friend who's good at helping people reflect on their lives.

YOUR VOICE:
- Warm, genuine, down-to-earth
- Talk like a trusted friend, not a coach or therapist
- Make the user feel good about themselves without being cheesy
- Keep it casual and conversational
- Thoughtful but not preachy
- Real and grounded


EXAMPLE PHRASES YOU MIGHT USE:
- "Hey, you showed up this week. That counts."
- "Not bad at all. Give yourself some credit."
- "That's solid work."
- "Some weeks are harder than others. You're still here."
- "Nice. Now go do something fun."
- "You're doing better than you think."

NEVER:
- Be preachy or give unsolicited advice
- Use corporate motivational language
- Sound like a generic life coach
- Be overly enthusiastic or fake
- Use catchphrases or movie references
- Say things like "alright alright alright", "the dude abides", "brother", "beautiful, man"`;

const COACH_INSIGHT_PROMPT = `${COACH_PERSONA}

You're checking in on someone's week. You have their life data below.

Generate a 2-3 sentence insight that:
1. Acknowledges something specific from their week
2. Makes them feel good about showing up
3. Sounds exactly like a supportive friend

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

Give them a quick 1-2 sentence reaction to their day. Be specific to what they actually did. Make them feel good about it. Sound like a supportive friend.

Just the reaction, nothing else.`;

// Generate coach insight from current week + history
export const generateCoachInsight = async (currentWeekSummary, historicalSummaries = []) => {
    console.log(`[CoachAgent] Generating insight with ${historicalSummaries.length} weeks of history`);

    if (!currentWeekSummary) {
        return {
            success: true,
            insight: "Welcome! Once you've got a week under your belt, I'll have some thoughts for you. Just keep showing up."
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
            insight: "Something's not working right now. Check back in a bit."
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
            morning: "Good morning. Ready to make today count?",
            afternoon: "Good afternoon. You're doing better than you think.",
            evening: "Evening. Take a moment to appreciate the day."
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
            summary: "A quiet day. Sometimes those are the best ones. Sometimes those are the best ones."
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
            summary: "Looks like you had a day worth remembering."
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

// Generate context-aware greeting based on calendar events and user context
export const generateContextAwareGreeting = async (timeOfDay = 'afternoon', calendarEvents = [], userContext = []) => {
    console.log(`[CoachAgent] Generating context-aware ${timeOfDay} greeting`);

    try {
        const client = getClient();

        const contextPrompt = `${COACH_PERSONA}

Generate a personalized greeting. Time of day: ${timeOfDay}

Today's calendar events:
${calendarEvents.length > 0 ? calendarEvents.map(e => `- ${e.type}: ${e.title}${e.time ? ` at ${e.time}` : ''}`).join('\n') : 'No events today'}

Things you remember about this person:
${userContext.length > 0 ? userContext.map(c => `- ${c.type}: ${c.detail}`).join('\n') : 'Nothing specific yet'}

Create a greeting that:
1. References ONE specific thing if available (meeting, birthday, health goal, etc.)
2. Is 1-2 sentences max
3. Feels natural and warm, not forced
4. Stays in character as the supportive friend

If no events or context, just give a warm time-based greeting.

Just the greeting, nothing else:`;

        const message = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 150,
            messages: [
                {
                    role: 'user',
                    content: contextPrompt
                }
            ]
        });

        const greeting = message.content[0].type === 'text' ? message.content[0].text : '';

        return {
            success: true,
            greeting: greeting.trim()
        };
    } catch (error) {
        console.error('[CoachAgent] Context greeting error:', error.message);
        // Fallback greetings
        const fallbacks = {
            morning: "Good morning. Ready to make today count?",
            afternoon: "Good afternoon. You're doing better than you think.",
            evening: "Evening. Take a moment to appreciate the day."
        };
        return {
            success: true,
            greeting: fallbacks[timeOfDay] || fallbacks.afternoon
        };
    }
};

// Generate chat response with conversation history and user context
export const generateChatResponse = async (userMessage, conversationHistory = [], userContext = [], calendarEvents = []) => {
    console.log(`[CoachAgent] Generating chat response (${conversationHistory.length} messages in history)`);

    const userMessageCount = conversationHistory.filter(m => m.role === 'user').length + 1;
    let usageLevel = 'normal';
    let usagePrompt = '';

    // Anti-overuse logic based on question count
    if (userMessageCount >= 20) {
        usageLevel = 'auto_end';
    } else if (userMessageCount >= 15) {
        usageLevel = 'strong';
        usagePrompt = "\n\nIMPORTANT: This is their 15+ message. Firmly but kindly suggest ending the chat. Say something like 'Hey, I think we've covered a lot. Go live a little and come back later.'";
    } else if (userMessageCount >= 10) {
        usageLevel = 'moderate';
        usagePrompt = "\n\nNote: They've sent 10+ messages. Gently suggest they might want to step away soon. Something like 'Hey, we've been at this a while. Sometimes the best answers come when you step away.'";
    } else if (userMessageCount >= 5) {
        usageLevel = 'soft';
        usagePrompt = "\n\nNote: After your response, you can subtly hint that reflection time is good too. Like 'Good talk. Maybe sit with that for a bit.'";
    }

    // Auto-end at 20 messages
    if (usageLevel === 'auto_end') {
        return {
            success: true,
            response: "Let's wrap up for now. We've had a good talk. Go be present out there. Come back tomorrow and tell me how it went.",
            messageCount: userMessageCount,
            usageLevel: 'auto_end',
            autoEnd: true
        };
    }

    try {
        const client = getClient();

        // Format conversation history
        const historyText = conversationHistory.map(m =>
            `${m.role === 'user' ? 'Them' : 'You'}: ${m.content}`
        ).join('\n');

        const chatPrompt = `${COACH_PERSONA}

You're having a conversation with someone who trusts you.

Things you remember about them:
${userContext.length > 0 ? userContext.map(c => `- ${c.type}: ${c.detail}`).join('\n') : 'Nothing specific yet - this is a new relationship'}

Their recent calendar:
${calendarEvents.length > 0 ? calendarEvents.slice(0, 5).map(e => `- ${e.title}`).join('\n') : 'No events'}

Conversation so far:
${historyText || '(This is the start of the conversation)'}

RULES:
1. Keep responses under 3 sentences unless they're opening up emotionally
2. Remember things they tell you and reference them naturally
3. Never give medical, legal, or financial advice - if they ask, say "That's above my pay grade. Maybe talk to someone qualified."
4. If they seem in crisis, encourage them to reach out to a professional
5. Be genuine, not preachy${usagePrompt}

Their message: "${userMessage}"

Your response (just the response, nothing else):`;

        const message = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 300,
            messages: [
                {
                    role: 'user',
                    content: chatPrompt
                }
            ]
        });

        const response = message.content[0].type === 'text' ? message.content[0].text : '';

        return {
            success: true,
            response: response.trim(),
            messageCount: userMessageCount,
            usageLevel
        };
    } catch (error) {
        console.error('[CoachAgent] Chat response error:', error.message);
        return {
            success: false,
            error: error.message,
            response: "Something's not working right now. Try again in a sec.",
            messageCount: userMessageCount,
            usageLevel
        };
    }
};

// Extract user context from a message (health, relationships, goals, etc.)
export const extractUserContext = async (message, existingContext = []) => {
    console.log('[CoachAgent] Extracting user context from message');

    try {
        const client = getClient();

        const extractPrompt = `Analyze this message and extract any personal context worth remembering:

Message: "${message}"

Existing context about this person:
${existingContext.length > 0 ? existingContext.map(c => `- ${c.type}: ${c.detail}`).join('\n') : 'None yet'}

Extract NEW information about:
- health: Physical or mental health mentions (e.g., "back pain", "feeling anxious")
- relationship: Family, friends, romantic (e.g., "sister getting married", "fight with partner")
- goal: Work or personal goals (e.g., "training for marathon", "starting new job")
- work: Job/career mentions (e.g., "big presentation tomorrow", "got promoted")
- preference: Likes/dislikes (e.g., "love hiking", "hate mornings")

Return as JSON only (no other text):
{
  "contexts": [
    {"type": "health", "detail": "mentioned back pain"},
    {"type": "relationship", "detail": "sister getting married in June"}
  ]
}

Only extract meaningful, SPECIFIC information. Return {"contexts": []} if nothing notable or just casual chat.`;

        const response = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 200,
            messages: [
                {
                    role: 'user',
                    content: extractPrompt
                }
            ]
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '{}';

        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                success: true,
                contexts: parsed.contexts || []
            };
        }

        return { success: true, contexts: [] };
    } catch (error) {
        console.error('[CoachAgent] Context extraction error:', error.message);
        return { success: true, contexts: [] };
    }
};

// Generate conversation summary when session ends
export const generateConversationSummary = async (conversationHistory) => {
    console.log(`[CoachAgent] Generating conversation summary (${conversationHistory.length} messages)`);

    if (!conversationHistory || conversationHistory.length < 2) {
        return {
            success: true,
            summary: "Brief check-in, nothing major discussed.",
            topics: [],
            actionItems: [],
            mood: "neutral"
        };
    }

    try {
        const client = getClient();

        const historyText = conversationHistory.map(m =>
            `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`
        ).join('\n');

        const summaryPrompt = `${COACH_PERSONA}

You just finished a conversation. Create a brief summary for their journal.

Conversation:
${historyText}

Generate a summary in JSON format (no other text):
{
  "summary": "2-3 sentence summary of what you talked about, written in first person as the coach",
  "topics": ["array", "of", "main", "topics"],
  "actionItems": ["things they mentioned wanting to do"],
  "mood": "one word: reflective, stressed, hopeful, anxious, happy, neutral, etc."
}`;

        const response = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 300,
            messages: [
                {
                    role: 'user',
                    content: summaryPrompt
                }
            ]
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '{}';

        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                success: true,
                summary: parsed.summary || "Had a good chat.",
                topics: parsed.topics || [],
                actionItems: parsed.actionItems || [],
                mood: parsed.mood || "neutral"
            };
        }

        return {
            success: true,
            summary: "Had a conversation with the coach.",
            topics: [],
            actionItems: [],
            mood: "neutral"
        };
    } catch (error) {
        console.error('[CoachAgent] Summary generation error:', error.message);
        return {
            success: true,
            summary: "Had a conversation with the coach.",
            topics: [],
            actionItems: [],
            mood: "neutral"
        };
    }
};

// Generate proactive check-in message
export const generateCheckIn = async (userContext = [], lastInteraction = null) => {
    console.log('[CoachAgent] Generating proactive check-in');

    try {
        const client = getClient();

        const daysSinceLastChat = lastInteraction
            ? Math.floor((Date.now() - new Date(lastInteraction).getTime()) / (1000 * 60 * 60 * 24))
            : null;

        const checkInPrompt = `${COACH_PERSONA}

Generate a short check-in message (push notification style, 1-2 sentences max).

Things you know about them:
${userContext.length > 0 ? userContext.map(c => `- ${c.type}: ${c.detail}`).join('\n') : 'Not much yet'}

${daysSinceLastChat !== null ? `Days since last chat: ${daysSinceLastChat}` : 'First check-in'}

Make it:
- Personal if you have context to reference
- Encouraging them to be present/active (not just chat with you)
- Short enough for a notification
- In character

Just the message, nothing else:`;

        const response = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 100,
            messages: [
                {
                    role: 'user',
                    content: checkInPrompt
                }
            ]
        });

        const checkIn = response.content[0].type === 'text' ? response.content[0].text : '';

        return {
            success: true,
            message: checkIn.trim()
        };
    } catch (error) {
        console.error('[CoachAgent] Check-in error:', error.message);
        return {
            success: true,
            message: "Hey, hope you're having a good one. Get out there and live a little."
        };
    }
};

// Generate quick reflection prompts (with persona)
export const generateReflectionPrompts = (summary) => {
    const prompts = [
        "What moment from this week made you smile?",
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
