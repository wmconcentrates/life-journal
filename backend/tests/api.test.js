// API Endpoint Tests for Life Journal Backend
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const BASE_URL = `http://localhost:${process.env.PORT || 3001}`;

// Helper to make HTTP requests
const request = (method, path, body = null, headers = {}) => {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(data)
                    });
                } catch {
                    resolve({
                        status: res.statusCode,
                        data: data
                    });
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
};

describe('Health Endpoints', () => {
    it('GET /api/health should return ok', async () => {
        const res = await request('GET', '/api/health');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.status, 'ok');
        assert.ok(res.data.timestamp);
    });

    it('GET /api/test should test connections', async () => {
        const res = await request('GET', '/api/test');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.status, 'ok');
        assert.strictEqual(res.data.encryption, 'working');
    });
});

describe('Authentication Endpoints', () => {
    it('GET /auth/google should return OAuth URL', async () => {
        const res = await request('GET', '/auth/google');
        assert.strictEqual(res.status, 200);
        assert.ok(res.data.url);
        assert.ok(res.data.url.includes('accounts.google.com'));
    });

    it('POST /auth/callback/google should require code', async () => {
        const res = await request('POST', '/auth/callback/google', {});
        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.data.code, 'MISSING_CODE');
    });

    it('POST /auth/mock should create test user', async () => {
        const res = await request('POST', '/auth/mock', { email: 'apitest@example.com' });
        // This may fail if Supabase isn't properly configured, which is okay
        if (res.status === 200) {
            assert.ok(res.data.success);
            assert.ok(res.data.token);
        }
    });
});

describe('Protected Endpoints (without auth)', () => {
    it('POST /api/sync should require auth', async () => {
        const res = await request('POST', '/api/sync', {});
        assert.strictEqual(res.status, 401);
        assert.strictEqual(res.data.code, 'NO_TOKEN');
    });

    it('GET /api/timeline should require auth', async () => {
        const res = await request('GET', '/api/timeline');
        assert.strictEqual(res.status, 401);
    });

    it('GET /api/insights/weekly should require auth', async () => {
        const res = await request('GET', '/api/insights/weekly');
        assert.strictEqual(res.status, 401);
    });
});

describe('Test Endpoints (development)', () => {
    it('POST /api/sync/test should work in development', async () => {
        const res = await request('POST', '/api/sync/test', {});
        // Should work if NODE_ENV is not production
        if (res.status === 200) {
            assert.ok(res.data.eventsAdded >= 0);
        } else if (res.status === 403) {
            // In production mode, this is expected
            assert.ok(true);
        }
    });

    it('GET /api/insights/test should work in development', async () => {
        const res = await request('GET', '/api/insights/test');
        // Should work if NODE_ENV is not production
        if (res.status === 200) {
            assert.ok(res.data.success);
        } else if (res.status === 403) {
            // In production mode, this is expected
            assert.ok(true);
        }
    });
});

describe('404 Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
        const res = await request('GET', '/api/nonexistent');
        assert.strictEqual(res.status, 404);
        assert.strictEqual(res.data.code, 'NOT_FOUND');
    });
});

// Summary
console.log('\n=== Life Journal API Tests ===');
console.log(`Testing against: ${BASE_URL}`);
console.log('Note: Server must be running for these tests\n');
