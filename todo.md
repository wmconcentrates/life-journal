# Life Journal MVP - Build Sprint
**Status:** Ready for Ralph Mode  
**Target:** Holiday Weekend (48-72 hours)  
**Scope:** MVP with Google Maps + Amazon integrations, iOS app, coach agent  

---

## PHASE 1: BACKEND INFRASTRUCTURE

### 1.1 Project Setup
- [ ] Create Node.js project (npm init)
- [ ] Install dependencies:
  - express, cors, dotenv (server basics)
  - @supabase/supabase-js (database)
  - @anthropic-ai/sdk (Claude API)
  - crypto, node:crypto (encryption - built-in)
  - axios (HTTP requests)
  - jsonwebtoken (JWT for auth)
  - dotenv (env management)
- [ ] Create .env.example with all required variables:
  - SUPABASE_URL, SUPABASE_KEY
  - CLAUDE_API_KEY
  - GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_SECRET
  - AMAZON_API_KEY, AMAZON_API_SECRET (or use Plaid instead)
  - JWT_SECRET
  - ENCRYPTION_MASTER_KEY (generate random 32-byte hex string)
  - VERCEL_TOKEN (for deployment)
- [ ] Create .env with test values (note: DO NOT commit)
- [ ] Initialize git repo, .gitignore (exclude .env, node_modules)

### 1.2 Database Schema (Supabase)
- [ ] Create Supabase project
- [ ] Create tables:
  ```
  users (id, email, created_at, updated_at)
  user_credentials (id, user_id, integration, encrypted_token, token_type, created_at, updated_at, last_used)
  timeline_events (id, user_id, event_date, event_type, event_data_encrypted, source_integration, created_at)
  therapy_summaries (id, user_id, week_number, encrypted_summary, generated_at, expires_at, recalled_at)
  recap_reels (id, user_id, period, video_url, created_at, expires_at)
  ```
- [ ] Enable Row Level Security (RLS) on all tables
  - Users can only see their own data
  - Only authenticated users can insert/update
- [ ] Create indexes on: user_id, event_date, week_number (for performance)

### 1.3 Encryption Module
- [ ] Create `/backend/utils/encryption.js`
  - Function: `encryptData(data, masterKey)` → encrypted string
  - Function: `decryptData(encrypted, masterKey)` → original data
  - Uses AES-256-GCM (built-in crypto module)
  - Returns: { encryptedData, iv, authTag } for storage
  - Includes proper error handling
- [ ] Create `/backend/utils/keyManagement.js`
  - Load ENCRYPTION_MASTER_KEY from env
  - Validate it's 32 bytes (256 bits)
  - Throw error if missing or invalid

### 1.4 OAuth Setup
- [ ] Create `/backend/auth/googleAuth.js`
  - Google OAuth redirect endpoint
  - Token exchange logic
  - Create or update user in DB
  - Return JWT token + refresh token
- [ ] Create `/backend/auth/jwtMiddleware.js`
  - Verify JWT on protected routes
  - Attach user_id to request
  - Return 401 if invalid
- [ ] Create OAuth callback route: `POST /auth/callback/google`

### 1.5 Credential Storage Module
- [ ] Create `/backend/utils/credentialVault.js`
  - Function: `storeCredential(userId, integration, token, tokenType)`
    - Encrypt token
    - Store in DB
    - Return success
  - Function: `getCredential(userId, integration)`
    - Retrieve from DB
    - Decrypt
    - Return plaintext token
  - Function: `deleteCredential(userId, integration)`
    - Soft delete (mark deleted, don't purge immediately)

---

## PHASE 2: DATA INTEGRATION AGENTS

### 2.1 Google Maps Integration
- [ ] Create `/backend/agents/googleMapsAgent.js`
  - Input: encrypted Google OAuth token, date_range (YYYY-MM to YYYY-MM)
  - Uses Google Location History API
  - Fetches location data for period
  - Extracts: latitude, longitude, timestamp, accuracy, address (reverse geocoding)
  - Normalizes to timeline schema:
    ```json
    {
      "type": "location",
      "timestamp": "2025-01-15T14:30:00Z",
      "data": {
        "lat": 39.7392,
        "lng": -104.9903,
        "place": "Home",
        "duration_minutes": 480,
        "accuracy": 50
      }
    }
    ```
  - Error handling: API rate limits, auth failures, no data for period
  - Returns: array of normalized events
- [ ] Create test fixture: `/backend/fixtures/googleMapsTestData.json`
  - 20-30 location events spread across a month
  - Mix of home, work, coffee shops, stores
  - Realistic lat/lng for Denver area (near you)

### 2.2 Amazon Integration
- [ ] Create `/backend/agents/amazonAgent.js`
  - Input: encrypted Amazon API token (or Plaid), date_range
  - Fetches order history from Amazon Advertising API or Plaid
  - Extracts: order_date, items, amount, delivery_address, delivery_date
  - Normalizes to timeline schema:
    ```json
    {
      "type": "purchase",
      "timestamp": "2025-01-15T00:00:00Z",
      "data": {
        "merchant": "Amazon",
        "amount": 45.99,
        "items": ["Kids shoes", "Book"],
        "delivery_address": "Denver, CO",
        "delivery_date": "2025-01-18"
      }
    }
    ```
  - Error handling: API failures, rate limits, missing fields
  - Returns: array of normalized events
- [ ] Create test fixture: `/backend/fixtures/amazonTestData.json`
  - 15-20 orders spread across month
  - Mix of amounts ($10-$200)
  - Various delivery locations

### 2.3 Claude Normalization Agents
- [ ] Create `/backend/agents/claudeNormalizer.js`
  - Function: `normalizeData(source, rawData)`
  - Calls Claude API with system prompt:
    ```
    You are a data normalization agent. Transform raw API data into 
    our canonical timeline event schema. Return ONLY valid JSON.
    Schema: { type, timestamp, data }
    ```
  - Takes raw API response, returns normalized JSON
  - Includes error handling for Claude API failures
  - Logs all normalizations for debugging

### 2.4 Weekly Sync Orchestration
- [ ] Create `/backend/sync/weeklySync.js`
  - Function: `syncUserData(userId, dateRange)`
  - Gets user credentials from vault (decrypted)
  - Calls agents in parallel:
    - Google Maps agent
    - Amazon agent
  - Normalizes each via Claude
  - Stores in timeline_events table (encrypted)
  - Handles partial failures (one agent fails, others continue)
  - Returns: { success, eventsAdded, errors }
- [ ] Create sync endpoint: `POST /api/sync`
  - Protected route (JWT required)
  - Triggers weeklySync for authenticated user
  - Returns status + count of events added

---

## PHASE 3: INSIGHTS & COACH AGENTS

### 3.1 Summary Generation
- [ ] Create `/backend/agents/summaryAgent.js`
  - Input: array of timeline events (last 7 days)
  - Calls Claude with system prompt to generate privacy-preserving summary:
    ```
    Generate a brief summary (100-150 words) of this week's life data.
    Include: activity level, spending trends, locations visited.
    EXCLUDE: specific amounts, exact addresses, names.
    Be warm and observational.
    ```
  - Returns: encrypted summary
  - Stores in therapy_summaries table

### 3.2 Coach Agent
- [ ] Create `/backend/agents/coachAgent.js`
  - Input: current week summary + last 12 weeks summaries (if available)
  - Calls Claude with system prompt:
    ```
    You are a supportive life coach reviewing someone's week.
    You have summaries of their life data (location, activity, spending).
    Generate a 3-paragraph insight:
    1. One thing they did well
    2. One pattern you noticed (vs history)
    3. One small suggestion (not preachy)
    Be warm, specific, encouraging.
    ```
  - Returns: insight text
  - Stores with timestamp
- [ ] Create endpoint: `GET /api/insights/weekly`
  - Protected route
  - Returns coach insight for current week
  - Or generates if not cached

---

## PHASE 4: iOS APP

### 4.1 Project Setup
- [ ] Create Xcode project (SwiftUI, iOS 15+)
- [ ] Set bundle ID: `com.yourname.lifejournal` (or similar)
- [ ] Install dependencies via CocoaPods or SPM:
  - Supabase client
  - Alamofire (HTTP)
  - CoreLocation (GPS)
  - Photos framework
- [ ] Set up project structure:
  ```
  /LifeJournal
    /Views
    /Models
    /Services
    /Utils
    App.swift
  ```

### 4.2 Authentication
- [ ] Create `AuthService.swift`
  - Handles Google OAuth login
  - Stores JWT in Keychain
  - Logout function
- [ ] Create `AuthView.swift` (SwiftUI)
  - Login button
  - Redirect to backend auth endpoint
  - Handle callback + token storage
- [ ] Create `@EnvironmentObject` for auth state

### 4.3 Timeline View
- [ ] Create `TimelineView.swift` (main screen)
  - Calendar picker (horizontal scroll by month)
  - List of events for selected day
  - Each event shows: time, type (location/purchase), summary
  - Pull-to-refresh to sync data
- [ ] Create `DayDetailView.swift`
  - Full details for single day
  - All events chronologically ordered
  - Map showing locations
  - Spending total for day

### 4.4 Weekly Summary Screen
- [ ] Create `WeeklySummaryView.swift`
  - Shows current week overview:
    - Total spending
    - Total steps (if Apple Health connected)
    - Locations visited count
    - Photo count
  - Weekly recap video (if available)
  - Coach insight (if available)
- [ ] Create `InsightCardView.swift`
  - Display coach insight
  - Timestamp
  - Collapsible for detail

### 4.5 Data Syncing
- [ ] Create `SyncService.swift`
  - Call `/api/sync` endpoint
  - Handle JWT refresh
  - Cache results locally (Core Data)
  - Show loading/success/error states
- [ ] Create `CoreDataStack.swift`
  - Local cache for timeline events
  - Minimal schema (id, date, type, summary)
  - Only for display, not source of truth

### 4.6 OAuth Callback Handling
- [ ] Configure URL schemes in Info.plist
  - Add: `lifejournal://callback`
- [ ] Handle deep link in App.swift
  - Extract auth code from URL
  - Exchange for JWT
  - Store in Keychain

### 4.7 Test Data in App
- [ ] Create mock timeline events for demo
  - Hardcoded array of sample events (locations, purchases)
  - App shows demo data before user logs in
  - After login, replaces with real data

---

## PHASE 5: WEEKLY RECAP VIDEO GENERATION

### 5.1 Photo Collection & Analysis
- [ ] Create `/backend/agents/photoAnalyzer.js`
  - Input: array of photos from week (EXIF data, timestamps)
  - Calls Claude to analyze:
    - Suggest best photos (hero shots)
    - Suggest pacing (which should be longer, which quick cuts)
    - Detect emotional tone (happy, reflective, quiet, active)
  - Returns: ranked array with metadata
- [ ] Create test fixture: `/backend/fixtures/photoTestData.json`
  - 10-15 sample photo metadata objects (EXIF, timestamps)

### 5.2 Video Generation
- [ ] Create `/backend/utils/videoGenerator.js`
  - Use FFmpeg to create video from photos
  - Apply transitions (fade, dissolve)
  - Add optional background music (royalty-free track)
  - Output: MP4 file
  - Store in local filesystem or S3 (for now, local is fine)
- [ ] Endpoint: `POST /api/recap/weekly`
  - Generate weekly recap video
  - Return video URL
  - Cache for 7 days

---

## PHASE 6: DEPLOYMENT & TESTING

### 6.1 Environment Setup
- [ ] Create `.env.test` with test API keys
  - Use real Supabase project (test DB)
  - Real Claude API key
  - Dummy Google/Amazon tokens (or test fixtures)
- [ ] Ensure all critical env vars validated on startup

### 6.2 Automated Tests
- [ ] Create `/backend/tests/integration.test.js`
  - Test auth flow (login, JWT generation)
  - Test credential storage (encrypt/decrypt)
  - Test Google Maps agent (with test data)
  - Test Amazon agent (with test data)
  - Test sync orchestration
  - Test coach agent insight generation
  - All tests use fixtures, no live API calls

### 6.3 Vercel Deployment
- [ ] Create `/backend/vercel.json` config
  - Set serverless functions for API routes
  - Env vars for production
- [ ] Deploy backend to Vercel
  - Configure Supabase URL in env
  - Test endpoints from production URL
- [ ] Create iOS app pointing to production backend URL

### 6.4 TestFlight Beta
- [ ] Build iOS app for TestFlight
  - Increment version number
  - Create archive in Xcode
  - Upload to App Store Connect
  - Create TestFlight build
  - (You'll do this manually after Ralph mode completes)

---

## PHASE 7: ERROR HANDLING & VALIDATION

### 7.1 API Error Handling
- [ ] All endpoints return standardized error format:
  ```json
  { "success": false, "error": "description", "code": "ERROR_CODE" }
  ```
- [ ] Log all errors to console + Supabase logs table
- [ ] Handle common cases:
  - Invalid JWT → 401
  - Missing credentials → 422
  - API rate limit → retry with exponential backoff
  - Encryption key missing → fail loudly
  - Claude API timeout → graceful degradation

### 7.2 Data Validation
- [ ] Validate all incoming data (credentials, date ranges, user IDs)
- [ ] Sanitize any strings before storing
- [ ] Validate timeline event schema before storage
- [ ] Test with malformed/edge case data

---

## PHASE 8: TEST DATA & FIXTURES

### 8.1 Seed Data
- [ ] Create `/backend/fixtures/seed.js`
  - Creates test user in Supabase
  - Creates test timeline events (100 events across 30 days)
  - Mix of locations, purchases, times of day
  - Realistic Denver area coordinates
- [ ] Run seed script to populate test DB
  - Can be re-run to reset state

### 8.2 API Testing
- [ ] Create `/backend/tests/api.test.js`
  - Test all endpoints
  - Use seeded test data
  - Verify responses match schema

---

## FINAL CHECKLIST

- [ ] Backend runs locally without errors
- [ ] All integrations working (Google Maps, Amazon agents)
- [ ] Claude API calls succeed for normalization & coaching
- [ ] Supabase DB populated with test data
- [ ] All encryption/decryption working
- [ ] JWT auth working end-to-end
- [ ] iOS app compiles without errors
- [ ] iOS app can authenticate (OAuth flow works)
- [ ] iOS app displays timeline (from seeded data)
- [ ] iOS app syncs with backend (push button, data populates)
- [ ] Weekly summary screen shows data
- [ ] Coach insight displays on app
- [ ] Recap video generates (test with fixture photos)
- [ ] All tests pass
- [ ] Backend deployed to Vercel
- [ ] iOS app builds for TestFlight
- [ ] README.md with setup instructions
- [ ] Environment variables documented

---

## NOTES FOR RALPH MODE

- **Test data is your friend:** All integrations use fixtures, not live APIs
- **No manual intervention:** If something fails, fix it programmatically
- **Validate constantly:** Check data types, schemas, responses
- **Log everything:** Make debugging easier if something goes wrong
- **Encryption is critical:** Test it repeatedly; don't skip
- **Start minimal:** Get OAuth + one integration working first, then scale
- **Document as you go:** README, function comments, error messages

---

## SUCCESS CRITERIA

Ralph mode stops when:
1. Backend server starts without errors
2. All integration agents run successfully on test data
3. iOS app compiles and runs on simulator
4. OAuth flow completes (login → JWT received)
5. Data syncs from backend to app
6. Coach insight displays on weekly summary
7. All tests pass (0 failures)
8. Backend deployed to Vercel with all endpoints working
