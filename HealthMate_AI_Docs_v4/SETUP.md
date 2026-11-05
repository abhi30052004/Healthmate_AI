# Local Development Setup — Windows PowerShell

This guide is a reference setup. Match package versions and commands to the current repository lockfiles and scripts.

## 1. Prerequisites
- Windows 10/11 and PowerShell.
- Git.
- Python version supported by `backend/pyproject.toml` or requirements.
- Node.js LTS supported by frontend.
- Neon PostgreSQL or another PostgreSQL database.
- Tesseract OCR (optional if OCR is configured externally).
- Editor such as VS Code / Antigravity.

No local Docker is required for the managed Neon development path.

## 2. Clone and inspect
```powershell
git clone <YOUR_REPOSITORY_URL>
cd Healthmate_AI
Get-ChildItem
Get-ChildItem backend
Get-ChildItem frontend
```

## 3. Backend environment
```powershell
Copy-Item backend\.env.example backend\.env
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```
If PowerShell blocks activation, use the approved local execution-policy approach or invoke `.venv\Scripts\python.exe` directly.

Example environment variables (use the exact names expected by current `config.py`):
```dotenv
APP_ENV=development
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST/DB?sslmode=require
JWT_SECRET=GENERATE_A_LONG_RANDOM_SECRET
AI_ENABLED=false
LLM_PROVIDER=offline
OPENAI_API_KEY=
OPENAI_MODEL=<approved-model>
AI_DAILY_CHAT_LIMIT=20
AI_DAILY_EXTRACT_LIMIT=5
AI_MONTHLY_BUDGET_USD=5
STORAGE_BACKEND=local
APP_BASE_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
```
Do not copy example credentials into production. Verify whether the project uses `APP_ENV`, `ENVIRONMENT` or another exact setting name.

## 4. Database
Create a PostgreSQL database and enable required extensions:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```
Then:
```powershell
alembic upgrade head
alembic current
alembic heads
```
If current and heads differ, inspect migrations before continuing. Do not stamp or manually alter migration history to hide a mismatch.

## 5. Seed synthetic data
Use the repository's existing seed command if available:
```powershell
python -m scripts.seed_synthetic
```
Seed scripts must be idempotent, clearly identify synthetic accounts and never run automatically against production.

## 6. Run backend
```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Check:
- `GET http://127.0.0.1:8000/healthz`
- Development API docs only if enabled by configuration.

## 7. Frontend
Open a second terminal:
```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```
Set the frontend API base URL according to the current app configuration, commonly:
```dotenv
VITE_API_URL=http://127.0.0.1:8000
```
Use the actual variable consumed by the API client.

## 8. Validate
- Register/login using synthetic account.
- Create or select a profile.
- Upload a synthetic report.
- Review extracted values and verify.
- Confirm timeline and chart show the verified result.
- Ask a question and inspect citations.
- Switch profile and confirm prior profile data disappears.
- Test logout and expired-session behaviour.

## 9. Environment hygiene
- `.env` files must be gitignored.
- `.env.example` contains names and safe placeholders only.
- Rotate any credential that was committed or pasted into logs.
- Never use real patient records in local development.

## 10. v3 additions: free-first environment variables
Add to `backend/.env` (use the exact names your `config.py` reads):
```dotenv
CRON_SECRET=GENERATE_A_LONG_RANDOM_SECRET
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=GENERATE_A_RANDOM_SECRET
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:you@example.com
EMAIL_PROVIDER=brevo
EMAIL_API_KEY=
EMAIL_FROM=
AI_DAILY_VISION_LIMIT=3
```
**Test the scheduler locally:**
```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8000/internal/tick -Method Post -Headers @{ "X-Cron-Secret" = "<value>" }
```
**VAPID keys:** generate once with a supported tool (for example `pywebpush`/`web-push` CLI) and keep the private key out of the repo.
**Telegram:** create a bot with @BotFather; after deploy, set the webhook with `secret_token`. For local testing use a tunnel or skip Telegram.
**iOS push:** requires the PWA to be added to the Home Screen.

## Quick Reference AI configuration (v4)

The following is a configuration example only. First inspect `backend/app/config.py` (or the actual settings module) and map these values to the exact supported setting names. Never expose `OPENAI_API_KEY` through a `VITE_` variable or frontend environment file.

```dotenv
AI_ENABLED=true
LLM_PROVIDER=openai
OPENAI_API_KEY=your-server-side-secret
OPENAI_MODEL=your-approved-model-id
AI_DAILY_QUICK_REFERENCE_LIMIT=20
AI_MONTHLY_BUDGET_USD=5
AI_REQUEST_TIMEOUT_SECONDS=20
AI_MAX_OUTPUT_TOKENS=500
```

For local development without API spend, set AI disabled or use the repository's offline/mock adapter. Verify that the Quick Reference page still works in retrieval-only mode. The sample limits are starting defaults, not free credits or a price guarantee. Do not commit `.env` files or real keys.
