// Photo Analysis Agent
import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let anthropicClient = null;

const getClient = () => {
    if (!anthropicClient) {
        anthropicClient = new Anthropic({
            apiKey: process.env.CLAUDE_API_KEY
        });
    }
    return anthropicClient;
};

const PHOTO_ANALYSIS_PROMPT = `You are analyzing a week's worth of photos for a life journal recap video.

For each photo, analyze:
1. Quality score (1-10): Is it a good "hero shot"? Sharp, well-lit, interesting?
2. Suggested duration: How long should it appear in the video? (short/medium/long)
3. Emotional tone: What feeling does this photo convey? (happy, peaceful, energetic, reflective, celebratory)
4. People count: How many people are visible?
5. Scene type: What kind of scene is this? (outdoor, indoor, food, people, activity, landscape, event)

Return a JSON array with analysis for each photo.`;

// Analyze photos for recap video
export const analyzePhotos = async (photoMetadata) => {
    console.log(`[PhotoAnalyzer] Analyzing ${photoMetadata.length} photos`);

    if (photoMetadata.length === 0) {
        return {
            success: true,
            photos: [],
            heroShots: []
        };
    }

    try {
        const client = getClient();

        const message = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2000,
            messages: [
                {
                    role: 'user',
                    content: `${PHOTO_ANALYSIS_PROMPT}\n\nPhoto metadata:\n${JSON.stringify(photoMetadata, null, 2)}`
                }
            ]
        });

        const responseText = message.content[0].type === 'text' ? message.content[0].text : '[]';

        // Try to parse JSON from response
        let analysis;
        try {
            // Extract JSON from response if wrapped in markdown
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        } catch {
            console.warn('[PhotoAnalyzer] Could not parse response, using default analysis');
            analysis = photoMetadata.map((photo, i) => ({
                index: i,
                quality_score: 7,
                duration: 'medium',
                emotional_tone: 'happy',
                people_count: 0,
                scene_type: 'general'
            }));
        }

        // Identify hero shots (quality score >= 8)
        const heroShots = analysis
            .filter(p => p.quality_score >= 8)
            .sort((a, b) => b.quality_score - a.quality_score)
            .slice(0, 5);

        console.log(`[PhotoAnalyzer] Found ${heroShots.length} hero shots`);

        return {
            success: true,
            photos: analysis,
            heroShots
        };
    } catch (error) {
        console.error('[PhotoAnalyzer] Error:', error.message);
        return {
            success: false,
            error: error.message,
            photos: [],
            heroShots: []
        };
    }
};

// Get test photo data
export const getTestPhotoData = async () => {
    try {
        const testDataPath = join(__dirname, '../fixtures/photoTestData.json');
        const testData = JSON.parse(await readFile(testDataPath, 'utf-8'));
        return testData.photos;
    } catch {
        // Return default test data if file doesn't exist
        return generateTestPhotoMetadata();
    }
};

// Generate sample photo metadata for testing
const generateTestPhotoMetadata = () => {
    const scenes = ['outdoor', 'indoor', 'food', 'people', 'activity', 'landscape', 'event'];
    const baseDate = new Date('2025-01-08');

    return Array.from({ length: 12 }, (_, i) => {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + Math.floor(i / 2));
        date.setHours(8 + (i % 12));

        return {
            filename: `IMG_${1000 + i}.jpg`,
            timestamp: date.toISOString(),
            location: i % 3 === 0 ? 'Denver, CO' : null,
            exif: {
                width: 4032,
                height: 3024,
                camera: 'iPhone 14 Pro',
                aperture: 'f/1.8',
                iso: 100 + (i * 50)
            },
            size_bytes: 2500000 + (i * 100000)
        };
    });
};

// Suggest video pacing based on photo analysis
export const suggestVideoPacing = (analyzedPhotos) => {
    const totalPhotos = analyzedPhotos.length;

    if (totalPhotos === 0) {
        return { duration: 0, segments: [] };
    }

    // Calculate durations in seconds
    const durationMap = {
        short: 2,
        medium: 3,
        long: 4
    };

    const segments = analyzedPhotos.map((photo, i) => ({
        photoIndex: i,
        duration: durationMap[photo.duration] || 3,
        transition: i === analyzedPhotos.length - 1 ? 'fade_out' : 'crossfade'
    }));

    const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0);

    return {
        duration: totalDuration,
        segments,
        suggestedMusic: selectMusicByMood(analyzedPhotos)
    };
};

// Select background music based on photo moods
const selectMusicByMood = (photos) => {
    const moods = photos.map(p => p.emotional_tone);
    const moodCounts = moods.reduce((acc, mood) => {
        acc[mood] = (acc[mood] || 0) + 1;
        return acc;
    }, {});

    const dominantMood = Object.entries(moodCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'happy';

    const musicSuggestions = {
        happy: 'upbeat-acoustic.mp3',
        peaceful: 'gentle-piano.mp3',
        energetic: 'uplifting-pop.mp3',
        reflective: 'soft-ambient.mp3',
        celebratory: 'celebration-orchestra.mp3'
    };

    return musicSuggestions[dominantMood] || 'upbeat-acoustic.mp3';
};
