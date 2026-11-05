"""Doctor Visit Preparation Pack service.

Builds structured, source-grounded visit preparation packs combining:
- Medical documents and analyzed reports
- Verified laboratory observations with ranges and flags
- Longitudinal trends
- Active user-entered medications
- Upcoming appointments and care follow-up tasks
- Questions for clinician discussion
- User visit notes and chief complaints

Enforces strict user ownership, authorization, and clinical safety.
"""

from datetime import datetime, timezone
import html
import io
import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.models.care import AppointmentRecord, FollowUpTask, MedicationRecord
from app.models.document import Document, DocumentObservation
from app.models.user import User
from app.schemas.visit_pack import (
    DoctorVisitPackData,
    VisitPackAppointmentItem,
    VisitPackDocumentMeta,
    VisitPackDraftRequest,
    VisitPackMedicationItem,
    VisitPackObservationItem,
    VisitPackQuestionItem,
    VisitPackTaskItem,
    VisitPackTrendItem,
)
from app.services.medical_insights import get_longitudinal_insights_trends
from app.services.timeline import _get_best_clinical_date

CLINICAL_DISCLAIMER = (
    "NOTICE FOR CLINICAL DISCUSSION: This visit pack is a personal health-record organization tool prepared by the patient "
    "using HealthMate AI. It summarizes uploaded medical reports, laboratory reference intervals, and patient-recorded medications. "
    "It does not provide a medical diagnosis, clinical risk evaluation, or treatment prescription. Any highlighted findings reflect "
    "laboratory-printed reference boundaries and must be evaluated in full clinical context by a licensed healthcare provider."
)


class VisitPackNumberedCanvas(canvas.Canvas):
    """Canvas that computes dynamic page counts and draws clean running header/footer."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._saved_page_states: list[dict[str, Any]] = []

    def showPage(self) -> None:
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self) -> None:
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int) -> None:
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Header rule & title
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(36, 756, 576, 756)
        self.drawString(36, 762, "HealthMate AI — Doctor Visit Preparation Pack")

        # Running footer
        self.line(36, 42, 576, 42)
        self.drawString(
            36,
            30,
            "Confidential Patient Summary • Prepared for Clinician Discussion • Not a Diagnosis",
        )
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(576, 30, page_str)
        self.restoreState()


def _safe_text(val: Any) -> str:
    """Escapes strings for ReportLab XML/HTML Paragraph formatting."""
    if val is None:
        return "—"
    return html.escape(str(val))


def generate_visit_pack_draft(
    db: Session,
    user: User,
    req: VisitPackDraftRequest,
) -> DoctorVisitPackData:
    """Query user's authorized records and assemble an editable doctor visit pack draft."""
    if req.start_date and req.end_date:
        if req.start_date > req.end_date:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="start_date cannot be after end_date.",
            )

    categories = req.categories or [
        "documents",
        "observations",
        "trends",
        "medications",
        "care_schedule",
        "clinician_questions",
        "patient_notes",
    ]

    profile = None
    if req.profile_id:
        try:
            p_uuid = uuid.UUID(req.profile_id)
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid profile_id format.",
            )
        from app.services.family_profile import verify_profile_access
        profile = verify_profile_access(db, user, p_uuid)

    # 1. Fetch authorized documents
    doc_query = db.query(Document).filter(
        Document.owner_id == user.id,
        Document.is_archived.is_(False),
    )
    if profile:
        if profile.is_primary:
            doc_query = doc_query.filter((Document.profile_id == profile.id) | (Document.profile_id.is_(None)))
        else:
            doc_query = doc_query.filter(Document.profile_id == profile.id)
    all_user_docs = doc_query.order_by(Document.created_at.desc()).all()

    documents_meta: list[VisitPackDocumentMeta] = []
    filtered_docs: list[Document] = []
    for d in all_user_docs:
        c_date, _ = _get_best_clinical_date(d)
        date_str = c_date

        # Filter by date range if specified
        if req.start_date and date_str and date_str < req.start_date:
            continue
        if req.end_date and date_str and date_str > req.end_date:
            continue

        filtered_docs.append(d)
        if "documents" in categories:
            documents_meta.append(
                VisitPackDocumentMeta(
                    document_id=str(d.id),
                    filename=d.filename,
                    clinical_date=date_str,
                    is_verified=d.is_verified,
                    page_count=d.page_count or 1,
                )
            )

    # 2. Fetch observations
    observations_list: list[VisitPackObservationItem] = []
    out_of_range_obs: list[VisitPackObservationItem] = []
    if "observations" in categories and filtered_docs:
        doc_ids = [d.id for d in filtered_docs]
        obs_query = db.query(DocumentObservation).filter(
            DocumentObservation.document_id.in_(doc_ids),
            DocumentObservation.is_archived.is_(False),
        )
        if not req.include_unverified:
            obs_query = obs_query.filter(DocumentObservation.is_reviewed.is_(True))

        raw_observations = obs_query.all()
        doc_map = {d.id: d for d in filtered_docs}

        for obs in raw_observations:
            doc = doc_map.get(obs.document_id)
            doc_title = doc.filename if doc else "Report"
            if doc:
                c_date, _ = _get_best_clinical_date(doc)
                date_str = c_date
            else:
                date_str = None

            flag = obs.flag

            item = VisitPackObservationItem(
                observation_id=str(obs.id),
                document_id=str(obs.document_id),
                document_title=doc_title,
                test_name=obs.normalized_test_name or obs.test_name,
                category=obs.category or "General",
                value=obs.value,
                unit=obs.unit,
                reference_range=obs.reference_range,
                flag=flag,
                clinical_date=date_str,
                is_verified=obs.is_reviewed,
                page=obs.source_page or 1,
                included=True,
            )
            observations_list.append(item)
            if flag in ("HIGH", "LOW", "ABNORMAL", "POSITIVE"):
                out_of_range_obs.append(item)

    # Sort observations: flagged first, then by category and name
    observations_list.sort(key=lambda x: (0 if x.flag else 1, x.category, x.test_name))

    # 3. Longitudinal Trends
    trends_list: list[VisitPackTrendItem] = []
    if "trends" in categories and filtered_docs:
        try:
            trends_resp = get_longitudinal_insights_trends(
                db, user, include_unverified=req.include_unverified
            )
            for t in trends_resp.trends:
                trends_list.append(
                    VisitPackTrendItem(
                        test_name=t.normalized_test_name,
                        category=t.category,
                        baseline_date=t.earliest_date,
                        baseline_value=f"{t.earliest_value} {t.unit or ''}".strip(),
                        latest_date=t.latest_date,
                        latest_value=f"{t.latest_value} {t.unit or ''}".strip(),
                        change_description=t.clinical_change_description,
                        included=True,
                    )
                )
        except Exception:
            pass

    # 4. Active Medications
    medications_list: list[VisitPackMedicationItem] = []
    if "medications" in categories:
        med_query = db.query(MedicationRecord).filter(
            MedicationRecord.user_id == user.id,
            MedicationRecord.status == "active",
        )
        if profile:
            if profile.is_primary:
                med_query = med_query.filter((MedicationRecord.profile_id == profile.id) | (MedicationRecord.profile_id.is_(None)))
            else:
                med_query = med_query.filter(MedicationRecord.profile_id == profile.id)
        med_results = med_query.order_by(MedicationRecord.name.asc()).all()

        for m in med_results:
            medications_list.append(
                VisitPackMedicationItem(
                    id=str(m.id),
                    name=m.name,
                    strength=m.strength,
                    dosage_instructions=m.dosage_instructions,
                    frequency=m.frequency,
                    prescriber=m.prescriber,
                    status=m.status,
                    notes=m.notes,
                    included=True,
                )
            )

    # 5. Care Schedule (Appointments and Follow-ups)
    appointments_list: list[VisitPackAppointmentItem] = []
    tasks_list: list[VisitPackTaskItem] = []
    if "care_schedule" in categories:
        appt_query = db.query(AppointmentRecord).filter(
            AppointmentRecord.user_id == user.id,
            AppointmentRecord.status == "scheduled",
        )
        task_query = db.query(FollowUpTask).filter(
            FollowUpTask.user_id == user.id,
            FollowUpTask.status == "pending",
        )
        if profile:
            if profile.is_primary:
                appt_query = appt_query.filter((AppointmentRecord.profile_id == profile.id) | (AppointmentRecord.profile_id.is_(None)))
                task_query = task_query.filter((FollowUpTask.profile_id == profile.id) | (FollowUpTask.profile_id.is_(None)))
            else:
                appt_query = appt_query.filter(AppointmentRecord.profile_id == profile.id)
                task_query = task_query.filter(FollowUpTask.profile_id == profile.id)

        appts = appt_query.order_by(AppointmentRecord.scheduled_at.asc()).all()
        tasks = task_query.order_by(FollowUpTask.due_at.asc().nulls_last()).all()

        for a in appts:
            appointments_list.append(
                VisitPackAppointmentItem(
                    id=str(a.id),
                    title=a.title,
                    provider_name=a.provider_name,
                    location=a.location,
                    scheduled_at=a.scheduled_at.isoformat() if a.scheduled_at else "—",
                    status=a.status,
                    included=True,
                )
            )

        for tk in tasks:
            tasks_list.append(
                VisitPackTaskItem(
                    id=str(tk.id),
                    title=tk.title,
                    due_at=tk.due_at.isoformat() if tk.due_at else None,
                    priority=tk.priority,
                    status=tk.status,
                    appointment_id=str(tk.appointment_id) if tk.appointment_id else None,
                    included=True,
                )
            )

    # 6. Clinician Questions
    questions_list: list[VisitPackQuestionItem] = []
    if "clinician_questions" in categories:
        # Generate from flagged/out-of-range observations
        for obs in out_of_range_obs[:4]:
            flag_desc = f"flagged as {obs.flag}" if obs.flag else "outside reference range"
            questions_list.append(
                VisitPackQuestionItem(
                    question=f"What is the clinical significance of my {obs.test_name} result ({obs.value} {obs.unit or ''}) being {flag_desc}?",
                    rationale=f"Reported in {obs.document_title} on {obs.clinical_date or 'recent report'}",
                    source_reference=obs.document_title,
                    included=True,
                )
            )

        # Generate from significant trends
        for t in trends_list[:2]:
            questions_list.append(
                VisitPackQuestionItem(
                    question=f"My records show that my {t.test_name} has changed over time ({t.change_description}). Should we consider any follow-up testing?",
                    rationale=f"Observed change from {t.baseline_value} ({t.baseline_date}) to {t.latest_value} ({t.latest_date})",
                    source_reference=t.test_name,
                    included=True,
                )
            )

        # Generate from active medications
        for m in medications_list[:2]:
            questions_list.append(
                VisitPackQuestionItem(
                    question=f"Should I continue taking {m.name} ({m.strength or 'current dose'}) as currently directed ({m.dosage_instructions or m.frequency or 'regular schedule'})?",
                    rationale=f"User-recorded active medication prescribed by {m.prescriber or 'healthcare provider'}",
                    source_reference=m.name,
                    included=True,
                )
            )

        if not questions_list:
            questions_list.append(
                VisitPackQuestionItem(
                    question="Are there any preventive screenings, routine panels, or lifestyle adjustments recommended based on my recent records?",
                    rationale="General preventive care inquiry for doctor visit",
                    source_reference=None,
                    included=True,
                )
            )

    gen_time = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    patient_name = profile.name if profile else (user.name or "Patient")
    profile_id_val = str(profile.id) if profile else None
    profile_rel = profile.relationship if profile else "self"

    return DoctorVisitPackData(
        patient_name=patient_name,
        patient_email=user.email,
        profile_id=profile_id_val,
        profile_relationship=profile_rel,
        clinician_name=req.clinician_name,
        chief_complaint=req.chief_complaint,
        patient_notes=None,
        start_date=req.start_date,
        end_date=req.end_date,
        generated_at=gen_time,
        include_unverified=req.include_unverified,
        categories=categories,
        documents=documents_meta,
        observations=observations_list,
        trends=trends_list,
        medications=medications_list,
        appointments=appointments_list,
        follow_up_tasks=tasks_list,
        clinician_questions=questions_list,
        disclaimer=CLINICAL_DISCLAIMER,
    )


def export_visit_pack_pdf(
    db: Session,
    user: User,
    pack: DoctorVisitPackData,
) -> bytes:
    """Validate record ownership, format clinical content safely, and generate PDF."""
    export_profile = None
    if pack.profile_id:
        try:
            p_uuid = uuid.UUID(pack.profile_id)
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid profile_id in export request.",
            )
        from app.services.family_profile import verify_profile_access
        export_profile = verify_profile_access(db, user, p_uuid)

    # Strict Authorization Validation: Verify that all referenced IDs belong to user (and profile if specified)
    doc_ids_to_check = [uuid.UUID(d.document_id) for d in pack.documents if d.document_id]
    if doc_ids_to_check:
        doc_q = db.query(Document).filter(
            Document.id.in_(doc_ids_to_check),
            Document.owner_id == user.id,
        )
        if export_profile:
            if export_profile.is_primary:
                doc_q = doc_q.filter((Document.profile_id == export_profile.id) | (Document.profile_id.is_(None)))
            else:
                doc_q = doc_q.filter(Document.profile_id == export_profile.id)
        count = doc_q.count()
        if count != len(doc_ids_to_check):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to one or more referenced medical documents.",
            )

    obs_ids_to_check = [uuid.UUID(o.observation_id) for o in pack.observations if o.observation_id]
    if obs_ids_to_check:
        count = db.query(DocumentObservation).filter(
            DocumentObservation.id.in_(obs_ids_to_check),
            DocumentObservation.owner_id == user.id,
        ).count()
        if count != len(obs_ids_to_check):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to one or more referenced clinical observations.",
            )

    med_ids_to_check = []
    for m in pack.medications:
        try:
            med_ids_to_check.append(uuid.UUID(m.id))
        except (ValueError, TypeError):
            pass
    if med_ids_to_check:
        med_q = db.query(MedicationRecord).filter(
            MedicationRecord.id.in_(med_ids_to_check),
            MedicationRecord.user_id == user.id,
        )
        if export_profile:
            if export_profile.is_primary:
                med_q = med_q.filter((MedicationRecord.profile_id == export_profile.id) | (MedicationRecord.profile_id.is_(None)))
            else:
                med_q = med_q.filter(MedicationRecord.profile_id == export_profile.id)
        count = med_q.count()
        if count != len(med_ids_to_check):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to one or more referenced medication records.",
            )

    appt_ids_to_check = []
    for a in pack.appointments:
        try:
            appt_ids_to_check.append(uuid.UUID(a.id))
        except (ValueError, TypeError):
            pass
    if appt_ids_to_check:
        appt_q = db.query(AppointmentRecord).filter(
            AppointmentRecord.id.in_(appt_ids_to_check),
            AppointmentRecord.user_id == user.id,
        )
        if export_profile:
            if export_profile.is_primary:
                appt_q = appt_q.filter((AppointmentRecord.profile_id == export_profile.id) | (AppointmentRecord.profile_id.is_(None)))
            else:
                appt_q = appt_q.filter(AppointmentRecord.profile_id == export_profile.id)
        count = appt_q.count()
        if count != len(appt_ids_to_check):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to one or more referenced appointment records.",
            )

    # Setup ReportLab Doc
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=54,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()

    # Typography styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a"),
    )
    meta_style = ParagraphStyle(
        "DocMeta",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#475569"),
    )
    h1_style = ParagraphStyle(
        "SectionH1",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#1e3a8a"),
        spaceBefore=12,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        "DocBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1e293b"),
    )
    bullet_style = ParagraphStyle(
        "DocBullet",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1e293b"),
        leftIndent=10,
        spaceAfter=3,
    )
    disclaimer_style = ParagraphStyle(
        "DocDisclaimer",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor("#78350f"),
    )
    table_header_style = ParagraphStyle(
        "TH",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#ffffff"),
    )
    table_cell_style = ParagraphStyle(
        "TC",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#0f172a"),
    )
    table_cell_bold = ParagraphStyle(
        "TCB",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#0f172a"),
    )
    flag_cell_high = ParagraphStyle(
        "TCHigh",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#b91c1c"),
    )

    story = []

    # Title & Metadata Header
    story.append(Paragraph("Doctor Visit Preparation Pack", title_style))
    story.append(Spacer(1, 4))

    meta_parts = [
        f"<b>Patient:</b> {_safe_text(pack.patient_name)}",
        f"<b>Account:</b> {_safe_text(pack.patient_email)}",
        f"<b>Generated:</b> {_safe_text(pack.generated_at)}",
    ]
    if pack.clinician_name:
        meta_parts.append(f"<b>For Clinician/Facility:</b> {_safe_text(pack.clinician_name)}")
    if pack.start_date or pack.end_date:
        meta_parts.append(
            f"<b>Record Filter:</b> {_safe_text(pack.start_date or 'Earliest')} to {_safe_text(pack.end_date or 'Latest')}"
        )

    story.append(Paragraph(" &nbsp;|&nbsp; ".join(meta_parts), meta_style))
    story.append(Spacer(1, 8))

    # Safety Notice Banner
    disclaimer_box = Table(
        [[Paragraph(f"<b>CLINICAL SAFETY NOTICE:</b> {_safe_text(pack.disclaimer)}", disclaimer_style)]],
        colWidths=[540],
    )
    disclaimer_box.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fef3c7")),
            ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#f59e0b")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(disclaimer_box)
    story.append(Spacer(1, 8))

    # Section 1: Chief Complaints & Visit Goals (if provided)
    if pack.chief_complaint or pack.patient_notes:
        story.append(Paragraph("1. Primary Reason for Visit & Patient Goals", h1_style))
        if pack.chief_complaint:
            story.append(
                Paragraph(f"<b>Chief Concerns / Symptoms:</b> {_safe_text(pack.chief_complaint)}", body_style)
            )
            story.append(Spacer(1, 4))
        if pack.patient_notes:
            story.append(
                Paragraph(f"<b>Personal Visit Notes:</b> {_safe_text(pack.patient_notes)}", body_style)
            )
            story.append(Spacer(1, 4))
        story.append(Spacer(1, 6))

    # Section 2: Questions to Discuss with Healthcare Provider
    included_questions = [q for q in pack.clinician_questions if q.included]
    if included_questions:
        story.append(Paragraph("2. Questions to Discuss with Healthcare Provider", h1_style))
        for idx, q in enumerate(included_questions, start=1):
            q_text = f"<b>Q{idx}:</b> {_safe_text(q.question)}"
            story.append(Paragraph(q_text, bullet_style))
            if q.rationale:
                story.append(
                    Paragraph(
                        f"&nbsp;&nbsp;<i>Context: {_safe_text(q.rationale)}</i>",
                        meta_style,
                    )
                )
        story.append(Spacer(1, 6))

    # Section 3: Current Medications & Supplements
    included_meds = [m for m in pack.medications if m.included]
    if included_meds:
        story.append(Paragraph("3. Current Medications & Supplements (User-Reported)", h1_style))
        med_rows = [[
            Paragraph("Medication Name", table_header_style),
            Paragraph("Strength", table_header_style),
            Paragraph("Dosage & Instructions", table_header_style),
            Paragraph("Frequency", table_header_style),
            Paragraph("Prescriber", table_header_style),
        ]]
        for m in included_meds:
            med_rows.append([
                Paragraph(_safe_text(m.name), table_cell_bold),
                Paragraph(_safe_text(m.strength), table_cell_style),
                Paragraph(_safe_text(m.dosage_instructions), table_cell_style),
                Paragraph(_safe_text(m.frequency), table_cell_style),
                Paragraph(_safe_text(m.prescriber), table_cell_style),
            ])
        med_table = Table(med_rows, colWidths=[110, 65, 175, 95, 95])
        med_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a8a")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#ffffff"), colors.HexColor("#f8fafc")]),
            ])
        )
        story.append(med_table)
        story.append(Spacer(1, 8))

    # Section 4: Clinical Observations & Laboratory Results
    included_obs = [o for o in pack.observations if o.included]
    if included_obs:
        story.append(Paragraph("4. Clinical Observations & Laboratory Results", h1_style))
        obs_rows = [[
            Paragraph("Test / Analyte", table_header_style),
            Paragraph("Value & Unit", table_header_style),
            Paragraph("Reference Range", table_header_style),
            Paragraph("Flag", table_header_style),
            Paragraph("Date", table_header_style),
            Paragraph("Source Report", table_header_style),
        ]]
        for o in included_obs:
            flag_style = flag_cell_high if o.flag in ("HIGH", "LOW", "ABNORMAL") else table_cell_style
            flag_text = o.flag or "NORMAL"
            val_unit = f"{_safe_text(o.value)} {_safe_text(o.unit or '')}".strip()

            obs_rows.append([
                Paragraph(_safe_text(o.test_name), table_cell_bold),
                Paragraph(val_unit, table_cell_style),
                Paragraph(_safe_text(o.reference_range), table_cell_style),
                Paragraph(_safe_text(flag_text), flag_style),
                Paragraph(_safe_text(o.clinical_date), table_cell_style),
                Paragraph(_safe_text(o.document_title), table_cell_style),
            ])
        obs_table = Table(obs_rows, colWidths=[130, 85, 100, 55, 65, 105])
        obs_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a8a")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#ffffff"), colors.HexColor("#f8fafc")]),
            ])
        )
        story.append(obs_table)
        story.append(Spacer(1, 8))

    # Section 5: Measurable Longitudinal Trends
    included_trends = [t for t in pack.trends if t.included]
    if included_trends:
        story.append(Paragraph("5. Measurable Longitudinal Trends Across Reports", h1_style))
        for t in included_trends:
            trend_desc = (
                f"• <b>{_safe_text(t.test_name)}</b> ({_safe_text(t.category)}): "
                f"Baseline {_safe_text(t.baseline_value)} ({_safe_text(t.baseline_date or 'initial')}) → "
                f"Latest {_safe_text(t.latest_value)} ({_safe_text(t.latest_date or 'recent')}) — "
                f"<i>{_safe_text(t.change_description)}</i>"
            )
            story.append(Paragraph(trend_desc, bullet_style))
        story.append(Spacer(1, 6))

    # Section 6: Upcoming Appointments & Outstanding Care Follow-Ups
    included_appts = [a for a in pack.appointments if a.included]
    included_tasks = [tk for tk in pack.follow_up_tasks if tk.included]
    if included_appts or included_tasks:
        story.append(Paragraph("6. Scheduled Care & Follow-Up Tasks", h1_style))
        if included_appts:
            story.append(Paragraph("<b>Upcoming Appointments:</b>", body_style))
            for a in included_appts:
                a_info = f"• <b>{_safe_text(a.title)}</b> — {_safe_text(a.scheduled_at)}"
                if a.provider_name:
                    a_info += f" with {_safe_text(a.provider_name)}"
                if a.location:
                    a_info += f" ({_safe_text(a.location)})"
                story.append(Paragraph(a_info, bullet_style))
            story.append(Spacer(1, 4))

        if included_tasks:
            story.append(Paragraph("<b>Pending Follow-Up Tasks:</b>", body_style))
            for tk in included_tasks:
                tk_info = f"• [ ] <b>{_safe_text(tk.title)}</b>"
                if tk.due_at:
                    tk_info += f" (Due: {_safe_text(tk.due_at)})"
                tk_info += f" — Priority: {_safe_text(tk.priority.capitalize())}"
                story.append(Paragraph(tk_info, bullet_style))
            story.append(Spacer(1, 4))
        story.append(Spacer(1, 6))

    # Section 7: Source Medical Reports Analyzed
    if pack.documents:
        story.append(Paragraph("7. Source Medical Reports Analyzed", h1_style))
        doc_rows = [[
            Paragraph("Report Filename", table_header_style),
            Paragraph("Clinical Date", table_header_style),
            Paragraph("Pages", table_header_style),
            Paragraph("Verification Status", table_header_style),
        ]]
        for d in pack.documents:
            v_status = "User Verified" if d.is_verified else "Extracted (Unverified)"
            doc_rows.append([
                Paragraph(_safe_text(d.filename), table_cell_bold),
                Paragraph(_safe_text(d.clinical_date), table_cell_style),
                Paragraph(str(d.page_count), table_cell_style),
                Paragraph(v_status, table_cell_style),
            ])
        doc_table = Table(doc_rows, colWidths=[240, 110, 60, 130])
        doc_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a8a")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#ffffff"), colors.HexColor("#f8fafc")]),
            ])
        )
        story.append(doc_table)
        story.append(Spacer(1, 10))

    # Sign-off line
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1"), spaceBefore=8, spaceAfter=8))
    sign_off_text = (
        f"Prepared by HealthMate AI for patient {_safe_text(pack.patient_name)} ({_safe_text(pack.patient_email)}). "
        "All factual statements derive from uploaded documents or user-provided care records. "
        "Questions or corrections should be discussed directly with your attending physician."
    )
    story.append(Paragraph(sign_off_text, meta_style))

    # Build PDF
    doc.build(story, canvasmaker=VisitPackNumberedCanvas)
    return buffer.getvalue()
