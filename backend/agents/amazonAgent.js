// Amazon Order History Agent
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Fetch order history from Amazon API
// In production, this would call the real Amazon API or use Plaid
// For MVP, we use test fixtures
export const fetchOrderHistory = async (token, dateRange) => {
    console.log(`[AmazonAgent] Fetching orders for ${dateRange.start} to ${dateRange.end}`);

    // Use test data for MVP
    const testDataPath = join(__dirname, '../fixtures/amazonTestData.json');
    const testData = JSON.parse(await readFile(testDataPath, 'utf-8'));

    // Filter by date range
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    const filteredOrders = testData.orders.filter(order => {
        const orderDate = new Date(order.timestamp);
        return orderDate >= startDate && orderDate <= endDate;
    });

    console.log(`[AmazonAgent] Found ${filteredOrders.length} orders in range`);
    return filteredOrders;
};

// Normalize raw Amazon order data to our timeline schema
export const normalizeOrderData = (rawOrders) => {
    return rawOrders.map(order => ({
        type: 'purchase',
        timestamp: order.timestamp,
        data: {
            merchant: order.data.merchant || 'Amazon',
            order_id: order.data.order_id,
            amount: order.data.amount,
            items: order.data.items || [],
            category: order.data.category || 'Uncategorized',
            delivery_address: order.data.delivery_address || null,
            delivery_date: order.data.delivery_date || null
        },
        source: 'amazon'
    }));
};

// Main agent function
export const amazonAgent = async (token, dateRange) => {
    try {
        // Validate inputs
        if (!dateRange || !dateRange.start || !dateRange.end) {
            throw new Error('Invalid date range provided');
        }

        // Fetch order data
        const rawOrders = await fetchOrderHistory(token, dateRange);

        // Normalize to timeline schema
        const normalizedEvents = normalizeOrderData(rawOrders);

        return {
            success: true,
            events: normalizedEvents,
            count: normalizedEvents.length,
            dateRange
        };
    } catch (error) {
        console.error('[AmazonAgent] Error:', error.message);
        return {
            success: false,
            error: error.message,
            events: [],
            count: 0
        };
    }
};

// Get spending statistics
export const getSpendingStats = (events) => {
    const totalSpent = events.reduce((sum, e) => sum + (e.data.amount || 0), 0);
    const categories = {};

    events.forEach(e => {
        const cat = e.data.category || 'Uncategorized';
        if (!categories[cat]) {
            categories[cat] = { count: 0, amount: 0 };
        }
        categories[cat].count++;
        categories[cat].amount += e.data.amount || 0;
    });

    const allItems = events.flatMap(e => e.data.items || []);

    return {
        totalOrders: events.length,
        totalSpent: Math.round(totalSpent * 100) / 100,
        averageOrder: events.length > 0 ? Math.round((totalSpent / events.length) * 100) / 100 : 0,
        categoryBreakdown: categories,
        totalItems: allItems.length
    };
};
