// Integration Tests for Life Journal Backend
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

// Import modules to test
import { encryptData, decryptData } from '../utils/encryption.js';
import { getMasterKey, validateKeyOnStartup } from '../utils/keyManagement.js';
import { generateToken, authenticateToken } from '../auth/jwtMiddleware.js';
import { googleMapsAgent, getLocationStats } from '../agents/googleMapsAgent.js';
import { amazonAgent, getSpendingStats } from '../agents/amazonAgent.js';
import { syncUserDataLocal, getWeekDateRange } from '../sync/weeklySync.js';
import { storeCredentialLocal, getCredentialLocal, clearLocalStore } from '../utils/credentialVault.js';

describe('Encryption Module', () => {
    const testData = { message: 'secret data', numbers: [1, 2, 3] };

    it('should encrypt and decrypt data correctly', () => {
        const masterKey = getMasterKey();
        const encrypted = encryptData(testData, masterKey);

        assert.ok(encrypted.encryptedData, 'Should have encrypted data');
        assert.ok(encrypted.iv, 'Should have IV');
        assert.ok(encrypted.authTag, 'Should have auth tag');

        const decrypted = decryptData(encrypted, masterKey);
        assert.deepStrictEqual(decrypted, testData, 'Decrypted data should match original');
    });

    it('should fail with wrong key', () => {
        const masterKey = getMasterKey();
        const encrypted = encryptData(testData, masterKey);

        const wrongKey = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

        assert.throws(() => {
            decryptData(encrypted, wrongKey);
        }, 'Should throw with wrong key');
    });
});

describe('Key Management', () => {
    it('should validate master key on startup', () => {
        const result = validateKeyOnStartup();
        assert.ok(result, 'Key validation should pass');
    });

    it('should return valid master key', () => {
        const key = getMasterKey();
        assert.strictEqual(key.length, 64, 'Key should be 64 hex chars');
        assert.ok(/^[0-9a-fA-F]+$/.test(key), 'Key should be valid hex');
    });
});

describe('JWT Authentication', () => {
    it('should generate valid JWT token', () => {
        const token = generateToken('user-123', 'test@example.com');
        assert.ok(token, 'Should generate token');
        assert.ok(token.split('.').length === 3, 'Token should have 3 parts');
    });

    it('should authenticate valid token', (_, done) => {
        const token = generateToken('user-123', 'test@example.com');

        const mockReq = {
            headers: { authorization: `Bearer ${token}` }
        };
        const mockRes = {
            status: () => ({ json: () => {} })
        };

        authenticateToken(mockReq, mockRes, () => {
            assert.strictEqual(mockReq.userId, 'user-123', 'Should set userId');
            done();
        });
    });
});

describe('Credential Vault', () => {
    before(() => {
        clearLocalStore();
    });

    after(() => {
        clearLocalStore();
    });

    it('should store and retrieve credentials', () => {
        const result = storeCredentialLocal('user-1', 'google', 'secret-token-123');
        assert.ok(result.success, 'Store should succeed');

        const retrieved = getCredentialLocal('user-1', 'google');
        assert.strictEqual(retrieved, 'secret-token-123', 'Should retrieve correct token');
    });

    it('should return null for missing credential', () => {
        const retrieved = getCredentialLocal('user-999', 'nonexistent');
        assert.strictEqual(retrieved, null, 'Should return null');
    });
});

describe('Google Maps Agent', () => {
    it('should fetch and normalize location data', async () => {
        const dateRange = { start: '2025-01-01', end: '2025-01-15' };
        const result = await googleMapsAgent('test-token', dateRange);

        assert.ok(result.success, 'Should succeed');
        assert.ok(Array.isArray(result.events), 'Should return events array');
        assert.ok(result.count > 0, 'Should have events');

        // Check event structure
        const event = result.events[0];
        assert.strictEqual(event.type, 'location', 'Event type should be location');
        assert.ok(event.timestamp, 'Should have timestamp');
        assert.ok(event.data.lat, 'Should have latitude');
        assert.ok(event.data.lng, 'Should have longitude');
    });

    it('should calculate location stats', async () => {
        const dateRange = { start: '2025-01-01', end: '2025-01-15' };
        const result = await googleMapsAgent('test-token', dateRange);
        const stats = getLocationStats(result.events);

        assert.ok(stats.totalLocations > 0, 'Should have total locations');
        assert.ok(stats.uniquePlaces > 0, 'Should have unique places');
        assert.ok(Array.isArray(stats.placesVisited), 'Should have places list');
    });

    it('should handle invalid date range', async () => {
        const result = await googleMapsAgent('test-token', null);
        assert.strictEqual(result.success, false, 'Should fail');
        assert.ok(result.error, 'Should have error message');
    });
});

describe('Amazon Agent', () => {
    it('should fetch and normalize order data', async () => {
        const dateRange = { start: '2025-01-01', end: '2025-01-15' };
        const result = await amazonAgent('test-token', dateRange);

        assert.ok(result.success, 'Should succeed');
        assert.ok(Array.isArray(result.events), 'Should return events array');
        assert.ok(result.count > 0, 'Should have events');

        // Check event structure
        const event = result.events[0];
        assert.strictEqual(event.type, 'purchase', 'Event type should be purchase');
        assert.ok(event.timestamp, 'Should have timestamp');
        assert.ok(event.data.merchant, 'Should have merchant');
        assert.ok(event.data.amount >= 0, 'Should have amount');
    });

    it('should calculate spending stats', async () => {
        const dateRange = { start: '2025-01-01', end: '2025-01-15' };
        const result = await amazonAgent('test-token', dateRange);
        const stats = getSpendingStats(result.events);

        assert.ok(stats.totalOrders > 0, 'Should have total orders');
        assert.ok(stats.totalSpent > 0, 'Should have total spent');
        assert.ok(stats.averageOrder > 0, 'Should have average order');
        assert.ok(Object.keys(stats.categoryBreakdown).length > 0, 'Should have categories');
    });
});

describe('Weekly Sync', () => {
    it('should sync user data from all agents', async () => {
        const dateRange = { start: '2025-01-01', end: '2025-01-15' };
        const result = await syncUserDataLocal('test-user', dateRange);

        assert.ok(result.eventsAdded > 0, 'Should add events');
        assert.ok(result.sources.google_maps, 'Should have Google Maps results');
        assert.ok(result.sources.amazon, 'Should have Amazon results');
    });

    it('should generate correct date ranges', () => {
        const range = getWeekDateRange(0);

        assert.ok(range.start, 'Should have start date');
        assert.ok(range.end, 'Should have end date');

        const start = new Date(range.start);
        const end = new Date(range.end);
        const diff = (end - start) / (1000 * 60 * 60 * 24);

        assert.ok(diff >= 6 && diff <= 8, 'Range should be about a week');
    });
});

describe('Date Range Helper', () => {
    it('should return valid date range for current week', () => {
        const range = getWeekDateRange(0);
        assert.ok(range.start, 'Should have start');
        assert.ok(range.end, 'Should have end');
    });

    it('should return earlier dates for past weeks', () => {
        const current = getWeekDateRange(0);
        const lastWeek = getWeekDateRange(1);

        assert.ok(new Date(lastWeek.end) < new Date(current.end), 'Last week should be earlier');
    });
});

// Run summary
console.log('\n=== Life Journal Integration Tests ===\n');
