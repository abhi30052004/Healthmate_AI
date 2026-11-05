import io
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
)
from reportlab.pdfgen import canvas

from app.models.document import Document, DocumentObservation
from app.models.user import User
from app.services.medical_insights import (
    calculate_overview_metrics,
    get_medical_findings,
    get_longitudinal_insights_trends,
    get_data_quality_report,
)
from app.services.health_summary import generate_offline_health_summary
from app.services.timeline import _get_best_clinical_date


class NumberedCanvas(canvas.Canvas):
    """Canvas that computes total page count dynamically for running footer."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Header rule & title
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(36, 756, 576, 756)
        self.drawString(36, 762, "HealthMate AI — Personal Health Record & Insights Report")

        # Running footer
        self.line(36, 45, 576, 45)
        self.drawString(36, 32, "Confidential Health Summary • Educational & Clinician Discussion Tool Only • Not a Diagnosis")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(576, 32, page_str)
        self.restoreState()


def generate_pdf_health_report(
    db: Session,
    user: User,
    start_date: str | None = None,
    end_date: str | None = None,
    include_unverified: bool = False,
    included_sections: list[str] | None = None,
    profile_id: uuid.UUID | None = None,
) -> bytes:
    """Generate a clean, professionally formatted PDF report from the user's clinical records."""
    if profile_id is not None:
        from app.services.family_profile import verify_profile_access
        profile = verify_profile_access(db, user, profile_id)
        profile_name = profile.name
    else:
        profile_name = None

    buffer = io.BytesIO()

    # Document setup: 0.5 inch margins (36 points)
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=54,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0f172a"),
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#475569"),
    )
    h1_style = ParagraphStyle(
        "SectionH1",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#1e3a8a"),
        spaceBefore=14,
        spaceAfter=6,
    )
    h2_style = ParagraphStyle(
        "SectionH2",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=8,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        "BodyTextCustom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1e293b"),
    )
    bullet_style = ParagraphStyle(
        "BulletCustom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1e293b"),
        leftIndent=12,
        spaceAfter=3,
    )
    disclaimer_style = ParagraphStyle(
        "DisclaimerText",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#78350f"),
    )
    table_header_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#ffffff"),
    )
    table_cell_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0f172a"),
    )
    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0f172a"),
    )

    story = []

    # Title & Header
    story.append(Paragraph("HealthMate AI — Personal Health Summary", title_style))
    gen_time = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    meta_text = f"<b>Patient Account:</b> {user.email}"
    if profile_name:
        meta_text += f" &nbsp;|&nbsp; <b>Profile:</b> {profile_name}"
    meta_text += f" &nbsp;|&nbsp; <b>Generated:</b> {gen_time}"
    if start_date or end_date:
        meta_text += f" &nbsp;|&nbsp; <b>Filter Range:</b> {start_date or 'Earliest'} to {end_date or 'Latest'}"
    story.append(Paragraph(meta_text, subtitle_style))
    story.append(Spacer(1, 8))

    # Prominent Safety Banner
    disclaimer_html = (
        "<b>CLINICAL SAFETY NOTICE:</b> This document provides an organized summary of records and laboratory reference ranges "
        "uploaded by the user. It does <b>not</b> constitute a medical diagnosis, clinical risk evaluation, or treatment prescription. "
        "A flagged observation reflects only a printed laboratory range and is not proof of disease. Always review these results "
        "with a qualified physician or healthcare provider."
    )
    disclaimer_table = Table(
        [[Paragraph(disclaimer_html, disclaimer_style)]],
        colWidths=[540],
    )
    disclaimer_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fef3c7")),
            ("BORDER", (0, 0), (-1, -1), 1, colors.HexColor("#fde68a")),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(disclaimer_table)
    story.append(Spacer(1, 10))

    # Fetch User Records & Insights
    user_docs_query = db.query(Document).filter(Document.owner_id == user.id)
    if profile_id is not None:
        user_docs_query = user_docs_query.filter(Document.profile_id == profile_id)
    user_docs = user_docs_query.all()

    if not user_docs:
        # Empty State PDF
        story.append(Paragraph("Health-Record Overview", h1_style))
        story.append(Paragraph("No medical documents or observations were found for this user account.", body_style))
        story.append(Spacer(1, 10))
        story.append(Paragraph("Upload clinical records or laboratory test PDFs via the dashboard to generate your personalized health record report.", body_style))
        doc.build(story, canvasmaker=NumberedCanvas)
        return buffer.getvalue()

    overview = calculate_overview_metrics(db, user, profile_id=profile_id)
    findings = get_medical_findings(db, user, include_unverified=include_unverified, limit=200, profile_id=profile_id)
    trends = get_longitudinal_insights_trends(db, user, include_unverified=include_unverified, profile_id=profile_id)
    quality = get_data_quality_report(db, user, profile_id=profile_id)
    summary_data = generate_offline_health_summary(overview, findings.items, trends.items, quality)

    # 1. Overview Statistics Table
    story.append(Paragraph("1. Health-Record Overview", h1_style))
    overview_data = [
        [
            Paragraph(f"<b>Uploaded Reports:</b> {overview.total_reports}", body_style),
            Paragraph(f"<b>Verified Observations:</b> {overview.verified_observations_count}", body_style),
            Paragraph(f"<b>Noteworthy Findings:</b> {overview.noteworthy_findings_count}", body_style),
        ],
        [
            Paragraph(f"<b>Distinct Test Types:</b> {overview.distinct_test_types_count}", body_style),
            Paragraph(f"<b>Comparable Tests with History:</b> {overview.comparable_tests_with_history_count}", body_style),
            Paragraph(
                f"<b>Record Dates:</b> {overview.earliest_date or 'Unstated'} to {overview.latest_date or 'Unstated'}",
                body_style,
            ),
        ],
    ]
    ov_table = Table(overview_data, colWidths=[180, 180, 180])
    ov_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BORDER", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(ov_table)
    story.append(Spacer(1, 10))

    # 2. Source Reports
    story.append(Paragraph("2. Uploaded Source Reports", h1_style))
    doc_table_data = [
        [
            Paragraph("Document Title", table_header_style),
            Paragraph("Clinical Date", table_header_style),
            Paragraph("Provenance", table_header_style),
            Paragraph("Laboratory / Facility", table_header_style),
            Paragraph("Status", table_header_style),
        ]
    ]

    for d in user_docs:
        cdate, prov = _get_best_clinical_date(d)
        doc_table_data.append([
            Paragraph(d.filename, table_cell_bold),
            Paragraph(cdate, table_cell_style),
            Paragraph(prov.capitalize(), table_cell_style),
            Paragraph(d.lab_name or "Unstated", table_cell_style),
            Paragraph("Verified" if d.is_verified else "Extracted", table_cell_style),
        ])

    doc_tbl = Table(doc_table_data, colWidths=[180, 75, 75, 130, 80], repeatRows=1)
    doc_tbl.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a8a")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ])
    )
    story.append(doc_tbl)
    story.append(Spacer(1, 10))

    # 3. Personalized Health Record Narrative & Key Findings
    story.append(Paragraph("3. Clinical Observations & Insights Summary", h1_style))
    story.append(Paragraph(summary_data.narrative_summary, body_style))
    story.append(Spacer(1, 6))

    if summary_data.key_findings:
        story.append(Paragraph("<b>Key Findings Compared with Printed Reference Ranges:</b>", h2_style))
        for kf in summary_data.key_findings:
            story.append(Paragraph(f"• {kf}", bullet_style))
        story.append(Spacer(1, 6))

    if summary_data.longitudinal_highlights:
        story.append(Paragraph("<b>Longitudinal Trajectory Highlights:</b>", h2_style))
        for lh in summary_data.longitudinal_highlights:
            story.append(Paragraph(f"• {lh}", bullet_style))
        story.append(Spacer(1, 6))

    # 4. Detailed Observations Table
    story.append(Paragraph("4. Recorded Clinical Observations", h1_style))

    filtered_findings = []
    for f in findings.items:
        if start_date and f.clinical_date < start_date:
            continue
        if end_date and f.clinical_date > end_date:
            continue
        filtered_findings.append(f)

    if filtered_findings:
        obs_table_data = [
            [
                Paragraph("Date", table_header_style),
                Paragraph("Test Analyte", table_header_style),
                Paragraph("Value & Unit", table_header_style),
                Paragraph("Reference Range", table_header_style),
                Paragraph("Lab Flag", table_header_style),
                Paragraph("Classification", table_header_style),
            ]
        ]

        for f in filtered_findings:
            val_unit = f"{f.value} {f.unit or ''}"
            cls_text = f.classification.replace("_", " ").title()
            tname = f.original_test_name or f.normalized_test_name or "Test"

            obs_table_data.append([
                Paragraph(f.clinical_date or "Unstated", table_cell_style),
                Paragraph(tname, table_cell_bold),
                Paragraph(val_unit, table_cell_style),
                Paragraph(f.reference_range or "Unstated", table_cell_style),
                Paragraph(f.laboratory_flag or "NORMAL", table_cell_style),
                Paragraph(cls_text, table_cell_style),
            ])

        obs_tbl = Table(obs_table_data, colWidths=[65, 125, 95, 105, 60, 90], repeatRows=1)
        obs_tbl.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("TOPPADDING", (0, 0), (-1, -1), 2.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ])
        )
        story.append(obs_tbl)
    else:
        story.append(Paragraph("No observations matched the requested date criteria.", body_style))

    story.append(Spacer(1, 10))

    # 5. Longitudinal Trends
    if trends.items:
        story.append(Paragraph("5. Historical Changes in Comparable Measurements", h1_style))
        trend_table_data = [
            [
                Paragraph("Test Analyte", table_header_style),
                Paragraph("Previous Reading", table_header_style),
                Paragraph("Latest Reading", table_header_style),
                Paragraph("Absolute Change", table_header_style),
                Paragraph("Direction", table_header_style),
            ]
        ]

        for tr in trends.items:
            delta_str = (
                f"{tr.absolute_change:+.2f} {tr.standard_unit}"
                if tr.absolute_change is not None
                else "N/A"
            )
            if tr.percentage_change is not None:
                delta_str += f" ({tr.percentage_change:+.1f}%)"

            prev_dict = tr.previous_reading or {}
            latest_dict = tr.latest_reading or {}
            prev_desc = f"{prev_dict.get('value', '')} {prev_dict.get('unit', '')} ({prev_dict.get('clinical_date', 'Unstated')})"
            latest_desc = f"{latest_dict.get('value', '')} {latest_dict.get('unit', '')} ({latest_dict.get('clinical_date', 'Unstated')})"

            trend_table_data.append([
                Paragraph(tr.normalized_test_name, table_cell_bold),
                Paragraph(prev_desc, table_cell_style),
                Paragraph(latest_desc, table_cell_style),
                Paragraph(delta_str, table_cell_style),
                Paragraph(tr.direction.capitalize(), table_cell_style),
            ])

        trend_tbl = Table(trend_table_data, colWidths=[120, 110, 110, 110, 90], repeatRows=1)
        trend_tbl.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4338ca")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ])
        )
        story.append(trend_tbl)
        story.append(Spacer(1, 10))

    # 6. Data Quality & Gaps Disclosures
    if summary_data.data_quality_disclosures:
        story.append(Paragraph("6. Data-Quality Disclosures & Incomplete Record Limitations", h1_style))
        for dq in summary_data.data_quality_disclosures:
            story.append(Paragraph(f"• {dq}", bullet_style))
        story.append(Spacer(1, 8))

    # 7. Clinician Discussion Prompts
    if summary_data.suggested_clinician_questions:
        story.append(Paragraph("7. Questions to Discuss with Your Healthcare Provider", h1_style))
        for q in summary_data.suggested_clinician_questions:
            story.append(Paragraph(f"💬 {q}", bullet_style))
        story.append(Spacer(1, 8))

    # 8. Traceable Citations
    if summary_data.citations:
        story.append(Paragraph("8. Traceable Evidence Citations", h1_style))
        citation_data = [
            [
                Paragraph("Citation", table_header_style),
                Paragraph("Analyte", table_header_style),
                Paragraph("Source Report", table_header_style),
                Paragraph("Page", table_header_style),
                Paragraph("Report Excerpt", table_header_style),
            ]
        ]
        for c in summary_data.citations[:10]:
            tname = c.original_test_name or c.normalized_test_name or "General"
            citation_data.append([
                Paragraph(f"<b>[{c.citation_id}]</b>", table_cell_bold),
                Paragraph(tname, table_cell_style),
                Paragraph(c.document_title, table_cell_style),
                Paragraph(str(c.page_number) if c.page_number else "—", table_cell_style),
                Paragraph(c.source_text or "—", table_cell_style),
            ])

        cit_tbl = Table(citation_data, colWidths=[55, 105, 130, 40, 210], repeatRows=1)
        cit_tbl.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#334155")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("TOPPADDING", (0, 0), (-1, -1), 2.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ])
        )
        story.append(cit_tbl)
        story.append(Spacer(1, 10))

    # Final Closing Disclaimer
    story.append(Paragraph(
        "<b>Medical Disclaimer:</b> HealthMate AI summaries are generated algorithmically for educational and self-advocacy purposes. "
        "Laboratory values should always be correlated with clinical symptoms and reviewed by a licensed physician.",
        disclaimer_style,
    ))

    # Build PDF with NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    return buffer.getvalue()
