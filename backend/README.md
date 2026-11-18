# HealthMate AI — Backend API & Clinical Engine

FastAPI asynchronous backend for HealthMate AI. Provides medical document ingestion, OCR extraction, observation parsing, longitudinal trend analytics, daily medication routines, doctor visit pack exports, RAG-grounded health assistant, and time-limited QR sharing.

> **Medical Safety Statement:** This service processes medical records and formats information for patient review and clinician conversations. **It never diagnoses, prescribes, or makes clinical decisions.** All demo data is synthetic.

---

## 1. Tech Stack

- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+)
- **ORM & Database:** [SQLAlchemy 2.0](https://www.sqlalchemy.org/) (Async engine with `psycopg3`), [PostgreSQL 15+](https://www.postgresql.org/) (with `pgvector`)
- **Database Migrations:** [Alembic](https://alembic.sqlalchemy.org/)
- **Document Processing:** [PyMuPDF](https://pymupdf.readthedocs.io/) (`fitz`), [RapidOCR](https://github.com/RapidAI/RapidOCR) (ONNX runtime), [Pytesseract](https://pypi.org/project/pytesseract/), [Pillow](https://pillow.readthedocs.io/)
- **PDF Generation:** [ReportLab](https://www.reportlab.com/)
- **Security:** Argon2 password hashing (`pwdlib[argon2]`), PyJWT stateless bearer authentication

---

## 2. Quick Start (Windows PowerShell)

### Prerequisites
- Python 3.11, 3.12, or 3.14
- PostgreSQL instance running (Local, Docker, or Cloud e.g., [Neon](https://neon.tech))

### 1. Setup Virtual Environment
```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
```

*(On macOS/Linux: `python3 -m venv .venv && source .venv/bin/activate`)*

### 2. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```

Update `.env` with your database credentials and secret key:
```env
APP_NAME=HealthMate AI
APP_ENV=development
API_PREFIX=/api
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/healthmate_ai
JWT_SECRET_KEY=use-a-cryptographically-random-32-character-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
DOCUMENT_STORAGE_DIR=./private_uploads
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### 4. Run Database Migrations
```powershell
alembic upgrade head
```

### 5. Start the Server
```powershell
python -m uvicorn app.main:app --reload --port 8000
```
- API Root: `http://127.0.0.1:8000/api`
- Interactive Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc Documentation: `http://127.0.0.1:8000/redoc`

---

## 3. Directory Structure

```text
backend/
├── alembic/                      # Database migration scripts
│   ├── env.py                    # Alembic migration runner
│   └── versions/                 # Individual migration revisions
├── app/
│   ├── api/
│   │   ├── router.py             # Top-level API router registering all domains
│   │   └── routes/               # Route handlers (auth, care, docs, timeline, etc.)
│   ├── core/
│   │   ├── config.py             # Pydantic Settings and environment validation
│   │   ├── database.py           # Async SQLAlchemy engine & session factory
│   │   └── security.py           # Password hashing (Argon2) & JWT generation
│   ├── models/                   # SQLAlchemy declarative database models
│   │   ├── account.py            # User and account tables
│   │   ├── family_profile.py     # Family member profiles & relationships
│   │   ├── document.py           # Uploaded files, extraction status & text
│   │   ├── observation.py        # Extracted numeric lab test results & flags
│   │   ├── medication.py         # Prescriptions, schedules & dose logs
│   │   ├── appointment.py        # Visits & checklist tasks
│   │   ├── symptom.py            # Symptom journal entries
│   │   ├── doctor_sharing.py     # Time-limited sharing tokens & audit logs
│   │   └── reminder.py           # In-app and email reminders
│   ├── schemas/                  # Pydantic v2 request/response schemas
│   └── services/                 # Core clinical logic & integrations
│       ├── document.py           # PDF parsing, OCR, table detection
│       ├── medical_retrieval.py  # RAG citation grounding & search
│       ├── medical_insights.py   # Trend deltas & longitudinal changes
│       ├── visit_pack.py         # Consolidated visit pack generation & PDF export
│       └── reminder.py           # Medication reminder dispatching
├── requirements.txt              # Production dependencies
├── alembic.ini                   # Alembic configuration file
└── README.md                     # This file
```

---

## 4. API Endpoints Overview

All routes are mounted under the `/api` prefix:

### 🔐 Authentication & Account
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user account + create primary family profile |
| `POST` | `/api/auth/login` | Authenticate user credentials, returns bearer JWT token |
| `POST` | `/api/auth/forgot-password` | Request password reset email / token |
| `POST` | `/api/auth/reset-password` | Set new password using reset token |
| `GET` | `/api/account/me` | Fetch authenticated user account details |
| `PATCH` | `/api/account/name` | Update user display name |
| `GET` | `/api/account/export` | Download complete personal data archive as JSON |
| `DELETE` | `/api/account/delete` | Permanently delete account and all uploaded records |

### 👨‍👩‍👧‍👦 Family Profiles
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/family/profiles` | List family profiles owned by active account |
| `POST` | `/api/family/profiles` | Create new dependent / family member profile |
| `PUT` | `/api/family/profiles/{id}` | Update family profile demographics & emergency info |
| `DELETE` | `/api/family/profiles/{id}` | Deactivate / archive family member profile |

### 📄 Document Ingestion & Verification
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/documents/upload` | Upload PDF/image report, triggers async text extraction |
| `GET` | `/api/documents` | List uploaded documents for active profile |
| `GET` | `/api/documents/{id}/file` | Stream original uploaded file blob (authenticated) |
| `GET` | `/api/documents/{id}/text` | Get raw extracted text from OCR/PyMuPDF |
| `POST` | `/api/documents/{id}/observations` | Add manual observation result to document |
| `PATCH` | `/api/documents/{id}/observations/{obs_id}` | Edit extracted observation test name, value, or range |
| `DELETE` | `/api/documents/{id}/observations/{obs_id}` | Remove observation from document |
| `POST` | `/api/documents/{id}/verify` | Mark extracted results as verified by patient |
| `POST` | `/api/documents/{id}/reprocess` | Re-run text extraction and OCR pipeline |
| `DELETE` | `/api/documents/{id}` | Permanently delete document and associated observations |

### 📈 Timeline & Trends
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/timeline/trends` | Time-series data points grouped by standardized test name |
| `GET` | `/api/timeline` | Chronological activity log of clinical events |
| `GET` | `/api/insights/changes` | Calculated deltas between consecutive lab measurements |

### 💊 Medications & Doses
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/care/medications` | List active and historical prescriptions |
| `POST` | `/api/care/medications` | Add medication record with dosage and daily schedule |
| `PATCH` | `/api/care/medications/{id}` | Update prescription details or change status |
| `DELETE` | `/api/care/medications/{id}` | Delete medication entry |
| `GET` | `/api/doses/today` | List scheduled dose instances for the current calendar day |
| `POST` | `/api/doses/{id}/take` | Log dose as taken at current timestamp |
| `POST` | `/api/doses/{id}/skip` | Record dose as skipped |
| `POST` | `/api/doses/{id}/snooze` | Snooze reminder alert |
| `POST` | `/api/doses/{id}/undo` | Revert recorded dose status |
| `GET` | `/api/doses/adherence` | Calculate 7-day or 30-day medication adherence percentage |

### 🩺 Doctor Visit Pack & QR Sharing
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/visit-pack/draft` | Generate consolidated clinical summary payload |
| `POST` | `/api/visit-pack/export-pdf` | Download formatted Doctor Visit Pack as PDF |
| `GET` | `/api/doctor-sharing` | List active doctor sharing links and view counts |
| `POST` | `/api/doctor-sharing` | Create time-limited read-only link for a clinician |
| `POST` | `/api/doctor-sharing/{id}/revoke`| Immediately revoke doctor access link |
| `GET` | `/api/doctor-sharing/{id}/audit` | View access history timestamps and IP logs |
| `GET` | `/api/doctor/portal/{token}` | Public clinician view (read-only, no login required) |
| `GET` | `/api/emergency/public/{token}` | Public emergency medical card view |

### 🤖 AI Health Assistant
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat/conversations` | Start new medical question conversation |
| `POST` | `/api/chat/messages` | Ask question, returns RAG answer with exact source citations |
| `POST` | `/api/quick-reference` | Medical term or lab test plain-language glossary lookup |
| `GET` | `/api/chat/usage` | Check daily question limits and quota consumption |

---

## 5. Document Processing Pipeline

```mermaid
flowchart LR
    Upload["Upload PDF / Image"] --> Inspect["Inspect MIME Type"]
    Inspect -->|Digital PDF| PyMuPDF["PyMuPDF (fitz) Extract Text"]
    Inspect -->|Image / Scanned| RapidOCR["RapidOCR ONNX Engine"]
    PyMuPDF --> Parse["Extract Biomarkers, Values & Ranges"]
    RapidOCR --> Parse
    Parse --> Draft["Save as Draft Observations"]
    Draft --> Human["Human Review & Verification"]
    Human --> Verified[("Verified Clinical Record")]
```

1. **Extraction:**
   - PDFs with embedded text layers are read directly via PyMuPDF for 100% text fidelity.
   - Scanned PDFs and images are processed using the local RapidOCR ONNX runtime or Tesseract.
2. **Observation Parsing:**
   - Extracted text lines are evaluated for test names, numbers, standard units (mg/dL, mmol/L, %, etc.), and printed reference intervals.
3. **Provenance Tracking:**
   - Every observation retains its `document_id`, `page_number`, and source text string for transparent auditability.

---

## 6. AI & RAG Configuration

HealthMate AI supports multiple LLM providers via environment variables in `.env`:

```env
# auto (uses Groq if set, else OpenAI, else offline engine) | groq | openai | none
LLM_PROVIDER=auto

# Groq Configuration (Ultra-fast inference)
GROQ_API_KEY=gsk_...
GROQ_MODEL=openai/gpt-oss-120b

# OpenAI Configuration (Alternative)
# OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4o-mini

# Quota Controls
AI_DAILY_CHAT_LIMIT=20
AI_DAILY_QUICK_REFERENCE_LIMIT=20
```

> **Offline Fallback Guarantee:** If no API keys are provided or an external service is unavailable, HealthMate automatically falls back to its internal, deterministic search engine that extracts exact quotes from verified records without any network call.

---

## 7. Database Migrations (Alembic)

When modifying SQLAlchemy models in `app/models/`:

1. **Generate migration script:**
   ```powershell
   alembic revision --autogenerate -m "describe schema change"
   ```
2. **Apply migrations:**
   ```powershell
   alembic upgrade head
   ```
3. **Rollback one revision:**
   ```powershell
   alembic downgrade -1
   ```

---

## 8. Production Deployment Guidelines

1. **Production Server:** Run behind Gunicorn with Uvicorn worker processes:
   ```bash
   gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
   ```
2. **Persistent Storage:** Ensure `DOCUMENT_STORAGE_DIR` points to a persistent volume (e.g., Docker volume, AWS EBS, Render Disk) with strict read/write permissions.
3. **Database:** Use connection pooling with `sslmode=require` on managed PostgreSQL (e.g. Neon, AWS RDS, Supabase).
4. **CORS:** Restrict `FRONTEND_ORIGINS` strictly to your production domain(s); wildcards (`*`) are rejected when `APP_ENV=production`.
5. **Secrets:** Generate `JWT_SECRET_KEY` using high-entropy randomness:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```
