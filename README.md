# HealthMate AI — Personal & Family Health Records Workspace

[![FastAPI](https://img.shields.io/badge/FastAPI-0.162.0-009688.svg?style=flat&logo=FastAPI&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB.svg?style=flat&logo=React&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-3178C6.svg?style=flat&logo=TypeScript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.19-38B2AC.svg?style=flat&logo=Tailwind-CSS&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791.svg?style=flat&logo=PostgreSQL&logoColor=white)](https://www.postgresql.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?style=flat&logo=Python&logoColor=white)](https://www.python.org/)
[![Vitest](https://img.shields.io/badge/Vitest-Passed_167_Tests-6E9F18.svg?style=flat&logo=Vitest&logoColor=white)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Carry your health, not your paperwork.**  
> HealthMate AI is a privacy-first personal and family clinical records suite. It transforms scattered medical documents, lab results, prescriptions, and scans into structured, human-verified health histories, tracks longitudinal vitals and lab trends, manages daily medication routines, and generates verifiable, time-limited Doctor Visit Packs and Emergency QR links.

---

> [!IMPORTANT]
> **Clinical Safety & Ethical Boundary:**
> HealthMate AI explains existing records and helps users prepare for clinician appointments. **It never diagnoses diseases, prescribes medicines, recommends treatments, or replaces professional medical judgment.** If you experience severe or sudden symptoms, contact your local emergency services immediately. All demo and test data is synthetic.

---

## 🌟 Core Capabilities

### 1. 🗂️ Multimodal Health Records Ingestion & Human-in-the-Loop Verification
- **Smart Extraction:** Ingests PDFs, scanned documents, and smartphone photos of lab reports and prescriptions.
- **OCR Engine:** RapidOCR and PyMuPDF text extraction with high-precision parsing of lab test names, numeric values, standard units, and reference ranges.
- **Verification Policy:** Raw extractions are treated as drafts until confirmed by the user against the original source document via an accessible side-by-side comparison modal.
- **Manual Results Entry:** Type in lab reports or clinical observations directly without uploading files.

### 2. 📈 Longitudinal Trend Tracking & Biomarker Analytics
- **Visual Trends:** Interactive, responsive SVG time-series charts displaying biomarker trajectories (e.g., HbA1c, Blood Glucose, Lipid Profiles, Thyroid markers, Blood Pressure).
- **Report-Grounded Reference Ranges:** Highlights normal and out-of-range bands strictly from lab-printed reference intervals (never guessed).
- **Accessible Data Tables:** Complete table view alternative for screen readers and tabular data export.
- **Change Highlights:** Automatic delta calculations comparing the latest reading with previous visits.

### 3. 💊 Medication Management & Daily Dose Routine
- **Prescription Schedules:** Daily recurring schedules with customizable morning, afternoon, evening, and bedtime dose slots.
- **Actionable Tracking:** One-click dose logging (`Take`, `Skip`, `Snooze`, `Undo`) with real-time adherence calculation over the past 7 days.
- **Notification Support:** Configurable email and in-app reminder dispatching so doses and refill dates are never missed.

### 4. 🩺 Doctor Visit Pack & QR Sharing
- **Consolidated Summary:** Select specific records, active medications, observations, and symptom notes for an upcoming clinician visit.
- **Doctor Questions Builder:** Write and organize specific questions before short appointments.
- **Export Options:** One-click clean PDF download (via ReportLab) and print-optimized clinic slips.
- **Time-Limited Doctor Sharing:** Create read-only links (24h, 3 days, 7 days, 30 days) accessible via QR code with full audit trail logging and instant one-tap revocation.

### 5. 🚨 Instant Emergency Medical Card
- **Public Emergency QR:** A dedicated, lightweight mobile page (`/e/:token`) accessible to first responders without login.
- **Life-Critical Details:** Displays blood group, documented severe allergies, active conditions, and emergency contact phone links.
- **User Control:** Off by default; can be regenerated, rotated, or disabled instantly at any time.

### 6. 🤖 Citation-Grounded AI Health Assistant
- **Strict Evidence Grounding:** Answers questions exclusively using verified patient records and displays interactive citation badges (`[S1]`, `[S2]`) linking to the exact document page and excerpt.
- **Zero Hallucination Policy:** Explicitly informs the user if a test or observation is absent from records rather than inventing answers.
- **Medical Glossary & Quick Reference:** Plain-language explanations of medical terminology, diagnostic tests, and reference ranges.
- **Offline / Zero-AI Fallback:** Works seamlessly even without an external LLM key using an internal deterministic search engine.

### 7. 👨‍👩‍👧‍👦 Multi-Profile Family Workspace & Elder Mode
- **Family Profiles:** Manage independent, strictly isolated records for children, parents, spouses, and dependents under one account.
- **Elder-Friendly "Simple Mode":** One-touch UI mode with high-contrast elements, 20px+ base typography, 52px touch targets, and a simplified 3-tab layout (Medicines, Records, Doctor Pack).

### 8. 🔒 Privacy Center & Data Ownership
- **GDPR / Privacy Compliance:** Complete audit trail of every access by doctor links.
- **Data Portability:** One-click full account export to standard JSON format.
- **Complete Deletion:** Permanent account, document, and profile deletion verified by explicit confirmation phrase and password verification.
- **Duplicate Detection:** Automatic candidate detection for accidental duplicate uploads.

---

## 🏗️ Architecture & Technology Stack

```mermaid
flowchart TD
    subgraph Client ["Client Layer (Responsive React SPA)"]
        UI["React 18 + Vite + TypeScript"]
        Tailwind["Tailwind CSS + CSS Design Tokens"]
        Router["React Router v7"]
        Query["TanStack React Query"]
    end

    subgraph Server ["Backend API Layer (FastAPI)"]
        FastAPI["FastAPI 0.162 (Async Python)"]
        Auth["Argon2id + JWT Security"]
        DocService["PyMuPDF + RapidOCR Parser"]
        RAG["Citation-Grounded Retrieval Engine"]
        VisitPackService["ReportLab PDF Exporter"]
    end

    subgraph Data ["Persistence & Storage"]
        Postgres[("PostgreSQL 16 + pgvector")]
        Storage[("Secure Document Storage Volume")]
    end

    subgraph External ["External Services (Optional)"]
        LLM["Groq / OpenAI API"]
        SMTP["SMTP Mail Server"]
    end

    UI -->|REST / JSON| FastAPI
    FastAPI --> Postgres
    FastAPI --> Storage
    FastAPI -.-> LLM
    FastAPI -.-> SMTP
```

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite 5, Tailwind CSS, Lucide Icons, Framer Motion, TanStack Query |
| **Backend** | Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2 (Async), Alembic, Uvicorn |
| **Database** | PostgreSQL 15+ (with `pgvector` extension for semantic retrieval) |
| **Document Processing** | PyMuPDF (fitz), RapidOCR ONNX Runtime, Tesseract OCR, Pillow, ReportLab |
| **Security** | Argon2 password hashing, stateless HS256 JWT, CORS strict policies, row-level profile isolation |
| **Testing** | Vitest, React Testing Library, Playwright (E2E), Pytest, AnyIO |

---

## 📁 Repository Structure

```text
Healthmate_AI/
├── backend/                       # FastAPI application & clinical engine
│   ├── app/
│   │   ├── api/routes/            # REST API route handlers
│   │   ├── core/                  # Database connection, config, security & JWT
│   │   ├── models/                # SQLAlchemy database models
│   │   ├── schemas/               # Pydantic validation schemas
│   │   └── services/              # Document extraction, RAG, medications, audit services
│   ├── alembic/                   # Database migrations
│   ├── tests/                     # Pytest automated test suites
│   ├── requirements.txt           # Python dependencies
│   ├── .env.example               # Backend environment template
│   └── README.md                  # Backend developer documentation
│
├── frontend/                      # React SPA with responsive design system
│   ├── src/
│   │   ├── app/                   # AppLayout, Router, ProtectedRoute, QueryClient
│   │   ├── api/                   # Strongly-typed API client
│   │   ├── components/            # UI components, layout shell, feedback & health cards
│   │   ├── features/              # Feature modules (dashboard, records, trends, assistant, etc.)
│   │   ├── context/               # AuthContext & session management
│   │   ├── i18n/                  # Multi-language translations (EN, BN, HI)
│   │   └── styles/                # CSS variable design tokens & Tailwind utilities
│   ├── public/                    # PWA manifest, favicons & assets
│   ├── package.json               # Node.js dependencies & scripts
│   ├── vite.config.ts             # Vite configuration
│   └── README.md                  # Frontend design and developer guide
│
├── HealthMate_AI_Docs_v4/         # Comprehensive product & engineering specifications
│   ├── PRD.md                     # Product Requirements Document
│   ├── ARCHITECTURE.md            # System architecture & deployment topology
│   ├── API.md                     # REST API conventions & payload specs
│   ├── DATABASE.md                # ER diagrams & schema lifecycle
│   ├── SECURITY.md                # Threat modeling & security controls
│   └── TESTING.md                 # Test plan & quality guidelines
│
├── fixtures/                      # Synthetic medical test reports (CBC, Lipid, Prescriptions)
├── .gitignore                     # Root git ignore
└── README.md                      # Project master documentation (this file)
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v20+ and `npm` v10+
- **Python**: v3.11+ (Python 3.12 or 3.14 recommended)
- **PostgreSQL**: PostgreSQL 15+ database (e.g. local PostgreSQL, Docker, or [Neon](https://neon.tech))

---

### Step 1: Backend Setup

1. **Navigate to the backend directory:**
   ```powershell
   cd backend
   ```

2. **Create and activate a virtual environment:**
   ```powershell
   # Windows PowerShell
   python -m venv .venv
   .venv\Scripts\activate

   # macOS / Linux
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   ```powershell
   Copy-Item .env.example .env
   ```
   Open `.env` and configure:
   ```env
   DATABASE_URL=postgresql+psycopg://username:password@localhost:5432/healthmate_ai
   JWT_SECRET_KEY=your-secure-32-character-random-secret
   DOCUMENT_STORAGE_DIR=./private_uploads
   ```

5. **Run database migrations:**
   ```bash
   alembic upgrade head
   ```

6. **Start the backend server:**
   ```bash
   python -m uvicorn app.main:app --reload
   ```
   The backend API will be live at `http://127.0.0.1:8000`.  
   Interactive Swagger docs are available at `http://127.0.0.1:8000/docs`.

---

### Step 2: Frontend Setup

1. **Open a new terminal and navigate to `frontend`:**
   ```powershell
   cd frontend
   ```

2. **Install Node packages:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```powershell
   Copy-Item .env.example .env
   ```
   Ensure `.env` contains:
   ```env
   VITE_API_BASE_URL=http://127.0.0.1:8000
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

---

## 🧪 Testing

### Frontend Test Suite (Vitest)
HealthMate AI includes 167 automated unit and integration tests covering all features, auth flows, date handling, and responsive navigation:
```bash
cd frontend
npm test
```
To run tests with UI coverage in watch mode:
```bash
npx vitest
```

### Backend Test Suite (Pytest)
```bash
cd backend
python -m pytest
```

---

## 🌐 Production Deployment (Vercel & Render)

HealthMate AI is pre-configured for production deployment:
- **Frontend on Vercel:** Automated SPA routing via [`frontend/vercel.json`](frontend/vercel.json) and root [`vercel.json`](vercel.json).
- **Backend on Render:** Automated deployment via [`render.yaml`](render.yaml), [`backend/Dockerfile`](backend/Dockerfile), and [`backend/start.sh`](backend/start.sh).
- **Database on Neon:** Managed PostgreSQL 16 with the `pgvector` extension.

For complete step-by-step instructions with environment variable mappings and CORS configuration, see **[DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)**.

---

## 🛡️ Security & Privacy Guardrails

1. **Row-Level Profile Scoping:** Every health record, observation, symptom, and reminder query enforces explicit `profile_id` and `user_id` validation. Users cannot query records from another account.
2. **Deterministic Fallbacks:** The AI Assistant uses strict RAG prompting with exact source citations. When no external LLM key is provided, an offline retrieval engine answers without external network calls.
3. **Stateless Session Tokens:** JWT tokens are validated per-request and expire within 15 minutes with rolling refresh.
4. **Isolated Emergency Card:** The public QR endpoint `/e/:token` only returns non-sensitive life-saving data (blood type, allergies, conditions, emergency contact). Medical history, doctor notes, and lab reports are excluded.
5. **No Diagnosis Guarantee:** Safety banners and medical disclaimers are enforced across all customer-facing views.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 🤝 Contributing

Contributions, feedback, and security reviews are welcome! Please review [HealthMate_AI_Docs_v4/CONTRIBUTING.md](HealthMate_AI_Docs_v4/CONTRIBUTING.md) for branch naming, commit standards, and pull request guidelines.
