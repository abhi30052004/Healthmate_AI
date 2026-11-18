# HealthMate AI — Vercel & Render Deployment Guide

This guide explains how to deploy **HealthMate AI** into production with:
- **Backend (FastAPI)** hosted on **[Render](https://render.com)**
- **Frontend (React + Vite)** hosted on **[Vercel](https://vercel.com)**
- **Database (PostgreSQL + pgvector)** hosted on **[Neon](https://neon.tech)** (or Render Postgres)

---

## 📋 Architecture & URLs Overview

```text
+------------------------------+             +-------------------------------+
|     Vercel (Frontend)        |  REST API   |      Render (Backend)         |
|  https://<app>.vercel.app    | ----------> | https://<backend>.onrender.com|
+------------------------------+             +---------------+---------------+
                                                             |
                                                             v  psycopg3
                                             +-------------------------------+
                                             |  PostgreSQL 16 + pgvector     |
                                             | (Neon, Supabase, or Render)   |
                                             +-------------------------------+
```

---

## 🗄️ Step 1: Set Up Managed PostgreSQL (Neon recommended)

HealthMate AI uses PostgreSQL with the `pgvector` extension for clinical observation storage and semantic search.

1. Go to **[Neon](https://neon.tech)** and create a free project.
2. In the Neon SQL Editor, ensure `pgvector` is enabled:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Copy your database connection string:
   ```text
   postgresql+psycopg://<user>:<password>@<ep-xyz>.us-east-2.aws.neon.tech/<dbname>?sslmode=require
   ```
   *(Note: Ensure the driver prefix is `postgresql+psycopg://`)*

---

## 🚀 Step 2: Deploy Backend to Render

You can deploy using either the automated **Render Blueprint (`render.yaml`)** or manual **Web Service**.

### Option A: Automated Blueprint (Recommended)
1. Push your repository to GitHub.
2. Go to **[Render Dashboard](https://dashboard.render.com/)** → Click **New +** → **Blueprint**.
3. Select your GitHub repository.
4. Render will read `render.yaml` automatically.
5. Provide the required environment variables when prompted:
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `FRONTEND_ORIGINS`: `https://your-frontend.vercel.app` *(can be updated after Vercel deploy)*.
   - `FRONTEND_BASE_URL`: `https://your-frontend.vercel.app`
6. Click **Apply**. Render will run migrations and start the service.

---

### Option B: Manual Web Service
1. In Render Dashboard, click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure the service settings:
   - **Name:** `healthmate-backend`
   - **Region:** Ohio (US East) or Frankfurt (EU) (close to your database)
   - **Root Directory:** `backend`
   - **Runtime:** `Python` *(or `Docker` to use `backend/Dockerfile`)*
   - **Build Command:** `pip install -r requirements.txt && alembic upgrade head`
   - **Start Command:** `./start.sh` *(or `uvicorn app.main:app --host 0.0.0.0 --port $PORT`)*
4. Under **Environment Variables**, add:

| Variable | Value / Notes |
|---|---|
| `APP_NAME` | `HealthMate AI` |
| `APP_ENV` | `production` |
| `API_PREFIX` | `/api` |
| `DATABASE_URL` | `postgresql+psycopg://...` (your Neon/Postgres connection string) |
| `JWT_SECRET_KEY` | *(Generate a random 32+ char secret: `openssl rand -hex 32`)* |
| `JWT_ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` |
| `FRONTEND_ORIGINS` | `https://your-app.vercel.app` |
| `FRONTEND_BASE_URL` | `https://your-app.vercel.app` |
| `DOCUMENT_STORAGE_DIR` | `/tmp/uploads` |
| `LLM_PROVIDER` | `auto` |
| `GROQ_API_KEY` | *(Optional: Groq API key for high-speed AI assistance)* |
| `GROQ_MODEL` | `openai/gpt-oss-120b` |

5. Under **Health Check Path**, enter: `/health/live`
6. Click **Create Web Service**.
7. Once deployed, note your Render backend URL (e.g. `https://healthmate-backend.onrender.com`).
8. Verify health check by visiting:
   `https://healthmate-backend.onrender.com/health/live` → `{"status": "ok", "service": "healthmate-api"}`

---

## ⚡ Step 3: Deploy Frontend to Vercel

1. Go to **[Vercel Dashboard](https://vercel.com/new)**.
2. Import your GitHub repository.
3. In the project configuration screen:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click `Edit` and select `frontend` *(or leave as `.` since root `vercel.json` is configured)*.
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Under **Environment Variables**, add:

| Key | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://healthmate-backend.onrender.com` *(your Render backend URL)* |

5. Click **Deploy**.
6. Vercel will build and assign a production URL (e.g., `https://healthmate-ai.vercel.app`).

---

## 🔗 Step 4: Final Connection (CORS Update)

Now that you have your Vercel URL:
1. Return to **Render Dashboard** → Select `healthmate-backend` → **Environment**.
2. Update `FRONTEND_ORIGINS` to include your exact Vercel URL:
   ```text
   https://healthmate-ai.vercel.app
   ```
   *(If using custom domains or preview branches, separate by comma: `https://healthmate-ai.vercel.app,https://yourcustomdomain.com`)*
3. Update `FRONTEND_BASE_URL`:
   ```text
   https://healthmate-ai.vercel.app
   ```
4. Save Changes (Render will automatically redeploy with the updated CORS allowlist).

---

## ✅ Deployment Verification Checklist

- [ ] `/health/live` on Render backend returns `{"status": "ok"}`
- [ ] `/health/ready` on Render backend returns `{"status": "ok", "database": true, "pgvector": true}`
- [ ] Vercel frontend loads the Landing Page smoothly without console errors
- [ ] Registration (`/register`) creates a user and primary profile in PostgreSQL
- [ ] Login (`/login`) authenticates and redirects to Dashboard (`/app/dashboard`)
- [ ] Uploading a lab report PDF or image extracts test results
- [ ] AI Assistant answers questions with source citations
- [ ] Public Emergency Card (`/e/:token`) and Clinician Link (`/s/:token`) open properly
