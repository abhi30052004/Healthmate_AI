import csv
import io
from sqlalchemy.orm import Session

from app.models.document import Document, DocumentObservation
from app.models.user import User
from app.services.timeline import _get_best_clinical_date

FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def sanitize_csv_cell(value: str | None) -> str:
    """Protect against spreadsheet formula injection (CSV Injection / CWE-1236).

    If a cell value begins with =, +, -, @, tab, or carriage return, prepend a single quote.
    """
    if value is None:
        return ""
    val_str = str(value)
    if val_str.startswith(FORMULA_PREFIXES):
        return f"'{val_str}"
    return val_str


def generate_observations_csv(
    db: Session,
    user: User,
    start_date: str | None = None,
    end_date: str | None = None,
    include_unverified: bool = False,
    profile_id=None,
) -> str:
    """Generate sanitized, UTF-8 CSV containing the user's clinical observations and provenance."""
    if profile_id is not None:
        from app.services.family_profile import verify_profile_access
        verify_profile_access(db, user, profile_id)

    query = (
        db.query(DocumentObservation, Document)
        .join(Document, DocumentObservation.document_id == Document.id)
        .filter(Document.owner_id == user.id)
    )
    if profile_id is not None:
        query = query.filter(Document.profile_id == profile_id)

    if not include_unverified:
        query = query.filter(DocumentObservation.is_reviewed.is_(True))

    records = query.all()

    # In-memory string buffer with UTF-8 BOM for Microsoft Excel / Sheets compatibility
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

    # Header Row
    headers = [
        "Clinical Date",
        "Date Provenance",
        "Document Title",
        "Laboratory Name",
        "Original Test Name",
        "Normalized Test Name",
        "Category",
        "Recorded Value",
        "Unit",
        "Reference Range",
        "Laboratory Flag",
        "Review Status",
        "Source Page",
        "Source Excerpt",
    ]
    writer.writerow(headers)

    # Sort records chronologically
    def sort_key(pair):
        obs, doc = pair
        cdate, _ = _get_best_clinical_date(doc)
        return (cdate, doc.created_at.isoformat() if doc.created_at else "")

    records.sort(key=sort_key)

    for obs, doc in records:
        cdate, provenance = _get_best_clinical_date(doc)

        # Date range filtering if requested
        if start_date and cdate < start_date:
            continue
        if end_date and cdate > end_date:
            continue

        row = [
            sanitize_csv_cell(cdate),
            sanitize_csv_cell(provenance),
            sanitize_csv_cell(doc.filename),
            sanitize_csv_cell(doc.lab_name or "Unstated"),
            sanitize_csv_cell(obs.test_name),
            sanitize_csv_cell(obs.normalized_test_name or obs.test_name),
            sanitize_csv_cell(obs.category or "General"),
            sanitize_csv_cell(obs.value),
            sanitize_csv_cell(obs.unit or ""),
            sanitize_csv_cell(obs.reference_range or "Unstated"),
            sanitize_csv_cell(obs.flag or "NORMAL"),
            sanitize_csv_cell("Verified" if obs.is_reviewed else "Unverified"),
            sanitize_csv_cell(str(obs.source_page) if obs.source_page else "1"),
            sanitize_csv_cell(obs.source_text or ""),
        ]
        writer.writerow(row)

    return output.getvalue()
