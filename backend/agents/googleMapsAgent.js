// Google Maps Location History Agent
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Fetch location history from Google Maps API
// In production, this would call the real Google API
// For MVP, we use test fixtures
export const fetchLocationHistory = async (token, dateRange) => {
    console.log(`[GoogleMapsAgent] Fetching locations for ${dateRange.start} to ${dateRange.end}`);

    // Use test data for MVP
    const testDataPath = join(__dirname, '../fixtures/googleMapsTestData.json');
    const testData = JSON.parse(await readFile(testDataPath, 'utf-8'));

    // Filter by date range
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    const filteredLocations = testData.locations.filter(loc => {
        const eventDate = new Date(loc.timestamp);
        return eventDate >= startDate && eventDate <= endDate;
    });

    console.log(`[GoogleMapsAgent] Found ${filteredLocations.length} locations in range`);
    return filteredLocations;
};

// Normalize raw Google Location data to our timeline schema
export const normalizeLocationData = (rawLocations) => {
    return rawLocations.map(loc => ({
        type: 'location',
        timestamp: loc.timestamp,
        data: {
            lat: loc.data.lat,
            lng: loc.data.lng,
            place: loc.data.place || 'Unknown Location',
            address: loc.data.address || null,
            duration_minutes: loc.data.duration_minutes || 0,
            accuracy: loc.data.accuracy || 100
        },
        source: 'google_maps'
    }));
};

// Main agent function
export const googleMapsAgent = async (token, dateRange) => {
    try {
        // Validate inputs
        if (!dateRange || !dateRange.start || !dateRange.end) {
            throw new Error('Invalid date range provided');
        }

        // Fetch location data
        const rawLocations = await fetchLocationHistory(token, dateRange);

        // Normalize to timeline schema
        const normalizedEvents = normalizeLocationData(rawLocations);

        return {
            success: true,
            events: normalizedEvents,
            count: normalizedEvents.length,
            dateRange
        };
    } catch (error) {
        console.error('[GoogleMapsAgent] Error:', error.message);
        return {
            success: false,
            error: error.message,
            events: [],
            count: 0
        };
    }
};

// Get summary statistics for locations
export const getLocationStats = (events) => {
    const uniquePlaces = new Set(events.map(e => e.data.place));
    const totalDuration = events.reduce((sum, e) => sum + (e.data.duration_minutes || 0), 0);
    const homeTime = events
        .filter(e => e.data.place === 'Home')
        .reduce((sum, e) => sum + (e.data.duration_minutes || 0), 0);

    return {
        totalLocations: events.length,
        uniquePlaces: uniquePlaces.size,
        totalMinutes: totalDuration,
        homeMinutes: homeTime,
        placesVisited: Array.from(uniquePlaces)
    };
};
