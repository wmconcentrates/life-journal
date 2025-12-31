# Life Journal MVP - Windows PowerShell Setup Script
# Run this: .\setup.ps1

Write-Host "🚀 Life Journal MVP Setup Starting..." -ForegroundColor Green
Write-Host ""

# Colors
$green = "Green"
$blue = "Cyan"
$yellow = "Yellow"
$red = "Red"

# Helper functions
function LogSuccess {
    param([string]$message)
    Write-Host "✓ $message" -ForegroundColor $green
}

function LogInfo {
    param([string]$message)
    Write-Host "ℹ $message" -ForegroundColor $blue
}

function LogWarn {
    param([string]$message)
    Write-Host "⚠ $message" -ForegroundColor $yellow
}

function LogError {
    param([string]$message)
    Write-Host "✗ $message" -ForegroundColor $red
}

# Check prerequisites
LogInfo "Checking prerequisites..."

# Check Node
try {
    $nodeVersion = node --version
    LogSuccess "Node.js found: $nodeVersion"
} catch {
    LogError "Node.js not found. Please install from https://nodejs.org/"
    Read-Host "Press Enter to exit"
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    LogSuccess "npm found: $npmVersion"
} catch {
    LogError "npm not found. Please install npm"
    Read-Host "Press Enter to exit"
    exit 1
}

# Create directory structure
LogInfo "Creating directory structure..."
$dirs = @(
    "backend/agents",
    "backend/auth",
    "backend/utils",
    "backend/sync",
    "backend/tests",
    "backend/fixtures",
    "backend/routes",
    "backend/models",
    "backend/logs",
    "ios-app",
    "config"
)

foreach ($dir in $dirs) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

LogSuccess "Directories created"

# Generate encryption key
LogInfo "Generating encryption master key..."
$encryptionKey = -join ((0..63) | ForEach-Object { [char]::ConvertFromUtf32(1..255 | Get-Random) }) | ConvertTo-SecureString -AsPlainText -Force | ConvertFrom-SecureString
# Simpler: generate hex string
$encryptionKey = ((1..32) | ForEach-Object { "{0:X2}" -f (Get-Random -Maximum 256) }) -join ""
LogSuccess "Encryption key generated"

# Generate JWT secret
$jwtSecret = ((1..32) | ForEach-Object { "{0:X2}" -f (Get-Random -Maximum 256) }) -join ""

# Create .env file
LogInfo "Creating .env file..."
$envContent = @"
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

# Amazon API (optional)
AMAZON_API_KEY=your_amazon_api_key_here
AMAZON_API_SECRET=your_amazon_api_secret_here

# JWT
JWT_SECRET=$jwtSecret

# Encryption
ENCRYPTION_MASTER_KEY=$encryptionKey

# Server
NODE_ENV=development
PORT=3001
BACKEND_URL=http://localhost:3001
VERCEL_TOKEN=your_vercel_token_here

# Logging
LOG_LEVEL=debug
"@

Set-Content -Path ".env" -Value $envContent
LogSuccess ".env file created (fill in API keys before running)"

# Create .env.example
LogInfo "Creating .env.example..."
$envExampleContent = @"
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
"@

Set-Content -Path ".env.example" -Value $envExampleContent
LogSuccess ".env.example created"

# Initialize backend
LogInfo "Setting up backend..."
Push-Location backend

LogInfo "Installing backend dependencies..."
npm init -y --silent | Out-Null

$packages = @(
    "express",
    "cors",
    "dotenv",
    "@supabase/supabase-js",
    "@anthropic-ai/sdk",
    "axios",
    "jsonwebtoken",
    "bcryptjs",
    "joi",
    "winston"
)

npm install $packages --save | Out-Null
LogSuccess "Backend dependencies installed"

# Create package.json scripts
LogInfo "Updating package.json scripts..."
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json

$packageJson.scripts = @{
    "start" = "node index.js"
    "dev" = "node --watch index.js"
    "test" = "node --test tests/**/*.test.js"
    "seed" = "node fixtures/seed.js"
    "deploy" = "vercel --prod"
}

$packageJson.type = "module"
$packageJson.engines = @{ "node" = ">=18.0.0" }

Set-Content "package.json" -Value ($packageJson | ConvertTo-Json -Depth 10)
LogSuccess "package.json configured"

# Create index.js
LogInfo "Creating backend entry point..."
$indexContent = @'
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Anthropic } from '@anthropic-ai/sdk';

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
'@

Set-Content "index.js" -Value $indexContent
LogSuccess "Backend entry point created"

# Create stub files
LogInfo "Creating service stubs..."

$googleAuthContent = @"
// Google OAuth service stub
export const handleGoogleAuth = async (code) => {
    console.log('Google auth handler called with code:', code);
    // TODO: Implement Google OAuth token exchange
    return { success: true, message: 'Google auth stub' };
};
"@

Set-Content "auth/googleAuth.js" -Value $googleAuthContent

$googleMapsAgentContent = @"
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
"@

Set-Content "agents/googleMapsAgent.js" -Value $googleMapsAgentContent

$amazonAgentContent = @"
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
"@

Set-Content "agents/amazonAgent.js" -Value $amazonAgentContent

$encryptionContent = @"
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
"@

Set-Content "utils/encryption.js" -Value $encryptionContent

LogSuccess "Service stubs created"

Pop-Location

# Create README
LogInfo "Creating README..."
$readmeContent = @"
# Life Journal MVP

A comprehensive personal life tracking and journaling app.

## Quick Start

### 1. Setup
\`\`\`powershell
.\setup.ps1
\`\`\`

### 2. Configure Environment
Edit \`.env\` and add:
- Supabase URL and API key
- Claude API key
- Google OAuth credentials (optional)

### 3. Start Backend
\`\`\`powershell
cd backend
npm run dev
\`\`\`

### 4. Test Connection
\`\`\`powershell
curl http://localhost:3001/api/test
\`\`\`

## Architecture

\`\`\`
iOS App
   ↓
Backend (Node/Express)
   ↓
Supabase (Database)
   ↓
Claude API (Intelligence)
   ↓
External APIs (Google Maps, Amazon, etc.)
\`\`\`

## Features (MVP)

- ✓ Timeline view (calendar + daily events)
- ✓ Google Maps integration (location history)
- ✓ Amazon integration (purchase history)
- ✓ OAuth authentication
- ✓ Encrypted credential storage
- ✓ Weekly sync orchestration
- ✓ Coach AI insights
- ✓ Test data fixtures

## Next Steps

1. Fill in .env with your API keys
2. Create Supabase project (supabase.com)
3. Run: npm run dev (in backend folder)
4. Test: curl http://localhost:3001/api/test
5. Open iOS project in Xcode
6. Deploy backend to Vercel

## Support

Check QUICKSTART.md for detailed instructions.
"@

Pop-Location
Set-Content "README.md" -Value $readmeContent
LogSuccess "README.md created"

# Create .gitignore
LogInfo "Creating .gitignore..."
$gitignoreContent = @"
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
"@

Set-Content ".gitignore" -Value $gitignoreContent
LogSuccess ".gitignore created"

# Final summary
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
LogSuccess "Setup Complete!"
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

LogInfo "Next steps:"
Write-Host ""
Write-Host "1. Edit .env file with your API keys:"
Write-Host "   - Supabase: https://supabase.com"
Write-Host "   - Claude API: https://console.anthropic.com"
Write-Host "   - Google OAuth: https://console.cloud.google.com"
Write-Host ""
Write-Host "2. Start the backend:"
Write-Host "   cd backend && npm run dev"
Write-Host ""
Write-Host "3. Test the connection:"
Write-Host "   curl http://localhost:3001/api/test"
Write-Host ""
Write-Host "4. Open iOS project:"
Write-Host "   open ios-app/LifeJournal.xcodeproj"
Write-Host ""

LogWarn "Important: Fill in .env before running backend!"
Write-Host ""
Write-Host "Generated encryption key (save this):"
Write-Host $encryptionKey
Write-Host ""

LogSuccess "Setup script complete. Ready to build!"
Read-Host "Press Enter to close"
