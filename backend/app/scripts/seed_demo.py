"""Complete Demo User & Realistic Synthetic Clinical Seed System for HealthMate AI.

Usage:
    From backend dir: python -m app.scripts.seed_demo
    From repo root:   python scripts/seed_demo.py

Guarantees:
- Safe, idempotent execution (can be run repeatedly without duplicating or corrupting data).
- Isolated demo tenant: strictly modifies demo records, never touches real user data.
- Generates downloadable, styled synthetic clinical PDF documents via ReportLab.
- Populates every single application feature:
  * Patient Profile & Family Profiles
  * Medical Documents & Lab Reports (12 synthetic documents)
  * Longitudinal Medical Observations (52+ observations with flags & reference ranges)
  * Longitudinal Trends (Glucose, HbA1c, Lipids, Hemoglobin, Vitamin D)
  * Care Organizer (Medications, Appointments, Care Tasks)
  * Smart Reminders & In-App Notifications
  * Evidence-Grounded AI Medical Chat Conversations & Citations
  * Secure Doctor Sharing Sessions & Audit Logs
  * Data Quality Center & Duplicate Detection Candidates
"""

import hashlib
import os
from pathlib import Path
import shutil
import sys
import uuid
from datetime import date, datetime, timedelta, timezone

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_session_factory
from app.core.security import hash_password
from app.models.care import AppointmentRecord, FollowUpTask, MedicationRecord
from app.models.chat import MedicalChatConversation, MedicalChatMessage
from app.models.data_quality import DuplicateCandidate, DataQualityAuditLog
from app.models.doctor_sharing import DoctorSharingAuditLog, DoctorSharingSession
from app.models.document import Document, DocumentObservation
from app.models.family_profile import FamilyProfile
from app.models.reminder import Reminder
from app.models.user import User

DEMO_USER_NAME = "Abhijit Bhunia"
DEMO_USER_EMAIL = "demo@healthmate.ai"
DEMO_USER_PASSWORD = "Demo@12345"

SYNTHETIC_DISCLAIMER = (
    "SYNTHETIC MEDICAL DOCUMENT — Fictional clinical data generated solely for HealthMate AI "
    "software demonstration and testing. HealthMate AI organizes health records and does not formulate medical diagnoses."
)


def _build_pdf_report(
    dest_path: Path,
    facility_name: str,
    facility_sub: str,
    doc_title: str,
    patient_name: str,
    doc_date: str,
    ordering_physician: str,
    table_headers: list[str],
    rows: list[list[str]],
    clinical_notes: list[str] | None = None,
) -> int:
    """Generate a clean, professional medical PDF using ReportLab and return its byte size."""
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(dest_path),
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
        title=doc_title,
    )
    styles = getSampleStyleSheet()

    # Custom typography
    style_facility = ParagraphStyle(
        "Facility",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#0f172a"),
    )
    style_sub = ParagraphStyle(
        "SubHeader",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#64748b"),
    )
    style_title = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=colors.HexColor("#0f766e"),
        spaceAfter=4,
    )
    style_body = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#1e293b"),
    )
    style_disclaimer = ParagraphStyle(
        "Disclaimer",
        parent=styles["Italic"],
        fontName="Helvetica-Oblique",
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#94a3b8"),
    )

    story = []

    # 1. Facility Header
    story.append(Paragraph(facility_name, style_facility))
    story.append(Paragraph(facility_sub, style_sub))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0d9488"), spaceAfter=10))

    # 2. Patient & Specimen Metadata Box
    meta_data = [
        [
            Paragraph(f"<b>Patient:</b> {patient_name}", style_body),
            Paragraph(f"<b>MRN:</b> HM-2025-88419", style_body),
            Paragraph(f"<b>DOB:</b> 1988-06-14 (Age 38)", style_body),
        ],
        [
            Paragraph(f"<b>Date Collected:</b> {doc_date}", style_body),
            Paragraph(f"<b>Date Reported:</b> {doc_date}", style_body),
            Paragraph(f"<b>Ordering Physician:</b> {ordering_physician}", style_body),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[200, 160, 180])
    meta_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(meta_table)
    story.append(Spacer(1, 12))

    # 3. Document Title
    story.append(Paragraph(doc_title, style_title))
    story.append(Spacer(1, 4))

    # 4. Observation Table
    table_content = [[Paragraph(f"<b>{h}</b>", style_body) for h in table_headers]]
    for r in rows:
        row_cells = []
        is_abnormal = len(r) > 2 and ("HIGH" in r[2] or "LOW" in r[2] or "ABNORMAL" in r[2])
        for c_idx, cell_str in enumerate(r):
            c_style = style_body
            if is_abnormal and c_idx in (1, 2):
                c_style = ParagraphStyle(
                    f"Abnormal_{cell_str}",
                    parent=style_body,
                    fontName="Helvetica-Bold",
                    textColor=colors.HexColor("#b91c1c"),
                )
            row_cells.append(Paragraph(cell_str, c_style))
        table_content.append(row_cells)

    num_cols = len(table_headers)
    if num_cols == 5:
        col_widths = [160, 75, 75, 120, 110]
    elif num_cols == 4:
        col_widths = [190, 85, 130, 135]
    else:
        col_widths = [540 / num_cols] * num_cols

    obs_table = Table(table_content, colWidths=col_widths)
    obs_style = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
    ]
    # Alternating row background
    for i in range(1, len(table_content)):
        if i % 2 == 0:
            obs_style.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#f8fafc")))
    obs_table.setStyle(TableStyle(obs_style))
    story.append(obs_table)
    story.append(Spacer(1, 10))

    # 5. Clinical Notes if present
    if clinical_notes:
        story.append(Paragraph("<b>Clinical Notes & Findings:</b>", style_body))
        for note in clinical_notes:
            story.append(Paragraph(f"• {note}", style_body))
        story.append(Spacer(1, 10))

    # 6. Electronic Signature & Synthetic Disclaimer
    story.append(
        Paragraph(
            f"Electronically signed and verified by: <b>{ordering_physician}</b> on {doc_date}",
            style_body,
        )
    )
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1"), spaceAfter=6))
    story.append(Paragraph(SYNTHETIC_DISCLAIMER, style_disclaimer))

    doc.build(story)
    return dest_path.stat().st_size


def seed_demo_data(db: Session) -> User:
    """Idempotently seed the complete Demo User with realistic clinical data.

    Returns:
        The seeded demo User instance.
    """
    settings = get_settings()

    # Determine storage root directories (both settings-based and backend-local)
    backend_dir = Path(__file__).resolve().parent.parent.parent
    configured_storage = Path(settings.document_storage_dir).resolve()
    backend_storage = (backend_dir / "private_uploads").resolve()
    storage_roots = list({configured_storage, backend_storage})

    print(f"[*] Checking for existing demo user ({DEMO_USER_EMAIL})...")
    existing_user = db.scalars(select(User).where(User.email == DEMO_USER_EMAIL)).first()

    if existing_user is not None:
        print(f"[*] Removing existing demo user records ({existing_user.id}) for clean reseed...")
        # Clean up files on disk
        for s_root in storage_roots:
            user_dir = s_root / str(existing_user.id)
            if user_dir.exists():
                try:
                    shutil.rmtree(user_dir, ignore_errors=True)
                except Exception as exc:
                    print(f"    [!] Warning: Failed cleaning folder {user_dir}: {exc}")

        # Explicitly delete child rows to guarantee clean cascading
        db.query(DataQualityAuditLog).filter(DataQualityAuditLog.user_id == existing_user.id).delete(synchronize_session=False)
        db.query(DuplicateCandidate).filter(DuplicateCandidate.user_id == existing_user.id).delete(synchronize_session=False)
        db.query(DoctorSharingAuditLog).filter(DoctorSharingAuditLog.session_id.in_(
            db.query(DoctorSharingSession.id).filter(DoctorSharingSession.owner_id == existing_user.id)
        )).delete(synchronize_session=False)
        db.query(DoctorSharingSession).filter(DoctorSharingSession.owner_id == existing_user.id).delete(synchronize_session=False)
        db.query(Reminder).filter(Reminder.user_id == existing_user.id).delete(synchronize_session=False)
        db.query(FollowUpTask).filter(FollowUpTask.user_id == existing_user.id).delete(synchronize_session=False)
        db.query(AppointmentRecord).filter(AppointmentRecord.user_id == existing_user.id).delete(synchronize_session=False)
        db.query(MedicationRecord).filter(MedicationRecord.user_id == existing_user.id).delete(synchronize_session=False)
        db.query(MedicalChatMessage).filter(MedicalChatMessage.conversation_id.in_(
            db.query(MedicalChatConversation.id).filter(MedicalChatConversation.owner_id == existing_user.id)
        )).delete(synchronize_session=False)
        db.query(MedicalChatConversation).filter(MedicalChatConversation.owner_id == existing_user.id).delete(synchronize_session=False)
        db.query(DocumentObservation).filter(DocumentObservation.owner_id == existing_user.id).delete(synchronize_session=False)
        db.query(Document).filter(Document.owner_id == existing_user.id).delete(synchronize_session=False)
        db.query(FamilyProfile).filter(FamilyProfile.owner_id == existing_user.id).delete(synchronize_session=False)
        db.delete(existing_user)
        db.commit()
        print("    -> Previous demo user and cascaded associations cleared.")

    # 1. Create Demo User Account
    print("[*] Creating dedicated Demo User...")
    demo_user = User(
        id=uuid.uuid4(),
        name=DEMO_USER_NAME,
        email=DEMO_USER_EMAIL,
        hashed_password=hash_password(DEMO_USER_PASSWORD),
        is_active=True,
        created_at=datetime(2025, 1, 15, 8, 30, 0, tzinfo=timezone.utc),
    )
    db.add(demo_user)
    db.flush()
    print(f"    -> User created: {demo_user.name} <{demo_user.email}> (ID: {demo_user.id})")

    # Ensure upload directories exist
    for s_root in storage_roots:
        (s_root / str(demo_user.id)).mkdir(parents=True, exist_ok=True)

    # 2. Create Family Profiles
    print("[*] Populating Family Health Profiles...")
    primary_profile = FamilyProfile(
        id=uuid.uuid4(),
        owner_id=demo_user.id,
        name=DEMO_USER_NAME,
        relationship="self",
        is_primary=True,
        is_active=True,
        is_dependent=False,
        date_of_birth=date(1988, 6, 14),
        gender="male",
        blood_type="O+",
        emergency_contact_name="Sunita Bhunia",
        emergency_contact_phone="+1 (555) 234-5678",
        allergies_summary="Penicillin (cutaneous rash/urticaria); Shellfish (mild angioedema, carries EpiPen)",
        avatar_color="#0d9488",
        consent_status="authorized",
        consent_granted_at=datetime(2025, 1, 15, 8, 30, 0, tzinfo=timezone.utc),
        consent_notes="Authorized primary account holder clinical profile.",
    )

    spouse_profile = FamilyProfile(
        id=uuid.uuid4(),
        owner_id=demo_user.id,
        name="Sunita Bhunia",
        relationship="spouse",
        is_primary=False,
        is_active=True,
        is_dependent=False,
        date_of_birth=date(1990, 9, 22),
        gender="female",
        blood_type="A+",
        emergency_contact_name="Abhijit Bhunia",
        emergency_contact_phone="+1 (555) 987-6543",
        allergies_summary="No known drug allergies (NKDA)",
        avatar_color="#2563eb",
        consent_status="authorized",
        consent_granted_at=datetime(2025, 1, 20, 10, 0, 0, tzinfo=timezone.utc),
        consent_notes="Spouse authorized family health delegate.",
    )

    child_profile = FamilyProfile(
        id=uuid.uuid4(),
        owner_id=demo_user.id,
        name="Aarav Bhunia",
        relationship="child",
        is_primary=False,
        is_active=True,
        is_dependent=True,
        date_of_birth=date(2018, 3, 10),
        gender="male",
        blood_type="O+",
        emergency_contact_name="Sunita Bhunia",
        emergency_contact_phone="+1 (555) 234-5678",
        allergies_summary="Peanuts (mild hives, pediatric allergy care plan active)",
        avatar_color="#8b5cf6",
        consent_status="authorized",
        consent_granted_at=datetime(2025, 1, 20, 10, 0, 0, tzinfo=timezone.utc),
        consent_notes="Parental authorized dependent medical management.",
    )

    db.add_all([primary_profile, spouse_profile, child_profile])
    db.flush()
    print("    -> Seeded 3 family profiles (Self, Spouse, Child).")

    # 3. Document Definitions & Observation Seed Data
    print("[*] Generating 12 realistic synthetic clinical documents and lab observations...")

    # Document Specs
    doc_specs = [
        # 1. Comprehensive Metabolic Panel (Feb 2025)
        {
            "id": uuid.uuid4(),
            "filename": "report_01_metabolic_panel_2025-02-10.pdf",
            "title": "Comprehensive Metabolic & Renal Panel",
            "facility": "MetroHealth Clinical Laboratories",
            "facility_sub": "Department of Pathology & Clinical Chemistry • CLIA #99D0876543",
            "date": "2025-02-10",
            "physician": "Dr. Emily Wong, MD (Internal Medicine)",
            "headers": ["Test Name", "Result", "Flag", "Reference Range", "Units"],
            "rows": [
                ["Fasting Glucose", "108", "HIGH", "70 - 99", "mg/dL"],
                ["HbA1c", "5.9", "HIGH", "4.0 - 5.6", "%"],
                ["Creatinine", "0.95", "NORMAL", "0.70 - 1.30", "mg/dL"],
                ["BUN", "16", "NORMAL", "7 - 20", "mg/dL"],
                ["eGFR", "98", "NORMAL", "> 60", "mL/min/1.73m2"],
                ["Sodium", "140", "NORMAL", "136 - 145", "mEq/L"],
                ["Potassium", "4.3", "NORMAL", "3.5 - 5.1", "mEq/L"],
                ["Calcium", "9.4", "NORMAL", "8.5 - 10.2", "mg/dL"],
            ],
            "observations": [
                {"name": "Fasting Glucose", "norm": "Fasting Glucose", "cat": "Metabolic", "val": "108", "num": 108.0, "unit": "mg/dL", "ref": "70-99", "flag": "HIGH"},
                {"name": "HbA1c", "norm": "HbA1c", "cat": "Metabolic", "val": "5.9", "num": 5.9, "unit": "%", "ref": "4.0-5.6", "flag": "HIGH"},
                {"name": "Creatinine", "norm": "Creatinine", "cat": "Metabolic", "val": "0.95", "num": 0.95, "unit": "mg/dL", "ref": "0.70-1.30", "flag": "NORMAL"},
                {"name": "BUN", "norm": "BUN", "cat": "Metabolic", "val": "16", "num": 16.0, "unit": "mg/dL", "ref": "7-20", "flag": "NORMAL"},
                {"name": "eGFR", "norm": "eGFR", "cat": "Metabolic", "val": "98", "num": 98.0, "unit": "mL/min/1.73m2", "ref": ">60", "flag": "NORMAL"},
                {"name": "Sodium", "norm": "Sodium", "cat": "Metabolic", "val": "140", "num": 140.0, "unit": "mEq/L", "ref": "136-145", "flag": "NORMAL"},
                {"name": "Potassium", "norm": "Potassium", "cat": "Metabolic", "val": "4.3", "num": 4.3, "unit": "mEq/L", "ref": "3.5-5.1", "flag": "NORMAL"},
                {"name": "Calcium", "norm": "Calcium", "cat": "Metabolic", "val": "9.4", "num": 9.4, "unit": "mg/dL", "ref": "8.5-10.2", "flag": "NORMAL"},
            ],
            "notes": [
                "Mild impaired fasting glucose and borderline elevated HbA1c (pre-diabetes range).",
                "Renal parameters and electrolyte balances are well preserved.",
            ],
        },
        # 2. Complete Blood Count (Apr 2025)
        {
            "id": uuid.uuid4(),
            "filename": "report_02_cbc_differential_2025-04-15.pdf",
            "title": "Complete Blood Count (CBC) with Differential",
            "facility": "Eastbridge Diagnostic Laboratories",
            "facility_sub": "Division of Hematology & Transfusion Medicine",
            "date": "2025-04-15",
            "physician": "Dr. Emily Wong, MD (Internal Medicine)",
            "headers": ["Test Name", "Result", "Flag", "Reference Range", "Units"],
            "rows": [
                ["Hemoglobin", "13.8", "NORMAL", "13.5 - 17.5", "g/dL"],
                ["WBC", "7.2", "NORMAL", "4.0 - 11.0", "10^3/uL"],
                ["Platelets", "260", "NORMAL", "150 - 450", "10^3/uL"],
                ["Hematocrit", "41.5", "NORMAL", "41.0 - 53.0", "%"],
                ["RBC", "4.8", "NORMAL", "4.3 - 5.9", "10^6/uL"],
                ["MCV", "86", "NORMAL", "80 - 100", "fL"],
                ["MCH", "28.8", "NORMAL", "27.0 - 33.0", "pg"],
            ],
            "observations": [
                {"name": "Hemoglobin", "norm": "Hemoglobin", "cat": "Hematology", "val": "13.8", "num": 13.8, "unit": "g/dL", "ref": "13.5-17.5", "flag": "NORMAL"},
                {"name": "WBC", "norm": "WBC", "cat": "Hematology", "val": "7.2", "num": 7.2, "unit": "10^3/uL", "ref": "4.0-11.0", "flag": "NORMAL"},
                {"name": "Platelets", "norm": "Platelets", "cat": "Hematology", "val": "260", "num": 260.0, "unit": "10^3/uL", "ref": "150-450", "flag": "NORMAL"},
                {"name": "Hematocrit", "norm": "Hematocrit", "cat": "Hematology", "val": "41.5", "num": 41.5, "unit": "%", "ref": "41.0-53.0", "flag": "NORMAL"},
                {"name": "RBC", "norm": "RBC", "cat": "Hematology", "val": "4.8", "num": 4.8, "unit": "10^6/uL", "ref": "4.3-5.9", "flag": "NORMAL"},
                {"name": "MCV", "norm": "MCV", "cat": "Hematology", "val": "86", "num": 86.0, "unit": "fL", "ref": "80-100", "flag": "NORMAL"},
                {"name": "MCH", "norm": "MCH", "cat": "Hematology", "val": "28.8", "num": 28.8, "unit": "pg", "ref": "27.0-33.0", "flag": "NORMAL"},
            ],
            "notes": [
                "Erythrocyte indices, leukocyte counts, and thrombocyte levels are all within normal limits.",
                "No evidence of acute anemia or leukocytosis.",
            ],
        },
        # 3. Comprehensive Lipid Panel (Jun 2025)
        {
            "id": uuid.uuid4(),
            "filename": "report_03_lipid_cardiovascular_2025-06-20.pdf",
            "title": "Comprehensive Lipid & Cardiovascular Risk Panel",
            "facility": "Northside Heart & Health Laboratory",
            "facility_sub": "Clinical Center for Cardiovascular Biomarker Analytics",
            "date": "2025-06-20",
            "physician": "Dr. Robert Chen, MD (Preventive Cardiology)",
            "headers": ["Test Name", "Result", "Flag", "Reference Range", "Units"],
            "rows": [
                ["Total Cholesterol", "228", "HIGH", "< 200", "mg/dL"],
                ["LDL Cholesterol", "146", "HIGH", "< 100", "mg/dL"],
                ["HDL Cholesterol", "46", "NORMAL", "> 40", "mg/dL"],
                ["Triglycerides", "180", "HIGH", "< 150", "mg/dL"],
            ],
            "observations": [
                {"name": "Total Cholesterol", "norm": "Total Cholesterol", "cat": "Lipids", "val": "228", "num": 228.0, "unit": "mg/dL", "ref": "<200", "flag": "HIGH"},
                {"name": "LDL Cholesterol", "norm": "LDL Cholesterol", "cat": "Lipids", "val": "146", "num": 146.0, "unit": "mg/dL", "ref": "<100", "flag": "HIGH"},
                {"name": "HDL Cholesterol", "norm": "HDL Cholesterol", "cat": "Lipids", "val": "46", "num": 46.0, "unit": "mg/dL", "ref": ">40", "flag": "NORMAL"},
                {"name": "Triglycerides", "norm": "Triglycerides", "cat": "Lipids", "val": "180", "num": 180.0, "unit": "mg/dL", "ref": "<150", "flag": "HIGH"},
            ],
            "notes": [
                "Atherogenic dyslipidemia: Primary elevation in circulating LDL-C and triglycerides.",
                "Clinical recommendation: Discussion of lipid-lowering therapy and cardiovascular risk reduction.",
            ],
        },
        # 4. Hepatic / Liver Function Panel (Aug 2025)
        {
            "id": uuid.uuid4(),
            "filename": "report_04_hepatic_function_lft_2025-08-12.pdf",
            "title": "Hepatic Function Panel (LFT)",
            "facility": "MetroHealth Clinical Laboratories",
            "facility_sub": "Department of Pathology & Clinical Chemistry",
            "date": "2025-08-12",
            "physician": "Dr. Emily Wong, MD (Internal Medicine)",
            "headers": ["Test Name", "Result", "Flag", "Reference Range", "Units"],
            "rows": [
                ["ALT (SGPT)", "42", "NORMAL", "7 - 56", "U/L"],
                ["AST (SGOT)", "35", "NORMAL", "10 - 40", "U/L"],
                ["Alkaline Phosphatase", "78", "NORMAL", "44 - 147", "U/L"],
                ["Total Bilirubin", "0.8", "NORMAL", "0.2 - 1.2", "mg/dL"],
                ["Total Protein", "7.1", "NORMAL", "6.3 - 8.2", "g/dL"],
                ["Serum Albumin", "4.4", "NORMAL", "3.5 - 5.0", "g/dL"],
            ],
            "observations": [
                {"name": "ALT (SGPT)", "norm": "ALT", "cat": "Metabolic", "val": "42", "num": 42.0, "unit": "U/L", "ref": "7-56", "flag": "NORMAL"},
                {"name": "AST (SGOT)", "norm": "AST", "cat": "Metabolic", "val": "35", "num": 35.0, "unit": "U/L", "ref": "10-40", "flag": "NORMAL"},
                {"name": "Alkaline Phosphatase", "norm": "Alkaline Phosphatase", "cat": "Metabolic", "val": "78", "num": 78.0, "unit": "U/L", "ref": "44-147", "flag": "NORMAL"},
                {"name": "Total Bilirubin", "norm": "Total Bilirubin", "cat": "Metabolic", "val": "0.8", "num": 0.8, "unit": "mg/dL", "ref": "0.2-1.2", "flag": "NORMAL"},
                {"name": "Total Protein", "norm": "Total Protein", "cat": "Metabolic", "val": "7.1", "num": 7.1, "unit": "g/dL", "ref": "6.3-8.2", "flag": "NORMAL"},
                {"name": "Serum Albumin", "norm": "Serum Albumin", "cat": "Metabolic", "val": "4.4", "num": 4.4, "unit": "g/dL", "ref": "3.5-5.0", "flag": "NORMAL"},
            ],
            "notes": [
                "Liver transaminases and synthetic functions are within standard physiological reference ranges.",
                "Safe baseline documented prior to ongoing statin therapy.",
            ],
        },
        # 5. Thyroid Function & Endocrine Panel (Oct 2025)
        {
            "id": uuid.uuid4(),
            "filename": "report_05_thyroid_endocrine_2025-10-05.pdf",
            "title": "Thyroid & Endocrine Function Panel",
            "facility": "Eastbridge Diagnostic Laboratories",
            "facility_sub": "Endocrinology & Immunodiagnostics Division",
            "date": "2025-10-05",
            "physician": "Dr. Emily Wong, MD (Internal Medicine)",
            "headers": ["Test Name", "Result", "Flag", "Reference Range", "Units"],
            "rows": [
                ["TSH", "2.65", "NORMAL", "0.40 - 4.00", "mIU/L"],
                ["Free T4", "1.18", "NORMAL", "0.80 - 1.80", "ng/dL"],
                ["Free T3", "3.1", "NORMAL", "2.3 - 4.2", "pg/mL"],
            ],
            "observations": [
                {"name": "TSH", "norm": "TSH", "cat": "Endocrine", "val": "2.65", "num": 2.65, "unit": "mIU/L", "ref": "0.40-4.00", "flag": "NORMAL"},
                {"name": "Free T4", "norm": "Free T4", "cat": "Endocrine", "val": "1.18", "num": 1.18, "unit": "ng/dL", "ref": "0.80-1.80", "flag": "NORMAL"},
                {"name": "Free T3", "norm": "Free T3", "cat": "Endocrine", "val": "3.1", "num": 3.1, "unit": "pg/mL", "ref": "2.3-4.2", "flag": "NORMAL"},
            ],
            "notes": [
                "Euthyroid profile: Pituitary-thyroid regulatory axis is fully intact.",
            ],
        },
        # 6. Micronutrient & Vitamin Deficiency Panel (Nov 2025)
        {
            "id": uuid.uuid4(),
            "filename": "report_06_vitamins_micronutrients_2025-11-18.pdf",
            "title": "Micronutrient, Vitamin D & B12 Panel",
            "facility": "Northside Health Diagnostic Labs",
            "facility_sub": "Clinical Nutrition & Biochemical Analytics",
            "date": "2025-11-18",
            "physician": "Dr. Emily Wong, MD (Internal Medicine)",
            "headers": ["Test Name", "Result", "Flag", "Reference Range", "Units"],
            "rows": [
                ["Vitamin D (25-Hydroxy)", "22.4", "LOW", "30.0 - 100.0", "ng/mL"],
                ["Vitamin B12", "310", "NORMAL", "200 - 900", "pg/mL"],
                ["Ferritin", "115", "NORMAL", "30 - 400", "ng/mL"],
            ],
            "observations": [
                {"name": "Vitamin D (25-Hydroxy)", "norm": "Vitamin D", "cat": "Metabolic", "val": "22.4", "num": 22.4, "unit": "ng/mL", "ref": "30.0-100.0", "flag": "LOW"},
                {"name": "Vitamin B12", "norm": "Vitamin B12", "cat": "Metabolic", "val": "310", "num": 310.0, "unit": "pg/mL", "ref": "200-900", "flag": "NORMAL"},
                {"name": "Ferritin", "norm": "Ferritin", "cat": "Hematology", "val": "115", "num": 115.0, "unit": "ng/mL", "ref": "30-400", "flag": "NORMAL"},
            ],
            "notes": [
                "Vitamin D insufficiency detected (22.4 ng/mL). Recommendation: Oral Cholecalciferol (Vitamin D3) supplementation 2000 IU daily.",
            ],
        },
        # 7. Follow-up Lipid & Glycemic Panel (Jan 2026 - Major Shift & Improvement!)
        {
            "id": uuid.uuid4(),
            "filename": "report_07_followup_lipids_glucose_2026-01-22.pdf",
            "title": "Follow-up Lipid & Glycemic Monitoring Panel",
            "facility": "Northside Heart & Health Laboratory",
            "facility_sub": "Clinical Center for Cardiovascular Biomarker Analytics",
            "date": "2026-01-22",
            "physician": "Dr. Robert Chen, MD (Preventive Cardiology)",
            "headers": ["Test Name", "Result", "Flag", "Reference Range", "Units"],
            "rows": [
                ["Total Cholesterol", "184", "NORMAL", "< 200", "mg/dL"],
                ["LDL Cholesterol", "98", "NORMAL", "< 100", "mg/dL"],
                ["HDL Cholesterol", "52", "NORMAL", "> 40", "mg/dL"],
                ["Triglycerides", "135", "NORMAL", "< 150", "mg/dL"],
                ["Fasting Glucose", "94", "NORMAL", "70 - 99", "mg/dL"],
                ["HbA1c", "5.4", "NORMAL", "4.0 - 5.6", "%"],
            ],
            "observations": [
                {"name": "Total Cholesterol", "norm": "Total Cholesterol", "cat": "Lipids", "val": "184", "num": 184.0, "unit": "mg/dL", "ref": "<200", "flag": "NORMAL"},
                {"name": "LDL Cholesterol", "norm": "LDL Cholesterol", "cat": "Lipids", "val": "98", "num": 98.0, "unit": "mg/dL", "ref": "<100", "flag": "NORMAL"},
                {"name": "HDL Cholesterol", "norm": "HDL Cholesterol", "cat": "Lipids", "val": "52", "num": 52.0, "unit": "mg/dL", "ref": ">40", "flag": "NORMAL"},
                {"name": "Triglycerides", "norm": "Triglycerides", "cat": "Lipids", "val": "135", "num": 135.0, "unit": "mg/dL", "ref": "<150", "flag": "NORMAL"},
                {"name": "Fasting Glucose", "norm": "Fasting Glucose", "cat": "Metabolic", "val": "94", "num": 94.0, "unit": "mg/dL", "ref": "70-99", "flag": "NORMAL"},
                {"name": "HbA1c", "norm": "HbA1c", "cat": "Metabolic", "val": "5.4", "num": 5.4, "unit": "%", "ref": "4.0-5.6", "flag": "NORMAL"},
            ],
            "notes": [
                "Exceptional response to Atorvastatin therapy and dietary modifications.",
                "LDL-C decreased from 146 to 98 mg/dL (-32.9%). Total cholesterol normalized to 184 mg/dL.",
                "Fasting blood glucose normalized to 94 mg/dL and HbA1c improved to 5.4%.",
            ],
        },
        # 8. Comprehensive Follow-up & Vitamin D Monitoring (Mar 2026)
        {
            "id": uuid.uuid4(),
            "filename": "report_08_comprehensive_followup_2026-03-15.pdf",
            "title": "Comprehensive Longitudinal Monitoring & Vitamin D Panel",
            "facility": "MetroHealth Clinical Laboratories",
            "facility_sub": "Department of Pathology & Clinical Chemistry",
            "date": "2026-03-15",
            "physician": "Dr. Emily Wong, MD (Internal Medicine)",
            "headers": ["Test Name", "Result", "Flag", "Reference Range", "Units"],
            "rows": [
                ["Vitamin D (25-Hydroxy)", "44.6", "NORMAL", "30.0 - 100.0", "ng/mL"],
                ["Hemoglobin", "14.2", "NORMAL", "13.5 - 17.5", "g/dL"],
                ["WBC", "6.9", "NORMAL", "4.0 - 11.0", "10^3/uL"],
                ["Platelets", "255", "NORMAL", "150 - 450", "10^3/uL"],
                ["Creatinine", "0.92", "NORMAL", "0.70 - 1.30", "mg/dL"],
                ["eGFR", "101", "NORMAL", "> 60", "mL/min/1.73m2"],
            ],
            "observations": [
                {"name": "Vitamin D (25-Hydroxy)", "norm": "Vitamin D", "cat": "Metabolic", "val": "44.6", "num": 44.6, "unit": "ng/mL", "ref": "30.0-100.0", "flag": "NORMAL"},
                {"name": "Hemoglobin", "norm": "Hemoglobin", "cat": "Hematology", "val": "14.2", "num": 14.2, "unit": "g/dL", "ref": "13.5-17.5", "flag": "NORMAL"},
                {"name": "WBC", "norm": "WBC", "cat": "Hematology", "val": "6.9", "num": 6.9, "unit": "10^3/uL", "ref": "4.0-11.0", "flag": "NORMAL"},
                {"name": "Platelets", "norm": "Platelets", "cat": "Hematology", "val": "255", "num": 255.0, "unit": "10^3/uL", "ref": "150-450", "flag": "NORMAL"},
                {"name": "Creatinine", "norm": "Creatinine", "cat": "Metabolic", "val": "0.92", "num": 0.92, "unit": "mg/dL", "ref": "0.70-1.30", "flag": "NORMAL"},
                {"name": "eGFR", "norm": "eGFR", "cat": "Metabolic", "val": "101", "num": 101.0, "unit": "mL/min/1.73m2", "ref": ">60", "flag": "NORMAL"},
            ],
            "notes": [
                "Vitamin D levels normalized to 44.6 ng/mL following 4 months of 2000 IU daily supplementation.",
                "Stable hematology and renal function indices.",
            ],
        },
        # 9. Doctor Prescription (Jun 2025)
        {
            "id": uuid.uuid4(),
            "filename": "prescription_09_cardiology_atorvastatin_2025-06-25.pdf",
            "title": "Medical Prescription & Medication Administration Plan",
            "facility": "MetroHealth Heart Center",
            "facility_sub": "Department of Preventive Cardiology • Rx Registry #RX-99218",
            "date": "2025-06-25",
            "physician": "Dr. Robert Chen, MD, FACC",
            "headers": ["Medication Name", "Strength / Form", "Sig / Directions", "Qty / Refills"],
            "rows": [
                ["Atorvastatin Calcium", "20 mg Oral Tablet", "Take 1 tablet by mouth daily at bedtime", "90 Tabs / 3 Refills"],
                ["Cholecalciferol (Vitamin D3)", "2000 IU Softgel Capsule", "Take 1 capsule by mouth daily with breakfast", "90 Caps / 3 Refills"],
            ],
            "observations": [],
            "notes": [
                "Indication: Hyperlipidemia / primary LDL-C elevation (baseline LDL 146 mg/dL) and Vitamin D insufficiency.",
                "Instructions: Avoid grapefruit juice consumption. Report any unexplained persistent muscle myalgia.",
                "Follow-up: Repeat fasting lipid panel and hepatic function in 6 months.",
            ],
        },
        # 10. Medical Consultation Summary (Jun 2025)
        {
            "id": uuid.uuid4(),
            "filename": "consultation_10_cardiology_summary_2025-06-22.pdf",
            "title": "Cardiology Clinical Consultation & Risk Assessment Summary",
            "facility": "MetroHealth Heart Center",
            "facility_sub": "Cardiovascular Medicine Outpatient Pavilion • Suite 402",
            "date": "2025-06-22",
            "physician": "Dr. Robert Chen, MD, FACC",
            "headers": ["Clinical Category", "Clinical Details & Physical Findings", "Assessment & Plan"],
            "rows": [
                ["Chief Complaint", "Physician referral for evaluation of hyperlipidemia and elevated LDL-C", "Cardiovascular risk reduction strategy"],
                ["Vital Signs", "BP: 124/78 mmHg, HR: 68 bpm regular, BMI: 25.4 kg/m2", "Normal hemodynamic parameters"],
                ["Cardiovascular Exam", "S1/S2 normal, no murmurs, no carotid bruits, peripheral pulses intact 2+", "No overt structural cardiovascular signs"],
                ["Plan", "1. Initiate Atorvastatin 20mg daily\n2. Mediterranean dietary pattern\n3. 150 min/wk moderate aerobic exercise", "Recheck lipid panel in 6 months"],
            ],
            "observations": [],
            "notes": [
                "10-Year ASCVD Risk Score calculated at 4.2% (Borderline/Intermediate category with elevated LDL).",
                "Patient expressed clear agreement with starting moderate-intensity statin therapy.",
            ],
        },
        # 11. Discharge Summary (Sep 2025)
        {
            "id": uuid.uuid4(),
            "filename": "discharge_summary_11_ambulatory_care_2025-09-14.pdf",
            "title": "Ambulatory Urgent Care Clinical Discharge Summary",
            "facility": "MetroHealth Urgent & Ambulatory Care Center",
            "facility_sub": "Acute Care Services • Patient Record #ADM-2025-4410",
            "date": "2025-09-14",
            "physician": "Dr. Marcus Vance, MD (Emergency Medicine)",
            "headers": ["Phase", "Clinical Summary", "Disposition"],
            "rows": [
                ["Reason for Visit", "Acute gastroenteritis symptoms, mild dehydration following travel", "Admitted to observation unit"],
                ["Treatment Administered", "1000 mL IV Normal Saline, single dose Ondansetron 4mg IV", "Rapid symptomatic relief"],
                ["Discharge Status", "Tolerating oral fluids, afebrile, vitals normalized: BP 122/76, HR 72", "Discharged home in stable condition"],
            ],
            "observations": [],
            "notes": [
                "Discharge Instructions: Continue oral rehydration solution. Resume regular medications tomorrow morning.",
            ],
        },
        # 12. Diagnostic Report: 12-Lead ECG (Jul 2025)
        {
            "id": uuid.uuid4(),
            "filename": "diagnostic_12_ecg_rhythm_strip_2025-07-02.pdf",
            "title": "Diagnostic 12-Lead Electrocardiogram (ECG) Report",
            "facility": "Northside Cardiac Diagnostic Services",
            "facility_sub": "Clinical Electrophysiology Laboratory",
            "date": "2025-07-02",
            "physician": "Dr. Robert Chen, MD (Cardiologist)",
            "headers": ["Parameter", "Measured Value", "Standard Clinical Reference Interval"],
            "rows": [
                ["Heart Rate", "68 bpm", "60 - 100 bpm (Normal sinus rhythm)"],
                ["PR Interval", "152 ms", "120 - 200 ms (Normal AV conduction)"],
                ["QRS Duration", "88 ms", "70 - 110 ms (Normal intraventricular conduction)"],
                ["QT / QTc Interval", "390 / 412 ms", "< 450 ms (Normal repolarization)"],
                ["P-R-T Axis", "54° / 48° / 42°", "Normal electrical axis"],
            ],
            "observations": [],
            "notes": [
                "Diagnostic Impression: Normal sinus rhythm with normal voltage and axis. No acute ST-T wave abnormalities or prior myocardial infarction patterns.",
            ],
        },
    ]

    seeded_docs: list[Document] = []
    total_observations_count = 0

    for spec in doc_specs:
        doc_id = spec["id"]
        filename = spec["filename"]
        unique_key = f"{demo_user.id}/{doc_id.hex}_{filename}"

        # Write the PDF to all active storage roots
        file_size = 0
        sha256_hash = ""
        for s_root in storage_roots:
            target_path = s_root / unique_key
            size = _build_pdf_report(
                dest_path=target_path,
                facility_name=spec["facility"],
                facility_sub=spec["facility_sub"],
                doc_title=spec["title"],
                patient_name=DEMO_USER_NAME,
                doc_date=spec["date"],
                ordering_physician=spec["physician"],
                table_headers=spec["headers"],
                rows=spec["rows"],
                clinical_notes=spec.get("notes"),
            )
            file_size = size
            with open(target_path, "rb") as f:
                sha256_hash = hashlib.sha256(f.read()).hexdigest()

        # Build comprehensive extracted text for full-text search and RAG
        text_lines = [
            f"FACILITY: {spec['facility']}",
            f"DOCUMENT: {spec['title']}",
            f"PATIENT: {DEMO_USER_NAME}",
            f"DATE: {spec['date']}",
            f"PHYSICIAN: {spec['physician']}",
            "--- CLINICAL RESULTS ---",
        ]
        for row in spec["rows"]:
            text_lines.append(" | ".join(row))
        if spec.get("notes"):
            text_lines.append("--- NOTES ---")
            text_lines.extend(spec["notes"])
        extracted_text = "\n".join(text_lines)

        created_dt = datetime.strptime(spec["date"], "%Y-%m-%d").replace(hour=9, minute=0, tzinfo=timezone.utc)

        db_doc = Document(
            id=doc_id,
            owner_id=demo_user.id,
            profile_id=primary_profile.id,
            filename=filename,
            storage_key=unique_key,
            mime_type="application/pdf",
            file_size=file_size,
            checksum_sha256=sha256_hash,
            processing_status="extracted",
            extracted_text=extracted_text,
            page_count=1,
            ocr_applied=False,
            patient_name=DEMO_USER_NAME,
            document_date=spec["date"],
            lab_name=spec["facility"],
            is_verified=True,
            verified_at=created_dt + timedelta(hours=2),
            created_at=created_dt,
            is_archived=False,
        )
        db.add(db_doc)
        db.flush()
        seeded_docs.append(db_doc)

        # Create DocumentObservation records
        for obs in spec["observations"]:
            db_obs = DocumentObservation(
                id=uuid.uuid4(),
                document_id=db_doc.id,
                owner_id=demo_user.id,
                test_name=obs["name"],
                normalized_test_name=obs["norm"],
                category=obs["cat"],
                value=obs["val"],
                numeric_value=obs["num"],
                unit=obs["unit"],
                reference_range=obs["ref"],
                flag=obs["flag"],
                source_page=1,
                source_text=f"{obs['name']}: {obs['val']} {obs['unit']} (Ref: {obs['ref']}) [{obs['flag']}]",
                is_low_confidence=False,
                is_reviewed=True,
                is_archived=False,
                created_at=created_dt,
            )
            db.add(db_obs)
            total_observations_count += 1

    db.flush()
    print(f"    -> Seeded {len(seeded_docs)} medical documents and {total_observations_count} laboratory observations.")

    # 4. Care Organizer: Medications
    print("[*] Seeding active and completed medication records...")
    # Map prescription doc id
    rx_doc_id = doc_specs[8]["id"]

    med_atorvastatin = MedicationRecord(
        id=uuid.uuid4(),
        user_id=demo_user.id,
        profile_id=primary_profile.id,
        name="Atorvastatin",
        medication_type="Prescription",
        strength="20 mg",
        dosage_instructions="Take 1 tablet by mouth daily in the evening after dinner",
        route="Oral",
        frequency="Once daily at bedtime",
        start_date=date(2025, 6, 25),
        end_date=None,
        prescriber="Dr. Robert Chen, MD (Preventive Cardiology)",
        pharmacy="MetroHealth Community Pharmacy #401",
        notes="Morning: 0, Afternoon: 0, Night: 1 tablet. Indication: Hyperlipidemia / primary LDL cholesterol reduction.",
        status="active",
        source_document_id=rx_doc_id,
        created_at=datetime(2025, 6, 25, 10, 0, tzinfo=timezone.utc),
    )

    med_vitamind = MedicationRecord(
        id=uuid.uuid4(),
        user_id=demo_user.id,
        profile_id=primary_profile.id,
        name="Cholecalciferol (Vitamin D3)",
        medication_type="Supplement",
        strength="2000 IU",
        dosage_instructions="Take 1 softgel daily with breakfast or a fat-containing meal",
        route="Oral",
        frequency="Once daily in the morning",
        start_date=date(2025, 11, 20),
        end_date=None,
        prescriber="Dr. Emily Wong, MD (Internal Medicine)",
        pharmacy="CVS Pharmacy #4821",
        notes="Morning: 1 softgel, Afternoon: 0, Night: 0. Indication: Vitamin D insufficiency (baseline 22.4 ng/mL).",
        status="active",
        source_document_id=rx_doc_id,
        created_at=datetime(2025, 11, 20, 11, 0, tzinfo=timezone.utc),
    )

    med_amoxicillin = MedicationRecord(
        id=uuid.uuid4(),
        user_id=demo_user.id,
        profile_id=primary_profile.id,
        name="Amoxicillin-Clavulanate",
        medication_type="Prescription",
        strength="875 mg / 125 mg",
        dosage_instructions="Take 1 tablet by mouth every 12 hours with meals for 10 days",
        route="Oral",
        frequency="Twice daily with meals",
        start_date=date(2025, 3, 1),
        end_date=date(2025, 3, 10),
        prescriber="Dr. Emily Wong, MD (Internal Medicine)",
        pharmacy="Walgreens Health #1102",
        notes="Morning: 1 tablet, Afternoon: 0, Night: 1 tablet. Indication: Acute bacterial rhinosinusitis. Course completed successfully.",
        status="completed",
        source_document_id=None,
        created_at=datetime(2025, 3, 1, 9, 30, tzinfo=timezone.utc),
    )

    db.add_all([med_atorvastatin, med_vitamind, med_amoxicillin])
    db.flush()
    print("    -> Seeded 3 medication records (2 active, 1 completed).")

    # 5. Care Organizer: Appointments
    print("[*] Seeding doctor appointments...")
    now_utc = datetime.now(timezone.utc)
    upcoming_appt_date = (now_utc + timedelta(days=12)).replace(hour=14, minute=0, second=0, microsecond=0)

    appt_upcoming = AppointmentRecord(
        id=uuid.uuid4(),
        user_id=demo_user.id,
        profile_id=primary_profile.id,
        title="Cardiovascular Risk & Lipid Panel Follow-up",
        appointment_type="Follow-up",
        provider_name="Dr. Robert Chen, MD",
        location="MetroHealth Heart Center - Suite 402",
        scheduled_at=upcoming_appt_date,
        timezone="America/New_York",
        status="scheduled",
        notes="6-month clinical review of Atorvastatin response, updated lipid panel trends, and fasting blood glucose.",
        source_document_id=None,
        created_at=now_utc - timedelta(days=10),
    )

    appt_past_1 = AppointmentRecord(
        id=uuid.uuid4(),
        user_id=demo_user.id,
        profile_id=primary_profile.id,
        title="Annual Comprehensive Preventive Health Physical",
        appointment_type="Consultation",
        provider_name="Dr. Emily Wong, MD",
        location="MetroHealth Internal Medicine Pavilion",
        scheduled_at=datetime(2025, 6, 15, 9, 30, tzinfo=timezone.utc),
        timezone="America/New_York",
        status="completed",
        notes="Evaluated routine labs. Borderline fasting glucose and elevated LDL noted. Ordered repeat metabolic and lipid work.",
        source_document_id=doc_specs[1]["id"],
        created_at=datetime(2025, 6, 1, 10, 0, tzinfo=timezone.utc),
    )

    appt_past_2 = AppointmentRecord(
        id=uuid.uuid4(),
        user_id=demo_user.id,
        profile_id=primary_profile.id,
        title="Preventive Cardiology Consultation & Statin Discussion",
        appointment_type="Consultation",
        provider_name="Dr. Robert Chen, MD",
        location="MetroHealth Heart Center - Suite 402",
        scheduled_at=datetime(2025, 6, 22, 14, 0, tzinfo=timezone.utc),
        timezone="America/New_York",
        status="completed",
        notes="Reviewed elevated LDL-C (146 mg/dL). Formulated risk reduction plan and prescribed Atorvastatin 20mg.",
        source_document_id=doc_specs[9]["id"],
        created_at=datetime(2025, 6, 16, 11, 0, tzinfo=timezone.utc),
    )

    db.add_all([appt_upcoming, appt_past_1, appt_past_2])
    db.flush()
    print("    -> Seeded 3 appointments (1 upcoming, 2 completed).")

    # 6. Care Organizer: Follow-up Tasks
    print("[*] Seeding follow-up care tasks...")
    task_1 = FollowUpTask(
        id=uuid.uuid4(),
        user_id=demo_user.id,
        profile_id=primary_profile.id,
        title="Complete 12-hour fasting blood draw at lab 3 days before visit",
        description="Fasting lipid panel and comprehensive metabolic profile ordered by Dr. Chen.",
        due_at=upcoming_appt_date - timedelta(days=3),
        priority="high",
        status="pending",
        appointment_id=appt_upcoming.id,
        source_document_id=None,
        created_at=now_utc - timedelta(days=5),
    )

    task_2 = FollowUpTask(
        id=uuid.uuid4(),
        user_id=demo_user.id,
        profile_id=primary_profile.id,
        title="Log morning resting blood pressure for 7 consecutive days",
        description="Record blood pressure readings in health journal to review during cardiology consultation.",
        due_at=upcoming_appt_date - timedelta(days=1),
        priority="medium",
        status="pending",
        appointment_id=appt_upcoming.id,
        source_document_id=None,
        created_at=now_utc - timedelta(days=5),
    )

    task_3 = FollowUpTask(
        id=uuid.uuid4(),
        user_id=demo_user.id,
        profile_id=primary_profile.id,
        title="Obtain cardiology referral slip from primary care clinic",
        description="Completed referral coordination with Dr. Wong's office for insurance coverage.",
        due_at=datetime(2025, 6, 20, 17, 0, tzinfo=timezone.utc),
        priority="low",
        status="completed",
        appointment_id=appt_past_2.id,
        source_document_id=None,
        created_at=datetime(2025, 6, 16, 12, 0, tzinfo=timezone.utc),
    )

    db.add_all([task_1, task_2, task_3])
    db.flush()
    print("    -> Seeded 3 follow-up care tasks.")

    # 7. Smart Reminders & In-App Notifications
    print("[*] Seeding smart health reminders & in-app notifications...")
    rem_1 = Reminder(
        id=uuid.uuid4(),
        user_id=demo_user.id,
        profile_id=primary_profile.id,
        title="Evening Medication: Atorvastatin 20mg",
        description="Take 1 tablet by mouth daily in the evening after dinner.",
        category="medication",
        due_at=now_utc.replace(hour=21, minute=0, second=0, microsecond=0),
        timezone="America/New_York",
        frequency="daily",
        medication_id=med_atorvastatin.id,
        is_enabled=True,
        delivery_status="pending",
        is_acknowledged=False,
        created_at=now_utc - timedelta(days=2),
    )

    rem_2 = Reminder(
        id=uuid.uuid4(),
        user_id=demo_user.id,
        profile_id=primary_profile.id,
        title="Morning Supplement: Vitamin D3 (2000 IU)",
        description="Take 1 softgel daily with breakfast or a fat-containing meal.",
        category="medication",
        due_at=(now_utc + timedelta(days=1)).replace(hour=8, minute=30, second=0, microsecond=0),
        timezone="America/New_York",
        frequency="daily",
        medication_id=med_vitamind.id,
        is_enabled=True,
        delivery_status="pending",
        is_acknowledged=False,
        created_at=now_utc - timedelta(days=2),
    )

    rem_3 = Reminder(
        id=uuid.uuid4(),
        user_id=demo_user.id,
        profile_id=primary_profile.id,
        title="Upcoming Doctor Appointment: Dr. Robert Chen",
        description="Cardiology follow-up scheduled at MetroHealth Heart Center - Suite 402.",
        category="appointment",
        due_at=upcoming_appt_date - timedelta(days=1),
        timezone="America/New_York",
        frequency="once",
        appointment_id=appt_upcoming.id,
        is_enabled=True,
        delivery_status="pending",
        is_acknowledged=False,
        created_at=now_utc - timedelta(days=1),
    )

    rem_4 = Reminder(
        id=uuid.uuid4(),
        user_id=demo_user.id,
        profile_id=primary_profile.id,
        title="Lab Alert: LDL Cholesterol Elevated (146 mg/dL)",
        description="Your June 2025 lipid test exceeded standard reference (<100 mg/dL). Discussed with Dr. Chen.",
        category="report_review",
        due_at=datetime(2025, 6, 21, 10, 0, tzinfo=timezone.utc),
        timezone="America/New_York",
        frequency="once",
        document_id=doc_specs[2]["id"],
        is_enabled=True,
        delivery_status="delivered",
        delivered_at=datetime(2025, 6, 21, 10, 1, tzinfo=timezone.utc),
        is_acknowledged=True,
        acknowledged_at=datetime(2025, 6, 21, 12, 30, tzinfo=timezone.utc),
        created_at=datetime(2025, 6, 20, 18, 0, tzinfo=timezone.utc),
    )

    rem_5 = Reminder(
        id=uuid.uuid4(),
        user_id=demo_user.id,
        profile_id=primary_profile.id,
        title="Clinical Health Trend: LDL-C Normalized by 32.9%",
        description="Longitudinal analytics detected a positive clinical shift: LDL decreased from 146 to 98 mg/dL.",
        category="general",
        due_at=datetime(2026, 1, 23, 9, 0, tzinfo=timezone.utc),
        timezone="America/New_York",
        frequency="once",
        is_enabled=True,
        delivery_status="delivered",
        delivered_at=datetime(2026, 1, 23, 9, 0, tzinfo=timezone.utc),
        is_acknowledged=True,
        acknowledged_at=datetime(2026, 1, 23, 10, 15, tzinfo=timezone.utc),
        created_at=datetime(2026, 1, 22, 16, 0, tzinfo=timezone.utc),
    )

    db.add_all([rem_1, rem_2, rem_3, rem_4, rem_5])
    db.flush()
    print("    -> Seeded 5 smart health reminders and notifications.")

    # 8. Evidence-Grounded AI Medical Chat Conversations
    print("[*] Seeding 6 realistic AI Medical Assistant conversations with citations...")

    chat_scenarios = [
        {
            "title": "Understanding My Complete Blood Count (CBC)",
            "messages": [
                {
                    "role": "user",
                    "content": "Can you explain my latest Complete Blood Count (CBC) report and tell me if everything looks normal?",
                    "citations": None,
                },
                {
                    "role": "assistant",
                    "content": (
                        "Based on your verified Complete Blood Count report from April 15, 2025 [S1], all key hematological "
                        "parameters are well within standard physiological reference ranges:\n\n"
                        "• **Hemoglobin**: 13.8 g/dL (Reference: 13.5 – 17.5 g/dL) [NORMAL] [S1]\n"
                        "• **White Blood Cell (WBC) Count**: 7.2 × 10³/µL (Reference: 4.0 – 11.0 × 10³/µL) [NORMAL] [S1]\n"
                        "• **Platelet Count**: 260 × 10³/µL (Reference: 150 – 450 × 10³/µL) [NORMAL] [S1]\n"
                        "• **Hematocrit**: 41.5% (Reference: 41.0 – 53.0%) [NORMAL] [S1]\n"
                        "• **RBC Count**: 4.8 × 10⁶/µL (Reference: 4.3 – 5.9 × 10⁶/µL) [NORMAL] [S1]\n\n"
                        "These values reflect healthy oxygen delivery capacity, stable clotting cell counts, and no evidence "
                        "of acute infection. Please remember that HealthMate AI summarizes documented test values; always review "
                        "your results with your physician during routine check-ups."
                    ),
                    "citations": [
                        {
                            "citation_id": "[S1]",
                            "document_id": str(doc_specs[1]["id"]),
                            "document_title": doc_specs[1]["title"],
                            "clinical_date": "2025-04-15",
                            "date_type": "actual",
                            "normalized_test_name": "Hemoglobin",
                            "original_test_name": "Hemoglobin",
                            "value": "13.8",
                            "unit": "g/dL",
                            "reference_range": "13.5 - 17.5",
                            "abnormal_flag": "NORMAL",
                            "is_reviewed": True,
                            "page_number": 1,
                            "source_text": "Hemoglobin: 13.8 g/dL (Ref: 13.5 - 17.5) [NORMAL]",
                        }
                    ],
                },
            ],
        },
        {
            "title": "Explaining Abnormal Lipid Results",
            "messages": [
                {
                    "role": "user",
                    "content": "Why was my LDL Cholesterol flagged as High on my June report, and what does it mean?",
                    "citations": None,
                },
                {
                    "role": "assistant",
                    "content": (
                        "In your Comprehensive Lipid Panel dated June 20, 2025 [S1]:\n\n"
                        "• **Total Cholesterol**: 228 mg/dL (Reference: < 200 mg/dL) [HIGH] [S1]\n"
                        "• **LDL Cholesterol**: 146 mg/dL (Reference: < 100 mg/dL) [HIGH] [S1]\n"
                        "• **Triglycerides**: 180 mg/dL (Reference: < 150 mg/dL) [HIGH] [S1]\n"
                        "• **HDL Cholesterol**: 46 mg/dL (Reference: > 40 mg/dL) [NORMAL] [S1]\n\n"
                        "The **HIGH** flag on your LDL ('low-density lipoprotein') indicates that circulating cholesterol particles "
                        "exceeded the standard optimal laboratory boundary of 100 mg/dL. Elevated LDL is evaluated by clinicians as "
                        "a primary atherogenic biomarker. Your cardiologist, Dr. Robert Chen, discussed these findings with you on "
                        "June 22 [S2] and recommended initiating Atorvastatin 20mg alongside heart-healthy dietary changes."
                    ),
                    "citations": [
                        {
                            "citation_id": "[S1]",
                            "document_id": str(doc_specs[2]["id"]),
                            "document_title": doc_specs[2]["title"],
                            "clinical_date": "2025-06-20",
                            "date_type": "actual",
                            "normalized_test_name": "LDL Cholesterol",
                            "original_test_name": "LDL Cholesterol",
                            "value": "146",
                            "unit": "mg/dL",
                            "reference_range": "< 100",
                            "abnormal_flag": "HIGH",
                            "is_reviewed": True,
                            "page_number": 1,
                            "source_text": "LDL Cholesterol: 146 mg/dL (Ref: < 100) [HIGH]",
                        },
                        {
                            "citation_id": "[S2]",
                            "document_id": str(doc_specs[9]["id"]),
                            "document_title": doc_specs[9]["title"],
                            "clinical_date": "2025-06-22",
                            "date_type": "actual",
                            "normalized_test_name": "Consultation",
                            "original_test_name": "Clinical Plan",
                            "value": "Plan",
                            "unit": None,
                            "reference_range": None,
                            "abnormal_flag": None,
                            "is_reviewed": True,
                            "page_number": 1,
                            "source_text": "Initiate Atorvastatin 20mg daily and dietary optimization.",
                        },
                    ],
                },
            ],
        },
        {
            "title": "Comparing Previous and Recent Lab Reports",
            "messages": [
                {
                    "role": "user",
                    "content": "How do my latest lipid and blood glucose results from January 2026 compare to my baseline results?",
                    "citations": None,
                },
                {
                    "role": "assistant",
                    "content": (
                        "Comparing your baseline reports from 2025 [S1, S2] with your Follow-up Panel from January 22, 2026 [S3] "
                        "demonstrates substantial positive improvements across all targeted biomarkers:\n\n"
                        "1. **LDL Cholesterol**: Decreased from **146 mg/dL** [HIGH] to **98 mg/dL** [NORMAL] (–48 mg/dL / –32.9% reduction) [S1, S3]\n"
                        "2. **Total Cholesterol**: Decreased from **228 mg/dL** [HIGH] to **184 mg/dL** [NORMAL] (–44 mg/dL / –19.3% reduction) [S1, S3]\n"
                        "3. **Triglycerides**: Decreased from **180 mg/dL** [HIGH] to **135 mg/dL** [NORMAL] (–45 mg/dL / –25.0% reduction) [S1, S3]\n"
                        "4. **Fasting Glucose**: Normalized from **108 mg/dL** [HIGH] to **94 mg/dL** [NORMAL] (–14 mg/dL) [S2, S3]\n"
                        "5. **HbA1c**: Improved from **5.9%** [HIGH] to **5.4%** [NORMAL] (–0.5 percentage points) [S2, S3]\n\n"
                        "Both your glycemic and lipid biomarkers have transitioned from outside standard laboratory limits into "
                        "optimal target boundaries following your medication and lifestyle adherence."
                    ),
                    "citations": [
                        {
                            "citation_id": "[S1]",
                            "document_id": str(doc_specs[2]["id"]),
                            "document_title": doc_specs[2]["title"],
                            "clinical_date": "2025-06-20",
                            "date_type": "actual",
                            "normalized_test_name": "LDL Cholesterol",
                            "original_test_name": "LDL Cholesterol",
                            "value": "146",
                            "unit": "mg/dL",
                            "reference_range": "< 100",
                            "abnormal_flag": "HIGH",
                            "is_reviewed": True,
                            "page_number": 1,
                            "source_text": "LDL Cholesterol: 146 mg/dL (Ref: < 100) [HIGH]",
                        },
                        {
                            "citation_id": "[S2]",
                            "document_id": str(doc_specs[0]["id"]),
                            "document_title": doc_specs[0]["title"],
                            "clinical_date": "2025-02-10",
                            "date_type": "actual",
                            "normalized_test_name": "Fasting Glucose",
                            "original_test_name": "Fasting Glucose",
                            "value": "108",
                            "unit": "mg/dL",
                            "reference_range": "70 - 99",
                            "abnormal_flag": "HIGH",
                            "is_reviewed": True,
                            "page_number": 1,
                            "source_text": "Fasting Glucose: 108 mg/dL (Ref: 70 - 99) [HIGH]",
                        },
                        {
                            "citation_id": "[S3]",
                            "document_id": str(doc_specs[6]["id"]),
                            "document_title": doc_specs[6]["title"],
                            "clinical_date": "2026-01-22",
                            "date_type": "actual",
                            "normalized_test_name": "LDL Cholesterol",
                            "original_test_name": "LDL Cholesterol",
                            "value": "98",
                            "unit": "mg/dL",
                            "reference_range": "< 100",
                            "abnormal_flag": "NORMAL",
                            "is_reviewed": True,
                            "page_number": 1,
                            "source_text": "LDL Cholesterol: 98 mg/dL (Ref: < 100) [NORMAL]",
                        },
                    ],
                },
            ],
        },
        {
            "title": "Understanding My Prescriptions & Dosage Schedule",
            "messages": [
                {
                    "role": "user",
                    "content": "Can you review my active medications and remind me how to take them?",
                    "citations": None,
                },
                {
                    "role": "assistant",
                    "content": (
                        "According to your current clinical prescription records [S1]:\n\n"
                        "1. **Atorvastatin Calcium (20 mg oral tablet)** [S1]:\n"
                        "   • **Schedule**: Take 1 tablet by mouth daily in the evening after dinner.\n"
                        "   • **Indication**: LDL cholesterol reduction and cardiovascular risk management.\n"
                        "   • **Notes**: Swallow whole with water. Avoid large quantities of grapefruit juice.\n\n"
                        "2. **Cholecalciferol / Vitamin D3 (2000 IU softgel)** [S1]:\n"
                        "   • **Schedule**: Take 1 softgel daily in the morning with food.\n"
                        "   • **Indication**: Correction of Vitamin D insufficiency (which successfully rose from 22.4 to 44.6 ng/mL).\n\n"
                        "Always maintain exact dosing as prescribed by Dr. Robert Chen and Dr. Emily Wong, and notify your clinic "
                        "if you experience any side effects."
                    ),
                    "citations": [
                        {
                            "citation_id": "[S1]",
                            "document_id": str(doc_specs[8]["id"]),
                            "document_title": doc_specs[8]["title"],
                            "clinical_date": "2025-06-25",
                            "date_type": "actual",
                            "normalized_test_name": "Prescription",
                            "original_test_name": "Prescription Order",
                            "value": "Active",
                            "unit": None,
                            "reference_range": None,
                            "abnormal_flag": None,
                            "is_reviewed": True,
                            "page_number": 1,
                            "source_text": "Atorvastatin Calcium 20 mg: Take 1 tablet daily at bedtime.",
                        }
                    ],
                },
            ],
        },
        {
            "title": "Preparing Questions for My Doctor Visit",
            "messages": [
                {
                    "role": "user",
                    "content": "What questions should I ask Dr. Robert Chen at my upcoming cardiology appointment?",
                    "citations": None,
                },
                {
                    "role": "assistant",
                    "content": (
                        "Based on your recent lab trends and care plan, here are 4 high-yield, source-grounded questions "
                        "for your discussion with Dr. Chen [S1, S2]:\n\n"
                        "1. *'My LDL cholesterol dropped from 146 mg/dL to 98 mg/dL on Atorvastatin 20mg. Are we satisfied with maintaining this dose or should we adjust?'*\n"
                        "2. *'My fasting glucose normalized from 108 mg/dL to 94 mg/dL and HbA1c to 5.4%. How frequently should we monitor my glycemic status going forward?'*\n"
                        "3. *'My Vitamin D level has risen from 22.4 ng/mL to 44.6 ng/mL. Should I continue the 2000 IU daily dose or transition to a maintenance amount?'*\n"
                        "4. *'Based on my normal ECG and improved lab profile, are there specific aerobic exercise intensity zones or strength training guidelines you recommend?'*"
                    ),
                    "citations": [
                        {
                            "citation_id": "[S1]",
                            "document_id": str(doc_specs[6]["id"]),
                            "document_title": doc_specs[6]["title"],
                            "clinical_date": "2026-01-22",
                            "date_type": "actual",
                            "normalized_test_name": "LDL Cholesterol",
                            "original_test_name": "LDL Cholesterol",
                            "value": "98",
                            "unit": "mg/dL",
                            "reference_range": "< 100",
                            "abnormal_flag": "NORMAL",
                            "is_reviewed": True,
                            "page_number": 1,
                            "source_text": "LDL Cholesterol: 98 mg/dL (Ref: < 100) [NORMAL]",
                        },
                        {
                            "citation_id": "[S2]",
                            "document_id": str(doc_specs[7]["id"]),
                            "document_title": doc_specs[7]["title"],
                            "clinical_date": "2026-03-15",
                            "date_type": "actual",
                            "normalized_test_name": "Vitamin D",
                            "original_test_name": "Vitamin D (25-Hydroxy)",
                            "value": "44.6",
                            "unit": "ng/mL",
                            "reference_range": "30.0 - 100.0",
                            "abnormal_flag": "NORMAL",
                            "is_reviewed": True,
                            "page_number": 1,
                            "source_text": "Vitamin D (25-Hydroxy): 44.6 ng/mL (Ref: 30.0 - 100.0) [NORMAL]",
                        },
                    ],
                },
            ],
        },
        {
            "title": "General Preventive Health & Metabolic Guidance",
            "messages": [
                {
                    "role": "user",
                    "content": "What evidence-based lifestyle habits help maintain stable blood sugar and cardiovascular health?",
                    "citations": None,
                },
                {
                    "role": "assistant",
                    "content": (
                        "Evidence-based preventive health guidelines highlight several key pillars for metabolic and cardiovascular "
                        "maintenance:\n\n"
                        "• **Dietary Composition**: Emphasize lean proteins, soluble fiber (such as oats, lentils, and flaxseed), "
                        "and healthy monounsaturated fats while minimizing refined sugars and ultra-processed carbohydrates.\n"
                        "• **Consistent Physical Activity**: Aim for at least 150 minutes of moderate aerobic activity weekly "
                        "(e.g., brisk walking, cycling) coupled with 2 weekly resistance sessions to support skeletal muscle insulin sensitivity.\n"
                        "• **Hydration & Rest**: Prioritize 7 to 8 hours of restorative sleep to maintain optimal cortisol and insulin balance.\n"
                        "• **Periodic Biomarker Tracking**: Continue following the laboratory surveillance schedule established by your care team.\n\n"
                        "HealthMate AI provides informational health record summaries. Always align any changes in diet or exercise with "
                        "your primary physician's clinical guidance."
                    ),
                    "citations": None,
                },
            ],
        },
    ]

    total_chat_messages = 0
    for conv_idx, s in enumerate(chat_scenarios):
        conv_dt = now_utc - timedelta(days=len(chat_scenarios) - conv_idx)
        conv = MedicalChatConversation(
            id=uuid.uuid4(),
            owner_id=demo_user.id,
            title=s["title"],
            created_at=conv_dt,
            updated_at=conv_dt + timedelta(minutes=15),
        )
        db.add(conv)
        db.flush()

        for msg_idx, m in enumerate(s["messages"]):
            msg_dt = conv_dt + timedelta(minutes=msg_idx * 2)
            msg = MedicalChatMessage(
                id=uuid.uuid4(),
                conversation_id=conv.id,
                role=m["role"],
                content=m["content"],
                citations=m["citations"],
                created_at=msg_dt,
            )
            db.add(msg)
            total_chat_messages += 1

    db.flush()
    print(f"    -> Seeded {len(chat_scenarios)} AI conversations with {total_chat_messages} messages and clinical citations.")

    # 9. Secure Doctor Sharing Sessions & Audit Logs
    print("[*] Seeding doctor sharing sessions and audit access logs...")
    raw_token_active = "hm_share_demo_active_token_xyz890123"
    token_hash_active = hashlib.sha256(raw_token_active.encode("utf-8")).hexdigest()

    share_active = DoctorSharingSession(
        id=uuid.uuid4(),
        owner_id=demo_user.id,
        profile_id=primary_profile.id,
        doctor_name="Dr. Robert Chen, MD",
        doctor_email="dr.chen@metrohealthheart.org",
        token_hash=token_hash_active,
        status="active",
        expires_at=now_utc + timedelta(days=14),
        last_accessed_at=now_utc - timedelta(hours=3),
        access_count=3,
        shared_resources={
            "document_ids": [str(doc_specs[2]["id"]), str(doc_specs[6]["id"]), str(doc_specs[8]["id"])],
            "include_visit_pack": True,
            "visit_pack_categories": ["documents", "observations", "medications", "appointments", "trends"],
            "include_medications": True,
            "include_appointments": True,
        },
        notes="Pre-visit clinical preparation access for upcoming cardiology evaluation.",
        created_at=now_utc - timedelta(days=2),
    )
    db.add(share_active)
    db.flush()

    # Audit logs for active share
    log_1 = DoctorSharingAuditLog(
        id=uuid.uuid4(),
        session_id=share_active.id,
        event_type="created",
        ip_address="192.168.1.100",
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        details="Owner created secure sharing link with 14-day expiry.",
        created_at=now_utc - timedelta(days=2),
    )
    log_2 = DoctorSharingAuditLog(
        id=uuid.uuid4(),
        session_id=share_active.id,
        event_type="viewed_summary",
        ip_address="198.51.100.45",
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        details="Doctor accessed read-only patient summary view.",
        created_at=now_utc - timedelta(days=1),
    )
    log_3 = DoctorSharingAuditLog(
        id=uuid.uuid4(),
        session_id=share_active.id,
        event_type="downloaded_visit_pack",
        ip_address="198.51.100.45",
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        details="Doctor downloaded clinical visit preparation pack PDF.",
        created_at=now_utc - timedelta(hours=3),
    )

    # Expired share
    raw_token_expired = "hm_share_demo_expired_token_abc456789"
    token_hash_expired = hashlib.sha256(raw_token_expired.encode("utf-8")).hexdigest()

    share_expired = DoctorSharingSession(
        id=uuid.uuid4(),
        owner_id=demo_user.id,
        profile_id=primary_profile.id,
        doctor_name="Dr. Emily Wong, MD",
        doctor_email="dr.wong@metrohealthcare.org",
        token_hash=token_hash_expired,
        status="expired",
        expires_at=now_utc - timedelta(days=30),
        last_accessed_at=now_utc - timedelta(days=32),
        access_count=2,
        shared_resources={
            "document_ids": [str(doc_specs[0]["id"]), str(doc_specs[1]["id"])],
            "include_visit_pack": False,
            "include_medications": True,
            "include_appointments": False,
        },
        notes="Historical consultation access for annual physical review.",
        created_at=now_utc - timedelta(days=60),
    )
    db.add(share_expired)
    db.flush()

    log_4 = DoctorSharingAuditLog(
        id=uuid.uuid4(),
        session_id=share_expired.id,
        event_type="created",
        ip_address="192.168.1.100",
        details="Owner created initial sharing session.",
        created_at=now_utc - timedelta(days=60),
    )
    log_5 = DoctorSharingAuditLog(
        id=uuid.uuid4(),
        session_id=share_expired.id,
        event_type="viewed_summary",
        ip_address="198.51.100.12",
        details="Clinician reviewed patient lab documents.",
        created_at=now_utc - timedelta(days=32),
    )

    db.add_all([log_1, log_2, log_3, log_4, log_5])
    db.flush()
    print("    -> Seeded 2 doctor sharing sessions and 5 audit logs.")

    # 10. Data Quality Center: Duplicate Candidates
    print("[*] Seeding data quality duplicate detection candidates...")
    dup_cand_1 = DuplicateCandidate(
        id=uuid.uuid4(),
        user_id=demo_user.id,
        profile_id=primary_profile.id,
        record_type="document",
        primary_record_id=doc_specs[0]["id"],
        secondary_record_id=doc_specs[1]["id"],
        confidence_score=0.92,
        match_reasons=[
            {"code": "SIMILAR_TIMEFRAME", "description": "Consecutive metabolic monitoring panels in same diagnostic quarter"},
            {"code": "COMMON_ORDERING_CLINICIAN", "description": "Same ordering clinician: Dr. Emily Wong, MD"},
        ],
        status="pending",
        created_at=now_utc - timedelta(days=1),
    )

    dup_cand_2 = DuplicateCandidate(
        id=uuid.uuid4(),
        user_id=demo_user.id,
        profile_id=primary_profile.id,
        record_type="observation",
        primary_record_id=seeded_docs[0].observations[0].id,
        secondary_record_id=seeded_docs[6].observations[4].id,
        confidence_score=1.0,
        match_reasons=[
            {"code": "LONGITUDINAL_PAIR", "description": "Identical canonical test measurement across monitoring dates"},
            {"code": "UNIT_MATCH", "description": "Both observations recorded in compatible standard units (mg/dL)"},
        ],
        status="resolved",
        retained_record_id=seeded_docs[0].observations[0].id,
        resolution_action="retained_primary",
        decision_notes="Confirmed distinct longitudinal measurements; retained both in chronological history.",
        reviewed_at=now_utc - timedelta(hours=12),
        resolved_at=now_utc - timedelta(hours=12),
        created_at=now_utc - timedelta(days=2),
    )

    db.add_all([dup_cand_1, dup_cand_2])
    db.flush()
    print("    -> Seeded 2 data quality duplicate candidates (1 pending, 1 resolved).")

    # Final Commit
    db.commit()
    db.refresh(demo_user)

    print("\n" + "=" * 65)
    print("[SUCCESS] DEMO USER & SEED DATA SUCCESSFULLY CREATED")
    print("=" * 65)
    print(f"Name:             {demo_user.name}")
    print(f"Email:            {demo_user.email}")
    print(f"Password:         {DEMO_USER_PASSWORD}")
    print(f"User ID:          {demo_user.id}")
    print(f"Family Profiles:  3 (Primary Self, Spouse, Child)")
    print(f"Medical Documents:12 styled PDF files with valid checksums")
    print(f"Lab Observations: {total_observations_count} verified observations with flags & ranges")
    print(f"Medications:      3 records (Atorvastatin, Vitamin D3, Amoxicillin)")
    print(f"Appointments:     3 records (1 upcoming, 2 completed)")
    print(f"Follow-up Tasks:  3 records (2 pending, 1 completed)")
    print(f"Reminders/Alerts: 5 records (medications, appointments, lab alerts)")
    print(f"AI Chat History:  6 multi-turn conversations with evidence citations")
    print(f"Doctor Sharing:   2 sessions (active & expired) with audit logs")
    print(f"Data Quality:     2 duplicate detection candidates")
    print("=" * 65 + "\n")

    return demo_user


def main() -> None:
    session_factory = get_session_factory()
    db: Session = session_factory()
    try:
        seed_demo_data(db)
    except Exception as exc:
        db.rollback()
        print(f"\n[!] Error during demo data seeding: {exc}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
