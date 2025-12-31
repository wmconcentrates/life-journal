// Claude Data Normalization Agent
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

const NORMALIZATION_PROMPT = `You are a data normalization agent. Transform raw API data into our canonical timeline event schema.

The canonical schema is:
{
  "type": "location" | "purchase" | "activity" | "photo",
  "timestamp": "ISO 8601 datetime string",
  "data": {
    // For location:
    "lat": number,
    "lng": number,
    "place": string,
    "address": string (optional),
    "duration_minutes": number,
    "accuracy": number

    // For purchase:
    "merchant": string,
    "amount": number,
    "items": array of strings,
    "category": string,
    "delivery_address": string (optional),
    "delivery_date": string (optional)

    // For activity:
    "activity_type": string,
    "duration_minutes": number,
    "calories": number (optional),
    "steps": number (optional)

    // For photo:
    "filename": string,
    "location": string (optional),
    "people_count": number (optional),
    "mood": string (optional)
  },
  "source": string (the integration name)
}

Return ONLY valid JSON array. No explanations or markdown.`;

export const normalizeData = async (source, rawData) => {
    console.log(`[ClaudeNormalizer] Normalizing ${rawData.length} items from ${source}`);

    // For simple, already-normalized data, skip Claude API call
    if (isAlreadyNormalized(rawData)) {
        console.log('[ClaudeNormalizer] Data already normalized, skipping API call');
        return rawData.map(item => ({ ...item, source }));
    }

    try {
        const client = getClient();

        const message = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            messages: [
                {
                    role: 'user',
                    content: `${NORMALIZATION_PROMPT}\n\nSource: ${source}\nRaw data:\n${JSON.stringify(rawData, null, 2)}`
                }
            ]
        });

        const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
        const normalized = JSON.parse(responseText);

        console.log(`[ClaudeNormalizer] Successfully normalized ${normalized.length} items`);
        return normalized;
    } catch (error) {
        console.error('[ClaudeNormalizer] Error:', error.message);
        // Return original data with source added as fallback
        return rawData.map(item => ({ ...item, source }));
    }
};

// Check if data is already in our canonical format
const isAlreadyNormalized = (data) => {
    if (!Array.isArray(data) || data.length === 0) return false;

    return data.every(item =>
        item.type &&
        item.timestamp &&
        item.data &&
        typeof item.data === 'object'
    );
};

// Validate normalized events against our schema
export const validateNormalizedEvents = (events) => {
    const validTypes = ['location', 'purchase', 'activity', 'photo'];
    const errors = [];

    events.forEach((event, index) => {
        if (!event.type || !validTypes.includes(event.type)) {
            errors.push(`Event ${index}: Invalid or missing type`);
        }
        if (!event.timestamp) {
            errors.push(`Event ${index}: Missing timestamp`);
        }
        if (!event.data || typeof event.data !== 'object') {
            errors.push(`Event ${index}: Invalid or missing data object`);
        }
    });

    return {
        valid: errors.length === 0,
        errors
    };
};
