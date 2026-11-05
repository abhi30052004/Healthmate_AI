"""Secure medical evidence retrieval service.

Extracts evidence strictly from the authenticated user's documents and clinical
observations. Implements hybrid keyword and semantic/full-text matching, assigns
stable citation identifiers ([S1], [S2]...), guarantees source traceability, and
preserves verification status and date provenance.
"""

from datetime import datetime
import re
from typing import Any
import uuid

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.document import Document, DocumentObservation
from app.models.user import User
from app.schemas.chat import CitationItem
from app.services.normalization import TEST_MAPPINGS, are_units_compatible


def extract_search_tokens(query: str) -> list[str]:
    """Extract clinical tokens and keywords from user query, excluding common stop words."""
    stop_words = {
        "what", "is", "my", "the", "a", "an", "in", "on", "of", "and", "or",
        "to", "from", "for", "with", "does", "do", "how", "has", "have",
        "tell", "me", "about", "show", "give", "can", "you", "which", "across",
        "between", "result", "results", "test", "tests", "report", "reports",
        "mean", "meaning", "according", "printed", "latest", "previous", "first"
    }
    raw_tokens = re.findall(r"[a-zA-Z0-9\-\+]+", query.lower())
    return [t for t in raw_tokens if len(t) > 1 and t not in stop_words]


def identify_target_analytes(query: str) -> list[str]:
    """Identify canonical analyte names mentioned or implied in query."""
    analytes = []
    q_clean = query.lower()

    # Check mappings in normalization service
    for pattern, canonical_name, _ in TEST_MAPPINGS:
        if pattern.search(q_clean):
            if canonical_name not in analytes:
                analytes.append(canonical_name)

    # General clinical keyword fallbacks
    keyword_map = {
        "glucose": "Fasting Glucose",
        "sugar": "Fasting Glucose",
        "hba1c": "HbA1c",
        "a1c": "HbA1c",
        "hemoglobin": "Hemoglobin",
        "hb": "Hemoglobin",
        "cholesterol": "Total Cholesterol",
        "lipid": "Total Cholesterol",
        "triglycerides": "Triglycerides",
        "platelet": "Platelets",
        "wbc": "WBC",
        "rbc": "RBC",
        "tsh": "TSH",
        "creatinine": "Creatinine",
    }
    for kw, canon in keyword_map.items():
        if kw in q_clean and canon not in analytes:
            analytes.append(canon)

    return analytes


def retrieve_medical_evidence(
    db: Session,
    user: User,
    query: str,
    include_unverified: bool = False,
    max_items: int = 15,
    profile_id: uuid.UUID | None = None,
    include_archived: bool = False,
) -> tuple[list[CitationItem], dict[str, Any]]:
    """Retrieve bounded, ranked, and traceable medical evidence from user's records.

    Enforces strict tenant isolation and profile scoping: only authorized documents
    and observations belonging to `user` and `profile_id` are queried.
    """
    target_analytes = identify_target_analytes(query)
    search_tokens = extract_search_tokens(query)
    q_lower = query.lower()

    # -------------------------------------------------------------------------
    # 1. Retrieve Candidate Observations
    # -------------------------------------------------------------------------
    obs_query = (
        db.query(DocumentObservation, Document)
        .join(Document, DocumentObservation.document_id == Document.id)
        .filter(Document.owner_id == user.id)
    )

    if not include_archived:
        obs_query = obs_query.filter(
            Document.is_archived.is_(False),
            DocumentObservation.is_archived.is_(False),
        )

    if profile_id is not None:
        from app.services.family_profile import verify_profile_access
        prof = verify_profile_access(db, user, profile_id)
        if prof and prof.is_primary:
            obs_query = obs_query.filter((Document.profile_id == profile_id) | (Document.profile_id.is_(None)))
        else:
            obs_query = obs_query.filter(Document.profile_id == profile_id)

    if not include_unverified:
        obs_query = obs_query.filter(DocumentObservation.is_reviewed.is_(True))

    all_obs_records = obs_query.all()

    scored_evidence: list[tuple[float, CitationItem]] = []

    for obs, doc in all_obs_records:
        score = 0.0
        obs_test = (obs.test_name or "").lower()
        norm_test = (obs.normalized_test_name or "").lower()
        cat = (obs.category or "").lower()
        src_text = (obs.source_text or "").lower()

        # Score matching on target analytes
        matched_target = False
        for target in target_analytes:
            t_lower = target.lower()
            if t_lower in norm_test or t_lower in obs_test:
                score += 60.0
                matched_target = True
                break

        # Score general search tokens
        token_matches = 0
        for token in search_tokens:
            if token in obs_test or token in norm_test:
                score += 25.0
                token_matches += 1
            elif token in cat or token in src_text:
                score += 15.0
                token_matches += 1

        # If query asks for "latest", "blood test", "summary", or all tests
        if any(w in q_lower for w in ["latest", "recent", "blood test", "summary", "overview", "all", "report", "panel"]):
            score += 10.0

        # Verified observations boosted over unverified
        if obs.is_reviewed:
            score += 15.0

        # Clinical date recency boost (newer dates receive modest boost)
        clinical_date = doc.document_date
        date_type = "actual"
        if not clinical_date and doc.created_at:
            clinical_date = doc.created_at.strftime("%Y-%m-%d")
            date_type = "inferred"

        if clinical_date:
            try:
                # Add recency points based on year
                year = int(clinical_date.split("-")[0])
                score += max(0.0, min(10.0, (year - 2020) * 2.0))
            except Exception:
                pass

        if score > 0.0 or not search_tokens:
            item = CitationItem(
                citation_id="",  # assigned after ranking
                document_id=str(doc.id),
                document_title=doc.filename,
                observation_id=str(obs.id),
                original_test_name=obs.test_name,
                normalized_test_name=obs.normalized_test_name,
                value=obs.value,
                unit=obs.unit,
                reference_range=obs.reference_range,
                abnormal_flag=obs.flag,
                clinical_date=clinical_date,
                date_type=date_type,
                page_number=obs.source_page if obs.source_page and obs.source_page > 0 else 1,
                source_text=obs.source_text,
                is_reviewed=obs.is_reviewed,
                relevance_score=round(score, 2),
            )
            scored_evidence.append((score, item))

    # -------------------------------------------------------------------------
    # 2. Retrieve Candidate Document Text Chunks
    # -------------------------------------------------------------------------
    user_docs_query = (
        db.query(Document)
        .filter(Document.owner_id == user.id, Document.processing_status == "extracted")
    )
    if not include_archived:
        user_docs_query = user_docs_query.filter(Document.is_archived.is_(False))

    if profile_id is not None:
        from app.services.family_profile import verify_profile_access
        prof = verify_profile_access(db, user, profile_id)
        if prof and prof.is_primary:
            user_docs_query = user_docs_query.filter((Document.profile_id == profile_id) | (Document.profile_id.is_(None)))
        else:
            user_docs_query = user_docs_query.filter(Document.profile_id == profile_id)

    user_docs = user_docs_query.all()

    for doc in user_docs:
        if not doc.extracted_text:
            continue

        doc_score = 0.0
        doc_text_lower = doc.extracted_text.lower()
        doc_filename_lower = doc.filename.lower()

        # Check for matching analytes or tokens in raw text
        matched_tokens = [t for t in search_tokens if t in doc_text_lower or t in doc_filename_lower]
        matched_analytes = [a for a in target_analytes if a.lower() in doc_text_lower]

        if matched_analytes:
            doc_score += 35.0 * len(matched_analytes)
        if matched_tokens:
            doc_score += 15.0 * len(matched_tokens)

        # If user asks about specific documents or reports
        if any(w in q_lower for w in ["which report", "which document", "where is", "mention", "printed"]):
            doc_score += 20.0

        if doc_score > 25.0:
            # Extract relevant snippet
            best_snippet = ""
            best_page = 1
            pages = doc.extracted_text.split("--- Page ")
            for p in pages:
                if not p.strip():
                    continue
                p_lower = p.lower()
                if any(t in p_lower for t in matched_tokens) or any(a.lower() in p_lower for a in matched_analytes):
                    # Extract page number if formatted
                    page_num_match = re.match(r"^(\d+)\s*---", p)
                    if page_num_match:
                        best_page = int(page_num_match.group(1))

                    lines = [ln.strip() for ln in p.splitlines() if ln.strip()]
                    matching_lines = [
                        ln for ln in lines
                        if any(t in ln.lower() for t in matched_tokens) or any(a.lower() in ln.lower() for a in matched_analytes)
                    ]
                    if matching_lines:
                        best_snippet = " ... ".join(matching_lines[:3])
                        break

            if not best_snippet:
                best_snippet = doc.extracted_text[:200]

            clinical_date = doc.document_date
            date_type = "actual"
            if not clinical_date and doc.created_at:
                clinical_date = doc.created_at.strftime("%Y-%m-%d")
                date_type = "inferred"

            text_item = CitationItem(
                citation_id="",
                document_id=str(doc.id),
                document_title=doc.filename,
                observation_id=None,
                original_test_name=None,
                normalized_test_name=None,
                value=None,
                unit=None,
                reference_range=None,
                abnormal_flag=None,
                clinical_date=clinical_date,
                date_type=date_type,
                page_number=best_page,
                source_text=best_snippet,
                is_reviewed=doc.is_verified,
                relevance_score=round(doc_score, 2),
            )
            scored_evidence.append((doc_score, text_item))

    # -------------------------------------------------------------------------
    # 3. Sort, Deduplicate, and Assign Citations
    # -------------------------------------------------------------------------
    # Sort descending by relevance score, then by clinical date
    scored_evidence.sort(
        key=lambda pair: (pair[0], pair[1].clinical_date or ""),
        reverse=True,
    )

    # Deduplicate near-identical items
    seen_keys: set[str] = set()
    final_evidence: list[CitationItem] = []

    for _, item in scored_evidence:
        # Key based on document + observation or text
        key = f"{item.document_id}:{item.normalized_test_name}:{item.value}:{item.clinical_date}"
        if key in seen_keys:
            continue
        seen_keys.add(key)
        final_evidence.append(item)

        if len(final_evidence) >= max_items:
            break

    # Assign stable citation labels: [S1], [S2], [S3], ...
    for idx, item in enumerate(final_evidence, start=1):
        item.citation_id = f"[S{idx}]"

    metadata = {
        "total_candidates_found": len(scored_evidence),
        "returned_evidence_count": len(final_evidence),
        "target_analytes": target_analytes,
        "include_unverified": include_unverified,
    }

    return final_evidence, metadata
