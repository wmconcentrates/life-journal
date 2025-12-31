// Database Seed Script
// Populates test data for development and testing
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Encryption functions (duplicated to avoid import issues)
const encryptData = (data, masterKey) => {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(masterKey, 'hex');
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
    };
};

const TEST_USER = {
    email: 'test@lifejournal.app',
    id: null // Will be set after creation
};

async function seedDatabase() {
    console.log('Starting database seed...\n');

    try {
        // 1. Create test user
        console.log('1. Creating test user...');
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', TEST_USER.email)
            .single();

        if (existingUser) {
            TEST_USER.id = existingUser.id;
            console.log(`   User already exists: ${TEST_USER.id}`);
        } else {
            const { data: newUser, error } = await supabase
                .from('users')
                .insert({
                    email: TEST_USER.email,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select('id')
                .single();

            if (error) throw error;
            TEST_USER.id = newUser.id;
            console.log(`   Created user: ${TEST_USER.id}`);
        }

        // 2. Load and insert location events
        console.log('\n2. Inserting location events...');
        const locationsData = JSON.parse(
            await readFile(join(__dirname, 'googleMapsTestData.json'), 'utf-8')
        );

        const locationRecords = locationsData.locations.map(loc => ({
            user_id: TEST_USER.id,
            event_date: loc.timestamp.split('T')[0],
            event_type: 'location',
            event_data_encrypted: JSON.stringify(
                encryptData(loc.data, process.env.ENCRYPTION_MASTER_KEY)
            ),
            source_integration: 'google_maps',
            created_at: new Date().toISOString()
        }));

        // Clear existing events for user
        await supabase
            .from('timeline_events')
            .delete()
            .eq('user_id', TEST_USER.id);

        const { error: locError } = await supabase
            .from('timeline_events')
            .insert(locationRecords);

        if (locError) console.warn('   Location insert warning:', locError.message);
        else console.log(`   Inserted ${locationRecords.length} location events`);

        // 3. Load and insert purchase events
        console.log('\n3. Inserting purchase events...');
        const ordersData = JSON.parse(
            await readFile(join(__dirname, 'amazonTestData.json'), 'utf-8')
        );

        const purchaseRecords = ordersData.orders.map(order => ({
            user_id: TEST_USER.id,
            event_date: order.timestamp.split('T')[0],
            event_type: 'purchase',
            event_data_encrypted: JSON.stringify(
                encryptData(order.data, process.env.ENCRYPTION_MASTER_KEY)
            ),
            source_integration: 'amazon',
            created_at: new Date().toISOString()
        }));

        const { error: purchError } = await supabase
            .from('timeline_events')
            .insert(purchaseRecords);

        if (purchError) console.warn('   Purchase insert warning:', purchError.message);
        else console.log(`   Inserted ${purchaseRecords.length} purchase events`);

        // 4. Summary
        console.log('\n--- Seed Complete ---');
        console.log(`Test user: ${TEST_USER.email}`);
        console.log(`User ID: ${TEST_USER.id}`);
        console.log(`Total events: ${locationRecords.length + purchaseRecords.length}`);
        console.log(`Date range: 2025-01-02 to 2025-01-17`);

        // 5. Verify data
        console.log('\n4. Verifying data...');
        const { data: verifyData, count } = await supabase
            .from('timeline_events')
            .select('*', { count: 'exact' })
            .eq('user_id', TEST_USER.id);

        console.log(`   Found ${count || verifyData?.length || 0} events in database`);

        console.log('\nSeed completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('\nSeed failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
seedDatabase();
