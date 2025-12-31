# Life Journal MVP - Quick Start Guide

## For Ralph Mode / Claude Code Execution

This folder is ready for immediate deployment with Claude Code in Ralph mode.

### What's Included

- `setup.sh` - Automated setup script (creates directories, installs dependencies)
- `todo.md` - Detailed build plan for Ralph mode
- `QUICKSTART.md` - This file
- `PROJECT_STRUCTURE.md` - Generated after setup
- `README.md` - Generated after setup

### Prerequisites

Before running setup:
1. Have Node.js 18+ installed
2. Have an Anthropic API key (from console.anthropic.com)
3. Create a free Supabase project (supabase.com)
4. (Optional) Google OAuth credentials

### Step-by-Step

#### On Your PC

1. **Unzip this folder**
   ```bash
   unzip life-journal-setup.zip
   cd life-journal-setup
   ```

2. **Run the setup script**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```
   
   This will:
   - Create directory structure
   - Generate encryption keys
   - Create `.env` file with auto-generated secrets
   - Install all npm dependencies
   - Create stub files
   - Generate documentation

3. **Configure environment**
   ```bash
   # Edit .env and fill in:
   SUPABASE_URL=your_supabase_url_here
   SUPABASE_ANON_KEY=your_supabase_anon_key_here
   CLAUDE_API_KEY=your_claude_api_key_here
   ```

4. **Point Ralph Mode at todo.md**
   ```bash
   # Ralph mode command (or via Claude Code UI)
   ralph-mode ./todo.md
   ```

5. **Let it run** (no interruption needed)
   - Ralph mode will execute the entire todo.md
   - It will build backend, create iOS app structure, run tests
   - It will fail and retry until everything passes
   - You can check progress in logs/

#### Key Files Ralph Mode Will Create

After setup.sh + Ralph mode completes, you'll have:

**Backend**
```
backend/
├── index.js (main server)
├── auth/googleAuth.js
├── agents/
│   ├── googleMapsAgent.js
│   ├── amazonAgent.js
│   ├── coachAgent.js
│   └── summaryAgent.js
├── utils/
│   ├── encryption.js
│   ├── credentialVault.js
│   └── keyManagement.js
├── sync/weeklySync.js
├── routes/ (API endpoints)
├── tests/ (integration tests)
└── fixtures/ (test data)
```

**iOS App**
```
ios-app/
├── LifeJournal.xcodeproj (ready for Xcode)
└── LifeJournal/ (SwiftUI source)
```

#### After Ralph Mode Completes

1. **Test the backend**
   ```bash
   cd backend
   npm run dev
   # Then in another terminal:
   curl http://localhost:3001/api/test
   ```

2. **View logs**
   ```bash
   tail -f backend/logs/server.log
   ```

3. **Open iOS app**
   ```bash
   open ios-app/LifeJournal.xcodeproj
   ```

4. **Run tests**
   ```bash
   cd backend
   npm test
   ```

5. **Seed test data**
   ```bash
   cd backend
   npm run seed
   ```

### What Ralph Mode Will Do

Ralph mode will:
- ✓ Create all backend services
- ✓ Implement Google Maps agent
- ✓ Implement Amazon agent  
- ✓ Create Claude normalization agents
- ✓ Set up encryption/decryption
- ✓ Build iOS SwiftUI app
- ✓ Create auth flow (OAuth)
- ✓ Implement sync orchestration
- ✓ Build weekly summary view
- ✓ Create coach insight agent
- ✓ Add video recap generation
- ✓ Run all tests
- ✓ Deploy to Vercel (if configured)
- ✓ Build for TestFlight (if configured)

### API Keys You'll Need

1. **Claude API** - https://console.anthropic.com
   - Click "API keys" → Create new key
   - Add to .env as `CLAUDE_API_KEY`

2. **Supabase** - https://supabase.com
   - Create new project
   - In Project Settings → API, copy:
   - `SUPABASE_URL` → Project URL
   - `SUPABASE_ANON_KEY` → Anon key

3. **Google OAuth** (optional, can use test fixtures)
   - https://console.cloud.google.com
   - Create OAuth 2.0 credentials
   - Add redirect: `http://localhost:3001/auth/callback/google`

### Environment Variables

`.env` is auto-generated with:
- `ENCRYPTION_MASTER_KEY` - 256-bit hex key (auto-generated)
- `JWT_SECRET` - JWT signing key (auto-generated)
- Placeholders for API keys (fill these in)

**Never commit .env to git** (it's in .gitignore)

### Troubleshooting

**"Node not found"**
- Install Node.js: https://nodejs.org (18+)

**"npm install fails"**
- Check internet connection
- Try: `npm cache clean --force && npm install`

**"API keys missing"**
- Ralph mode will fail until .env is filled
- Fill in required keys before pointing Ralph mode at todo.md

**"Supabase connection fails"**
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
- Check that your Supabase project is active

**"Claude API fails"**
- Verify `CLAUDE_API_KEY` is valid
- Check you haven't hit rate limits

### Project Structure

After setup, you'll have:

```
life-journal-setup/
├── backend/          (Node.js server + agents)
├── ios-app/          (Xcode project)
├── config/           (Configuration)
├── .env              (Your secrets - DO NOT COMMIT)
├── .env.example      (Template)
├── .gitignore        (Ignore files)
├── README.md         (Full documentation)
├── todo.md           (Ralph mode build plan)
├── QUICKSTART.md     (This file)
└── setup.sh          (Setup script)
```

### Next Steps

1. Run `./setup.sh`
2. Fill in `.env` with API keys
3. Run Ralph mode: `ralph-mode ./todo.md`
4. Wait for completion (check logs occasionally)
5. Test backend: `curl http://localhost:3001/api/test`
6. Build iOS app in Xcode
7. Deploy backend to Vercel

### Support

- Check `README.md` for full documentation
- Check `todo.md` for detailed build steps
- Check `PROJECT_STRUCTURE.md` for file organization
- Logs are in `backend/logs/`

---

**Ready to build?** 🚀

1. Unzip
2. Run `./setup.sh`
3. Fill `.env`
4. Run Ralph mode
5. Enjoy your life journal app!
