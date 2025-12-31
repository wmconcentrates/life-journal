# Life Journal MVP

A comprehensive personal life tracking and journaling app with AI-powered insights.

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `CLAUDE_API_KEY` - Anthropic API key
- `JWT_SECRET` - 32+ character secret for JWT signing
- `ENCRYPTION_MASTER_KEY` - 64-character hex string for AES-256 encryption

Generate encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Setup Database

Run `backend/schema.sql` in your Supabase SQL Editor to create the required tables.

### 4. Start Backend

```bash
cd backend
npm run dev
```

### 5. Run Tests

```bash
cd backend
npm test
```

### 6. Test Endpoints

```bash
# Health check
curl http://localhost:3001/api/health

# Test encryption and connections
curl http://localhost:3001/api/test

# Test insights (with sample data)
curl http://localhost:3001/api/insights/test
```

## Architecture

```
iOS App (SwiftUI)
     |
Backend (Node/Express)
     |
+----+----+
|         |
Supabase  Claude API
(Database) (Intelligence)
     |
External APIs
(Google Maps, Amazon)
```

## Project Structure

```
life-journal-setup/
├── backend/
│   ├── agents/           # Integration agents (Google, Amazon, Claude)
│   ├── auth/             # Authentication (OAuth, JWT)
│   ├── fixtures/         # Test data
│   ├── sync/             # Weekly sync orchestration
│   ├── tests/            # Integration & API tests
│   ├── utils/            # Encryption, credential vault
│   ├── index.js          # Express server
│   ├── schema.sql        # Database schema
│   └── vercel.json       # Deployment config
│
├── LifeJournal/          # iOS App (SwiftUI)
│   └── LifeJournal/
│       ├── Views/        # UI screens
│       ├── Models/       # Data models
│       ├── Services/     # API services
│       └── Info.plist    # App config
│
└── .env                  # Environment variables
```

## Features

### Backend
- **OAuth Authentication** - Google Sign-In with JWT tokens
- **Encrypted Storage** - AES-256-GCM encryption for all sensitive data
- **Google Maps Agent** - Location history fetching and normalization
- **Amazon Agent** - Purchase history fetching and normalization
- **Claude Normalizer** - AI-powered data normalization
- **Weekly Sync** - Orchestrated parallel data fetching
- **Summary Agent** - Privacy-preserving weekly summaries
- **Coach Agent** - Personalized life coaching insights
- **Photo Analyzer** - AI analysis for recap videos
- **Video Generator** - FFmpeg-based recap video creation

### iOS App
- **Timeline View** - Calendar with daily event list
- **Weekly Summary** - Stats, insights, and reflection prompts
- **Settings** - Integration management and privacy controls
- **Demo Mode** - Sample data for testing without auth

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/test` | Test connections |
| GET | `/auth/google` | Get OAuth URL |
| POST | `/auth/callback/google` | OAuth callback |
| POST | `/auth/mock` | Mock auth (dev) |
| POST | `/api/sync` | Trigger data sync |
| GET | `/api/timeline` | Get timeline events |
| GET | `/api/timeline/:date` | Get events for date |
| GET | `/api/insights/weekly` | Get weekly insights |
| GET | `/api/insights/test` | Test insights (dev) |
| POST | `/api/credentials` | Store integration token |

## Deployment

### Vercel

```bash
cd backend
npm run deploy
```

Or manually:
```bash
vercel --prod
```

### iOS (TestFlight)

1. Open `LifeJournal.xcodeproj` in Xcode
2. Update bundle identifier
3. Archive and upload to App Store Connect

## Security

- All sensitive data encrypted with AES-256-GCM
- JWT tokens for authentication
- Row Level Security (RLS) on all database tables
- HTTPS for all API calls
- Credentials stored in iOS Keychain

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `CLAUDE_API_KEY` | Anthropic API key |
| `JWT_SECRET` | Secret for JWT signing |
| `ENCRYPTION_MASTER_KEY` | 32-byte hex key for encryption |
| `GOOGLE_OAUTH_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_OAUTH_SECRET` | Google OAuth secret |
| `PORT` | Server port (default: 3001) |
| `NODE_ENV` | Environment (development/production) |

## Testing

Run all tests:
```bash
cd backend
npm test
```

Run specific test file:
```bash
node --test tests/integration.test.js
```

Seed database with test data:
```bash
npm run seed
```

## License

MIT
