"""Unified evidence-grounded medical record search service.

Searches across:
- Uploaded medical documents (metadata and extracted text)
- Extracted clinical observations (with verification status & original values)
- Care medications
- Care appointments
- Care follow-up tasks

Intentionally unsupported direct sources: Medical insights and report-comparisons
are computed dynamically on-demand from underlying documents and observations
to avoid redundant/stale persistence; their evidence is retrieved directly through
the underlying observations and source documents.

Strict tenant isolation is enforced on every query.
Untrusted input is treated safely with deterministic matching and ranking.
"""

from datetime import date, datetime, timezone
import re
from typing import Any
import uuid

from sqlalchemy.orm import Session

from app.models.care import AppointmentRecord, FollowUpTask, MedicationRecord
from app.models.document import Document, DocumentObservation
from app.models.user import User
from app.schemas.search import SearchQueryRequest, SearchResponse, SearchResultItem
from app.services.medical_retrieval import extract_search_tokens, identify_target_analytes


def parse_date_safely(val: Any) -> datetime | None:
    """Attempt to parse string, date, or datetime into an aware datetime."""
    if val is None:
        return None
    if isinstance(val, datetime):
        if val.tzinfo is None:
            return val.replace(tzinfo=timezone.utc)
        return val
    if isinstance(val, date):
        return datetime(val.year, val.month, val.day, tzinfo=timezone.utc)
    if isinstance(val, str):
        val = val.strip()
        # ISO / standard date patterns
        for fmt in (
            "%Y-%m-%d",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%d %H:%M:%S",
            "%m/%d/%Y",
            "%d/%m/%Y",
        ):
            try:
                dt = datetime.strptime(val[:19], fmt)
                return dt.replace(tzinfo=timezone.utc)
            except ValueError:
                continue
    return None


def extract_snippet(text: str, query: str, max_chars: int = 240) -> str:
    """Extract a bounded snippet centered around matching query terms."""
    if not text:
        return ""
    text_clean = " ".join(text.split())
    if len(text_clean) <= max_chars:
        return text_clean

    q_lower = query.lower().strip()
    idx = text_clean.lower().find(q_lower)
    if idx == -1:
        tokens = extract_search_tokens(query)
        for token in tokens:
            idx = text_clean.lower().find(token)
            if idx != -1:
                break

    if idx == -1:
        return text_clean[:max_chars].rstrip() + "..."

    start = max(0, idx - 60)
    end = min(len(text_clean), idx + max_chars - 60)
    snippet = text_clean[start:end]
    if start > 0:
        snippet = "..." + snippet
    if end < len(text_clean):
        snippet = snippet + "..."
    return snippet


def interpret_query_intent(query: str) -> dict[str, Any]:
    """Deterministically parse natural language search intents without inventing records."""
    q_clean = query.strip()
    q_lower = q_clean.lower()
    analytes = identify_target_analytes(q_clean)

    inferred_source: str | None = None
    if any(k in q_lower for k in ("prescription", "medication", "pill", "dosage", "drug", "rx")):
        inferred_source = "medication"
    elif any(k in q_lower for k in ("appointment", "doctor visit", "consultation", "clinic visit")):
        inferred_source = "appointment"
    elif any(k in q_lower for k in ("follow-up", "follow up", "task", "todo", "action item")):
        inferred_source = "follow_up"
    elif any(k in q_lower for k in ("report", "document", "pdf", "file", "scan", "upload")):
        inferred_source = "document"
    elif analytes or any(k in q_lower for k in ("glucose", "cholesterol", "test", "measurement", "lab", "result", "level")):
        inferred_source = "observation"

    intent_desc = "Natural language record search"
    if analytes:
        intent_desc = f"Search clinical measurements for analyte: {', '.join(analytes)}"
    elif inferred_source:
        intent_desc = f"Search {inferred_source.replace('_', ' ')} records"

    return {
        "analytes": analytes,
        "inferred_source": inferred_source,
        "intent_desc": intent_desc,
    }


def calculate_relevance(
    query: str,
    title: str,
    text_content: str,
    target_analytes: list[str],
    is_verified: bool | None = None,
) -> float:
    """Calculate deterministic relevance score for a record."""
    q_lower = query.lower().strip()
    title_lower = title.lower().strip()
    content_lower = text_content.lower()

    score = 0.0

    # 1. Exact title or analyte match
    if q_lower == title_lower:
        score += 100.0
    elif any(a.lower() == title_lower for a in target_analytes):
        score += 95.0
    elif q_lower in title_lower:
        score += 80.0

    # 2. Exact phrase in content
    if len(q_lower) > 3 and q_lower in content_lower:
        score += 50.0

    # 3. Token matching
    tokens = extract_search_tokens(query)
    if tokens:
        matching_title_tokens = sum(1 for t in tokens if t in title_lower)
        matching_content_tokens = sum(1 for t in tokens if t in content_lower)
        total_matched = matching_title_tokens + matching_content_tokens

        if total_matched > 0:
            score += 20.0 + (min(total_matched, 10) * 3.0)

        # Bonus if all tokens matched
        all_in_title_or_content = all(t in title_lower or t in content_lower for t in tokens)
        if all_in_title_or_content:
            score += 25.0

    # 4. Verified observations bonus so verified ranks higher than unverified
    if score > 0 and is_verified is True:
        score += 5.0

    return round(score, 2)


def search_medical_records(
    db: Session,
    user: User,
    request: SearchQueryRequest,
) -> SearchResponse:
    """Unified evidence-grounded search across all user medical data."""
    query_str = request.q.strip()
    if not query_str:
        return SearchResponse(
            query="",
            parsed_intent="Empty query",
            total_results=0,
            page=request.page,
            page_size=request.page_size,
            results=[],
        )

    # Validate date boundaries
    start_dt = parse_date_safely(request.start_date)
    end_dt = parse_date_safely(request.end_date)
    if start_dt and end_dt and start_dt > end_dt:
        raise ValueError("start_date cannot be later than end_date")

    intent_info = interpret_query_intent(query_str)
    target_analytes = intent_info["analytes"]
    tokens = extract_search_tokens(query_str)

    # Determine which sources to query
    source_type = request.source_type
    include_all = source_type == "all"
    results: list[SearchResultItem] = []

    # -------------------------------------------------------------------------
    # 1. Documents Search
    # -------------------------------------------------------------------------
    if include_all or source_type == "document":
        doc_q = db.query(Document).filter(Document.owner_id == user.id)
        if not getattr(request, "include_archived", False):
            doc_q = doc_q.filter(Document.is_archived.is_(False))
        if getattr(request, "profile_id", None):
            doc_q = doc_q.filter(Document.profile_id == request.profile_id)
        docs = doc_q.all()

        for doc in docs:
            doc_date_dt = parse_date_safely(doc.document_date) or parse_date_safely(doc.created_at)
            if start_dt and doc_date_dt and doc_date_dt < start_dt:
                continue
            if end_dt and doc_date_dt and doc_date_dt > end_dt:
                continue

            searchable_text = f"{doc.filename} {doc.lab_name or ''} {doc.patient_name or ''} {doc.extracted_text or ''}"
            score = calculate_relevance(
                query=query_str,
                title=doc.filename,
                text_content=searchable_text,
                target_analytes=target_analytes,
                is_verified=doc.is_verified,
            )

            # Keep if score > 0 or if there were no specific tokens but matched
            if score > 0 or any(t in searchable_text.lower() for t in tokens):
                snippet = extract_snippet(doc.extracted_text or doc.filename, query_str)
                date_str = doc.document_date or (doc.created_at.strftime("%Y-%m-%d") if doc.created_at else None)
                results.append(
                    SearchResultItem(
                        id=f"doc_{doc.id}",
                        result_type="document",
                        record_id=str(doc.id),
                        title=doc.filename,
                        snippet=snippet,
                        source_document_id=str(doc.id),
                        source_document_title=doc.filename,
                        page_number=1,
                        date=date_str,
                        date_provenance="explicit" if doc.document_date else "inferred",
                        is_verified=doc.is_verified,
                        verification_status="verified" if doc.is_verified else "unverified",
                        relevance_score=max(score, 10.0),
                        frontend_destination="documents",
                    )
                )

    # -------------------------------------------------------------------------
    # 2. Observations Search
    # -------------------------------------------------------------------------
    if include_all or source_type == "observation":
        obs_q = (
            db.query(DocumentObservation, Document)
            .join(Document, DocumentObservation.document_id == Document.id)
            .filter(Document.owner_id == user.id)
        )

        if not getattr(request, "include_archived", False):
            obs_q = obs_q.filter(
                Document.is_archived.is_(False),
                DocumentObservation.is_archived.is_(False),
            )
        if getattr(request, "profile_id", None):
            obs_q = obs_q.filter(Document.profile_id == request.profile_id)

        if request.verified_only:
            obs_q = obs_q.filter(DocumentObservation.is_reviewed.is_(True))

        obs_records = obs_q.all()

        for obs, doc in obs_records:
            obs_date_dt = parse_date_safely(doc.document_date) or parse_date_safely(obs.created_at)
            if start_dt and obs_date_dt and obs_date_dt < start_dt:
                continue
            if end_dt and obs_date_dt and obs_date_dt > end_dt:
                continue

            searchable_text = f"{obs.test_name} {obs.normalized_test_name or ''} {obs.category or ''} {obs.source_text or ''} {obs.value} {obs.unit or ''}"
            score = calculate_relevance(
                query=query_str,
                title=obs.normalized_test_name or obs.test_name,
                text_content=searchable_text,
                target_analytes=target_analytes,
                is_verified=obs.is_reviewed,
            )

            # Check if analyte matched directly
            if any(a.lower() == (obs.normalized_test_name or "").lower() for a in target_analytes):
                score = max(score, 90.0)

            if score > 0 or any(t in searchable_text.lower() for t in tokens):
                snippet = obs.source_text if obs.source_text else f"{obs.test_name}: {obs.value} {obs.unit or ''}"
                date_str = doc.document_date or (obs.created_at.strftime("%Y-%m-%d") if obs.created_at else None)
                results.append(
                    SearchResultItem(
                        id=f"obs_{obs.id}",
                        result_type="observation",
                        record_id=str(obs.id),
                        title=obs.test_name,
                        snippet=extract_snippet(snippet, query_str),
                        source_document_id=str(doc.id),
                        source_document_title=doc.filename,
                        page_number=obs.source_page or 1,
                        date=date_str,
                        date_provenance="explicit" if doc.document_date else "inferred",
                        is_verified=obs.is_reviewed,
                        verification_status="verified" if obs.is_reviewed else "unverified",
                        value=obs.value,
                        unit=obs.unit,
                        reference_range=obs.reference_range,
                        flag=obs.flag,
                        relevance_score=max(score, 10.0),
                        frontend_destination="timeline",
                    )
                )

    # -------------------------------------------------------------------------
    # 3. Medications Search
    # -------------------------------------------------------------------------
    if include_all or source_type == "medication":
        meds_q = db.query(MedicationRecord).filter(MedicationRecord.user_id == user.id)
        meds = meds_q.all()

        for med in meds:
            med_date_dt = parse_date_safely(med.start_date) or parse_date_safely(med.created_at)
            if start_dt and med_date_dt and med_date_dt < start_dt:
                continue
            if end_dt and med_date_dt and med_date_dt > end_dt:
                continue

            searchable_text = f"{med.name} {med.strength or ''} {med.dosage_instructions or ''} {med.prescriber or ''} {med.pharmacy or ''} {med.notes or ''}"
            score = calculate_relevance(
                query=query_str,
                title=med.name,
                text_content=searchable_text,
                target_analytes=[],
                is_verified=True,
            )

            if score > 0 or any(t in searchable_text.lower() for t in tokens):
                snippet_text = f"{med.name} {med.strength or ''} - {med.dosage_instructions or med.frequency or 'Active'}"
                if med.notes:
                    snippet_text += f" | {med.notes}"
                date_str = med.start_date.isoformat() if med.start_date else (med.created_at.strftime("%Y-%m-%d") if med.created_at else None)
                results.append(
                    SearchResultItem(
                        id=f"med_{med.id}",
                        result_type="medication",
                        record_id=str(med.id),
                        title=med.name,
                        snippet=extract_snippet(snippet_text, query_str),
                        source_document_id=str(med.source_document_id) if med.source_document_id else None,
                        source_document_title=med.source_document.filename if med.source_document else None,
                        page_number=1 if med.source_document_id else None,
                        date=date_str,
                        date_provenance="explicit" if med.start_date else "inferred",
                        is_verified=True,
                        verification_status="reviewed",
                        value=med.strength,
                        relevance_score=max(score, 10.0),
                        frontend_destination="care",
                    )
                )

    # -------------------------------------------------------------------------
    # 4. Appointments Search
    # -------------------------------------------------------------------------
    if include_all or source_type == "appointment":
        appts_q = db.query(AppointmentRecord).filter(AppointmentRecord.user_id == user.id)
        appts = appts_q.all()

        for appt in appts:
            appt_date_dt = parse_date_safely(appt.scheduled_at)
            if start_dt and appt_date_dt and appt_date_dt < start_dt:
                continue
            if end_dt and appt_date_dt and appt_date_dt > end_dt:
                continue

            searchable_text = f"{appt.title} {appt.appointment_type or ''} {appt.provider_name or ''} {appt.location or ''} {appt.notes or ''}"
            score = calculate_relevance(
                query=query_str,
                title=appt.title,
                text_content=searchable_text,
                target_analytes=[],
                is_verified=True,
            )

            if score > 0 or any(t in searchable_text.lower() for t in tokens):
                snippet_text = f"{appt.title} with {appt.provider_name or 'Provider'} at {appt.location or 'Scheduled location'}"
                if appt.notes:
                    snippet_text += f" | Notes: {appt.notes}"
                date_str = appt.scheduled_at.strftime("%Y-%m-%d %H:%M") if appt.scheduled_at else None
                results.append(
                    SearchResultItem(
                        id=f"appt_{appt.id}",
                        result_type="appointment",
                        record_id=str(appt.id),
                        title=appt.title,
                        snippet=extract_snippet(snippet_text, query_str),
                        source_document_id=str(appt.source_document_id) if appt.source_document_id else None,
                        source_document_title=appt.source_document.filename if appt.source_document else None,
                        page_number=1 if appt.source_document_id else None,
                        date=date_str,
                        date_provenance="explicit" if appt.scheduled_at else "unknown",
                        is_verified=True,
                        verification_status="reviewed",
                        relevance_score=max(score, 10.0),
                        frontend_destination="care",
                    )
                )

    # -------------------------------------------------------------------------
    # 5. Follow-Up Tasks Search
    # -------------------------------------------------------------------------
    if include_all or source_type == "follow_up":
        tasks_q = db.query(FollowUpTask).filter(FollowUpTask.user_id == user.id)
        tasks = tasks_q.all()

        for task in tasks:
            task_date_dt = parse_date_safely(task.due_at) or parse_date_safely(task.created_at)
            if start_dt and task_date_dt and task_date_dt < start_dt:
                continue
            if end_dt and task_date_dt and task_date_dt > end_dt:
                continue

            searchable_text = f"{task.title} {task.description or ''} {task.status} {task.priority}"
            score = calculate_relevance(
                query=query_str,
                title=task.title,
                text_content=searchable_text,
                target_analytes=[],
                is_verified=True,
            )

            if score > 0 or any(t in searchable_text.lower() for t in tokens):
                snippet_text = f"[{task.priority.upper()}] {task.title}"
                if task.description:
                    snippet_text += f": {task.description}"
                date_str = task.due_at.strftime("%Y-%m-%d") if task.due_at else (task.created_at.strftime("%Y-%m-%d") if task.created_at else None)
                results.append(
                    SearchResultItem(
                        id=f"task_{task.id}",
                        result_type="follow_up",
                        record_id=str(task.id),
                        title=task.title,
                        snippet=extract_snippet(snippet_text, query_str),
                        source_document_id=str(task.source_document_id) if task.source_document_id else None,
                        source_document_title=task.source_document.filename if task.source_document else None,
                        page_number=1 if task.source_document_id else None,
                        date=date_str,
                        date_provenance="explicit" if task.due_at else "inferred",
                        is_verified=True,
                        verification_status="reviewed",
                        relevance_score=max(score, 10.0),
                        frontend_destination="care",
                    )
                )

    # -------------------------------------------------------------------------
    # Sorting & Stable Ordering
    # -------------------------------------------------------------------------
    def parse_item_sort_date(item: SearchResultItem) -> datetime:
        dt = parse_date_safely(item.date)
        return dt if dt else datetime.min.replace(tzinfo=timezone.utc)

    if request.sort_by == "date":
        # Sort by date desc, then relevance score desc
        results.sort(key=lambda x: (parse_item_sort_date(x), x.relevance_score), reverse=True)
    else:
        # Default: relevance score desc, then date desc
        results.sort(key=lambda x: (x.relevance_score, parse_item_sort_date(x)), reverse=True)

    total_results = len(results)
    start_idx = (request.page - 1) * request.page_size
    end_idx = start_idx + request.page_size
    paged_results = results[start_idx:end_idx]

    return SearchResponse(
        query=query_str,
        parsed_intent=intent_info["intent_desc"],
        total_results=total_results,
        page=request.page,
        page_size=request.page_size,
        results=paged_results,
    )
