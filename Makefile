.PHONY: setup dev test deploy seed clean help

help:
	@echo "Life Journal MVP - Development Commands"
	@echo ""
	@echo "Setup & Install:"
	@echo "  make setup          - Run initial setup"
	@echo "  make install        - Install dependencies"
	@echo ""
	@echo "Development:"
	@echo "  make dev            - Start backend in dev mode (with auto-reload)"
	@echo "  make test           - Run all tests"
	@echo "  make seed           - Populate test data"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy         - Deploy backend to Vercel"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean          - Clean node_modules and build artifacts"
	@echo "  make env            - Show environment setup"
	@echo "  make logs           - Tail server logs"

setup:
	@./setup.sh

install:
	@cd backend && npm install

dev:
	@cd backend && npm run dev

test:
	@cd backend && npm test

seed:
	@cd backend && npm run seed

deploy:
	@cd backend && npm run deploy

clean:
	@rm -rf backend/node_modules
	@rm -rf backend/logs/*
	@rm -rf backend/dist
	@echo "✓ Cleaned"

env:
	@echo "Environment Setup Required:"
	@echo ""
	@echo "1. Claude API Key:"
	@echo "   Get from: https://console.anthropic.com"
	@echo "   Add to .env: CLAUDE_API_KEY=sk-ant-..."
	@echo ""
	@echo "2. Supabase Project:"
	@echo "   Create at: https://supabase.com"
	@echo "   Add to .env:"
	@echo "   - SUPABASE_URL=https://xxxx.supabase.co"
	@echo "   - SUPABASE_ANON_KEY=eyJhbGc..."
	@echo ""
	@echo "3. (Optional) Google OAuth:"
	@echo "   Create at: https://console.cloud.google.com"
	@echo "   Add to .env:"
	@echo "   - GOOGLE_OAUTH_CLIENT_ID=xxxx.apps.googleusercontent.com"
	@echo "   - GOOGLE_OAUTH_SECRET=xxx"
	@echo ""

logs:
	@tail -f backend/logs/server.log 2>/dev/null || echo "No logs yet (start server with 'make dev')"

.DEFAULT_GOAL := help
