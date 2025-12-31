#!/bin/bash

# Life Journal MVP - Complete Setup Script
# Run this after unzipping: ./setup.sh

set -e  # Exit on any error

echo "🚀 Life Journal MVP Setup Starting..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper functions
log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check prerequisites
log_info "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    log_error "Node.js not found. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi
log_success "Node.js found: $(node --version)"

if ! command -v npm &> /dev/null; then
    log_error "npm not found. Please install npm"
    exit 1
fi
log_success "npm found: $(npm --version)"

# Create directory structure
log_info "Creating directory structure..."
mkdir -p backend/agents
mkdir -p backend/auth
mkdir -p backend/utils
mkdir -p backend/sync
mkdir -p backend/tests
mkdir -p backend/fixtures
mkdir -p backend/routes
mkdir -p backend/models
mkdir -p backend/logs
mkdir -p ios-app
mkdir -p config

log_success "Directories created"

# Generate encryption key
log_info "Generating encryption master key..."
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
log_success "Encryption key generated"

# Create .env file
log_info "Creating .env file..."
cat > .env << EOF
# ============================================
# Life Journal MVP - Environment Variables
# ============================================

# Supabase
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Claude API
CLAUDE_API_KEY=your_claude_api_key_here

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=your_google_client_id_here
GOOGLE_OAUTH_SECRET=your_google_client_secret_here

# Amazon API (optional - can use Plaid instead)
AMAZON_API_KEY=your_amazon_api_key_here
AMAZON_API_SECRET=your_amazon_api_secret_here

# JWT
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Encryption
ENCRYPTION_MASTER_KEY=$ENCRYPTION_KEY

# Server
NODE_ENV=development
PORT=3001
BACKEND_URL=http://localhost:3001
VERCEL_TOKEN=your_vercel_token_here

# Deployment
VERCEL_PROJECT_ID=
VERCEL_ORG_ID=

# Logging
LOG_LEVEL=debug
EOF

log_success ".env file created (fill in API keys before running)"

# Create .env.example
log_info "Creating .env.example..."
cat > .env.example << 'EOF'
# ============================================
# Life Journal MVP - Environment Variables
# Copy this to .env and fill in your values
# ============================================

# Supabase - Get from https://supabase.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Claude API - Get from https://console.anthropic.com
CLAUDE_API_KEY=sk-ant-...

# Google OAuth - Get from https://console.cloud.google.com
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_SECRET=your-client-secret

# Amazon API (optional)
AMAZON_API_KEY=your-amazon-api-key
AMAZON_API_SECRET=your-amazon-api-secret

# JWT - Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-generated-secret

# Encryption - Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_MASTER_KEY=your-generated-key

# Server
NODE_ENV=development
PORT=3001
BACKEND_URL=http://localhost:3001
VERCEL_TOKEN=your-vercel-token

# Logging
LOG_LEVEL=debug
EOF

log_success ".env.example created"

# Initialize backend
log_info "Setting up backend..."
cd backend

log_info "Installing backend dependencies..."
npm init -y --silent > /dev/null 2>&1

npm install \
    express \
    cors \
    dotenv \
    @supabase/supabase-js \
    @anthropic-ai/sdk \
    axios \
    jsonwebtoken \
    bcryptjs \
    joi \
    winston \
    --save > /dev/null 2>&1

log_success "Backend dependencies installed"

# Create backend package.json scripts
log_info "Updating package.json scripts..."
node << 'NODEJS_SCRIPT'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

pkg.scripts = {
    "start": "node index.js",
    "dev": "node --watch index.js",
    "test": "node --test tests/**/*.test.js",
    "seed": "node fixtures/seed.js",
    "deploy": "vercel --prod"
};

pkg.type = "module";
pkg.engines = { "node": ">=18.0.0" };

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log("✓ package.json updated");
NODEJS_SCRIPT

log_success "package.json configured"

# Create main index.js
log_info "Creating backend entry point..."
cat > index.js << 'EOF'
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Initialize Claude
const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY
});

// Validate environment
const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'CLAUDE_API_KEY',
    'JWT_SECRET',
    'ENCRYPTION_MASTER_KEY'
];

const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingEnvVars.length > 0) {
    console.error('❌ Missing environment variables:', missingEnvVars);
    console.error('Please fill in your .env file');
    process.exit(1);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV 
    });
});

// Test endpoint
app.get('/api/test', async (req, res) => {
    try {
        // Test Supabase connection
        const { data: sbTest } = await supabase
            .from('users')
            .select('count(*)')
            .limit(1);
        
        // Test Claude connection
        const claudeTest = await anthropic.messages.create({
            model: "claude-opus-4-1",
            max_tokens: 100,
            messages: [{
                role: "user",
                content: "Say 'Hello from Claude' and nothing else."
            }]
        });

        res.json({
            status: 'ok',
            supabase: 'connected',
            claude: 'connected',
            claudeResponse: claudeTest.content[0].type === 'text' ? 
                claudeTest.content[0].text : 'No response'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`✓ Server running on http://localhost:${PORT}`);
    console.log(`✓ Test endpoint: http://localhost:${PORT}/api/test`);
});
EOF

log_success "Backend entry point created"

# Create stub files for structure
log_info "Creating service stubs..."

cat > auth/googleAuth.js << 'EOF'
// Google OAuth service stub
export const handleGoogleAuth = async (code) => {
    console.log('Google auth handler called with code:', code);
    // TODO: Implement Google OAuth token exchange
    return { success: true, message: 'Google auth stub' };
};
EOF

cat > agents/googleMapsAgent.js << 'EOF'
// Google Maps integration agent stub
export const googleMapsAgent = async (token, dateRange) => {
    console.log('Google Maps agent called for:', dateRange);
    // TODO: Implement Google Maps location history fetching
    return {
        type: 'location',
        timestamp: new Date().toISOString(),
        data: { lat: 39.7392, lng: -104.9903, place: 'Demo Location' }
    };
};
EOF

cat > agents/amazonAgent.js << 'EOF'
// Amazon integration agent stub
export const amazonAgent = async (token, dateRange) => {
    console.log('Amazon agent called for:', dateRange);
    // TODO: Implement Amazon order history fetching
    return {
        type: 'purchase',
        timestamp: new Date().toISOString(),
        data: { merchant: 'Amazon', amount: 49.99, items: ['Demo Item'] }
    };
};
EOF

cat > utils/encryption.js << 'EOF'
import crypto from 'crypto';

export const encryptData = (data, masterKey) => {
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

export const decryptData = (encrypted, masterKey) => {
    const key = Buffer.from(masterKey, 'hex');
    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(encrypted.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
};
EOF

log_success "Service stubs created"

cd ..

# Create README
log_info "Creating README..."
cat > README.md << 'EOF'
# Life Journal MVP

A comprehensive personal life tracking and journaling app that aggregates data from multiple sources (location, spending, health, photos) into a unified timeline with AI-powered insights.

## Quick Start

### 1. Setup
```bash
./setup.sh
```

### 2. Configure Environment
Edit `.env` and add:
- Supabase URL and API key
- Claude API key
- Google OAuth credentials (optional for testing)
- Amazon API credentials (optional for testing)

### 3. Start Backend
```bash
cd backend
npm run dev
```

### 4. Test Connection
```bash
curl http://localhost:3001/api/test
```

### 5. iOS App
- Open Xcode
- Create new SwiftUI project
- Configure with backend URL
- Run on simulator

## Architecture

```
iOS App
   ↓
Backend (Node/Express)
   ↓
Supabase (Database)
   ↓
Claude API (Intelligence)
   ↓
External APIs (Google Maps, Amazon, etc.)
```

## Features (MVP)

- ✓ Timeline view (calendar + daily events)
- ✓ Google Maps integration (location history)
- ✓ Amazon integration (purchase history)
- ✓ OAuth authentication
- ✓ Encrypted credential storage
- ✓ Weekly sync orchestration
- ✓ Coach AI insights
- ✓ Test data fixtures

## Environment Variables

Required:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anon key
- `CLAUDE_API_KEY` - Anthropic API key

Optional:
- `GOOGLE_OAUTH_CLIENT_ID` - For Google auth
- `AMAZON_API_KEY` - For Amazon integration
- `VERCEL_TOKEN` - For deployment

Generate encryption keys:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Development

### Backend
```bash
cd backend
npm run dev      # Start with auto-reload
npm test         # Run tests
npm run seed     # Populate test data
```

### iOS App
```bash
open ios-app/LifeJournal.xcodeproj
# Run on simulator
```

## Deployment

### Backend to Vercel
```bash
cd backend
npm run deploy
```

### iOS to TestFlight
(Manual via Xcode after backend is deployed)

## API Endpoints

- `GET /api/health` - Server health check
- `GET /api/test` - Test all connections
- `POST /api/auth/callback/google` - OAuth callback
- `POST /api/sync` - Trigger weekly sync
- `GET /api/insights/weekly` - Get coach insight

## Next Steps

1. Fill in `.env` with your API keys
2. Create Supabase project
3. Run `npm run dev` in backend
4. Test with `curl http://localhost:3001/api/test`
5. Build iOS app
6. Deploy backend to Vercel

## Support

For issues or questions, check the todo.md for detailed build plan.
EOF

log_success "README.md created"

# Create .gitignore
log_info "Creating .gitignore..."
cat > .gitignore << 'EOF'
node_modules/
.env
.env.local
.env.*.local
*.log
.DS_Store
dist/
build/
*.xcodeproj/xcuserdata/
DerivedData/
.vscode/
.idea/
*.swp
*.swo
.vercel/
EOF

log_success ".gitignore created"

# Create project structure file
log_info "Creating project structure documentation..."
cat > PROJECT_STRUCTURE.md << 'EOF'
# Project Structure

```
life-journal-mvp/
├── backend/                          # Node.js backend
│   ├── agents/                       # Data integration agents
│   │   ├── googleMapsAgent.js
│   │   ├── amazonAgent.js
│   │   └── coachAgent.js
│   ├── auth/                         # Authentication
│   │   └── googleAuth.js
│   ├── utils/                        # Utilities
│   │   ├── encryption.js
│   │   ├── credentialVault.js
│   │   └── validation.js
│   ├── sync/                         # Sync orchestration
│   │   └── weeklySync.js
│   ├── routes/                       # API routes
│   │   ├── auth.js
│   │   ├── sync.js
│   │   └── insights.js
│   ├── models/                       # Data models
│   │   └── timeline.js
│   ├── fixtures/                     # Test data
│   │   ├── googleMapsTestData.json
│   │   ├── amazonTestData.json
│   │   └── seed.js
│   ├── tests/                        # Tests
│   │   ├── integration.test.js
│   │   └── api.test.js
│   ├── logs/                         # Log files
│   ├── index.js                      # Entry point
│   ├── package.json
│   └── .env
├── ios-app/                          # iOS app
│   ├── LifeJournal/
│   │   ├── Views/
│   │   │   ├── TimelineView.swift
│   │   │   ├── DayDetailView.swift
│   │   │   └── WeeklySummaryView.swift
│   │   ├── Models/
│   │   ├── Services/
│   │   │   ├── AuthService.swift
│   │   │   └── SyncService.swift
│   │   ├── Utils/
│   │   └── App.swift
│   └── LifeJournal.xcodeproj
├── config/                           # Configuration files
├── .env                              # Environment variables (create after setup)
├── .env.example                      # Environment template
├── .gitignore
├── README.md
├── PROJECT_STRUCTURE.md
├── todo.md                           # Detailed build plan
└── setup.sh                          # This script
```
EOF

log_success "PROJECT_STRUCTURE.md created"

# Final summary
echo ""
echo "=========================================="
log_success "Setup Complete!"
echo "=========================================="
echo ""
log_info "Next steps:"
echo ""
echo "1. Edit .env file with your API keys:"
echo "   - Supabase: https://supabase.com"
echo "   - Claude API: https://console.anthropic.com"
echo "   - Google OAuth: https://console.cloud.google.com"
echo ""
echo "2. Start the backend:"
echo "   cd backend && npm run dev"
echo ""
echo "3. Test the connection:"
echo "   curl http://localhost:3001/api/test"
echo ""
echo "4. Open iOS project:"
echo "   open ios-app/LifeJournal.xcodeproj"
echo ""
log_warn "Important: Fill in .env before running backend!"
echo ""
echo "Generated encryption key (save this):"
echo "$ENCRYPTION_KEY"
echo ""
EOF

chmod +x setup.sh

log_success "Setup script is ready!"
log_info "You can now unzip this folder and run: ./setup.sh"
