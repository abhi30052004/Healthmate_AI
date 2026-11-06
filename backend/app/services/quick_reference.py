"""Quick Reference AI Assistant Core Service.

Implements the six user modes, deterministic-first retrieval orchestration,
strict clinical safety boundaries, prompt-injection defenses, exact numerical
preservation, and privacy-safe quota accounting.
"""

from datetime import datetime, timezone
import logging
import os
import re
import uuid
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.data.medical_reference_catalog import (
    CURATED_CATALOGUE,
    CuratedReferenceSource,
    search_curated_reference,
)
from app.models.document import Document, DocumentObservation
from app.models.family_profile import FamilyProfile
from app.models.user import User
from app.schemas.quick_reference import (
    GenerationMetadata,
    QuickReferenceQueryRequest,
    QuickReferenceResponse,
    RecordCitationItem,
    SourceItem,
)
from app.services.ai_quota import check_and_increment_quota, get_user_ai_usage
from app.services.llm import complete as llm_complete, llm_provider_name, resolve_llm_target
from app.services.quick_reference_cache import (
    compute_general_cache_key,
    compute_profile_cache_key,
    get_cached_response,
    set_cached_response,
)

logger = logging.getLogger("healthmate.quick_reference")

MANDATORY_LIMITATION = (
    "This information helps explain health records and general medical terms. "
    "It does not diagnose or prescribe. Discuss decisions with your doctor."
)

EMERGENCY_KEYWORDS = [
    "chest pain",
    "heart attack",
    "can't breathe",
    "cannot breathe",
    "shortness of breath",
    "difficulty breathing",
    "stroke",
    "slurred speech",
    "facial droop",
    "severe allergic",
    "anaphylaxis",
    "overdose",
    "bleeding heavily",
    "unconscious",
    "suicide",
    "emergency room",
    "call 911",
    "call 112",
]

EMERGENCY_ADVISORY = (
    "EMERGENCY ADVISORY: If you or someone you are caring for is experiencing severe, "
    "life-threatening symptoms—such as acute chest pain, sudden difficulty breathing, "
    "signs of stroke, severe bleeding, or sudden loss of consciousness—call your local "
    "emergency services (such as 911 or 112) or proceed to the nearest emergency department immediately. "
    "HealthMate AI is an educational information resource and cannot provide emergency triage or acute clinical care."
)


def is_emergency_query(text: str) -> bool:
    """Check if query contains emergency or acute distress language."""
    clean = text.lower()
    return any(k in clean for k in EMERGENCY_KEYWORDS)


def is_prompt_injection(text: str) -> bool:
    """Detect common adversarial prompt injection attacks."""
    clean = text.lower()
    suspicious = [
        "ignore previous instructions",
        "override system prompt",
        "system prompt",
        "developer message",
        "jailbreak",
        "disregard safety guidelines",
        "reveal secrets",
        "tell me other users",
    ]
    return any(p in clean for p in suspicious)


def get_profile_data_version(db: Session, profile_id: uuid.UUID) -> str:
    """Compute a data version token for profile observations to govern cache invalidation."""
    try:
        latest_obs = (
            db.query(DocumentObservation.updated_at)
            .join(Document, DocumentObservation.document_id == Document.id)
            .filter(Document.profile_id == profile_id)
            .order_by(DocumentObservation.updated_at.desc())
            .first()
        )
        if latest_obs and latest_obs[0]:
            return latest_obs[0].isoformat()
    except Exception:
        pass
    return "v0"


def format_source_item(ref: CuratedReferenceSource) -> SourceItem:
    return SourceItem(
        id=ref.id,
        title=ref.term,
        publisher=ref.publisher,
        url=ref.canonical_url,
        published_at=ref.published_at,
        retrieved_at=ref.retrieved_at,
        license_or_reuse_note=ref.license_or_reuse_note,
    )


def sanitize_generated_answer(answer: str, ground_values: list[str]) -> str:
    """Sanitize AI answer to ensure strict adherence to clinical safety boundaries."""
    # Strip prohibited diagnostic claims
    prohibited_patterns = [
        r"\byou have (diabetes|cancer|hypertension|anemia|disease|infection)\b",
        r"\bi diagnose\b",
        r"\byou should take\b",
        r"\bstop taking\b",
        r"\bincrease your dose\b",
        r"\bdecrease your dose\b",
    ]
    sanitized = answer
    for pattern in prohibited_patterns:
        sanitized = re.sub(pattern, "[discuss this finding with your clinician]", sanitized, flags=re.IGNORECASE)

    return sanitized


async def maybe_simplify_with_llm(
    prompt: str,
    system_instruction: str,
    user_id: str,
) -> tuple[str | None, bool]:
    """Optionally simplify an explanation with the configured LLM (Groq/OpenAI)."""
    if resolve_llm_target() is None:
        return None, False

    # Check and debit quota
    if not check_and_increment_quota(user_id, "quick_reference"):
        logger.info("AI Quick Reference daily quota exhausted for user %s", user_id)
        return None, False

    text = await llm_complete(system_instruction, prompt, temperature=0.1)
    if not text:
        return None, False
    return text, True


async def handle_general_quick_reference(
    request: QuickReferenceQueryRequest,
    user: User,
) -> QuickReferenceResponse:
    """Handle modes: medical_term, understand_test, and general_reference."""
    req_id = f"qr_{uuid.uuid4().hex[:10]}"
    query_text = request.term or request.question

    # 1. Emergency Safety Check
    if is_emergency_query(query_text):
        return QuickReferenceResponse(
            mode=request.mode,
            scope="general_reference",
            answer=EMERGENCY_ADVISORY,
            expanded_answer=None,
            sources=[],
            record_citations=[],
            limitations=[MANDATORY_LIMITATION],
            generation=GenerationMetadata(used=False, provider="safety_guard", cached=False),
            status="emergency_redirect",
            request_id=req_id,
        )

    # 2. Prompt Injection Defense
    if is_prompt_injection(query_text):
        return QuickReferenceResponse(
            mode=request.mode,
            scope="general_reference",
            answer=(
                "HealthMate AI operates strictly within clinical safety guidelines. "
                "I cannot override security rules or alter medical reference boundaries. "
                "How can I help you understand a medical term or laboratory test?"
            ),
            expanded_answer=None,
            sources=[],
            record_citations=[],
            limitations=[MANDATORY_LIMITATION],
            generation=GenerationMetadata(used=False, provider="safety_guard", cached=False),
            status="grounded",
            request_id=req_id,
        )

    # 3. Cache Lookup
    cache_key = compute_general_cache_key(request.mode, query_text, request.response_style)
    cached = get_cached_response(cache_key)
    if cached:
        cached["generation"]["cached"] = True
        cached["request_id"] = req_id
        return QuickReferenceResponse(**cached)

    # 4. Search Curated Reference Catalogue
    matches = search_curated_reference(query_text, limit=3)
    if not matches:
        # Fallback when term is outside catalogue
        ans = (
            f"No verified curated reference entry was found matching '{query_text}'. "
            "HealthMate AI references only source-attributed, verified medical reference catalogues "
            "to prevent medical hallucinations. Please consult your physician or laboratory for specific terminology."
        )
        return QuickReferenceResponse(
            mode=request.mode,
            scope="general_reference",
            answer=ans,
            expanded_answer=None,
            sources=[],
            record_citations=[],
            limitations=[MANDATORY_LIMITATION],
            generation=GenerationMetadata(used=False, provider="curated_catalogue", cached=False),
            status="no_evidence_found",
            request_id=req_id,
        )

    top_ref = matches[0]
    sources = [format_source_item(m) for m in matches]

    # Mode-specific deterministic answers
    if request.mode == "medical_term":
        concise_ans = f"**{top_ref.term}**: {top_ref.definition}"
        expanded_ans = (
            f"**Definition**: {top_ref.definition}\n\n"
            f"**What It Measures**: {top_ref.what_it_measures}\n\n"
            f"**Typical Units**: {', '.join(top_ref.typical_units)}\n\n"
            f"**Clinical Reference Note**: {top_ref.reference_note}"
        )
    elif request.mode == "understand_test":
        concise_ans = (
            f"**{top_ref.term}** measures {top_ref.what_it_measures.lower()} "
            f"It is commonly ordered because {top_ref.why_ordered.lower()}"
        )
        expanded_ans = (
            f"**Test Purpose**: {top_ref.what_it_measures}\n\n"
            f"**Why Doctors Order It**: {top_ref.why_ordered}\n\n"
            f"**Typical Units**: {', '.join(top_ref.typical_units)}\n\n"
            f"**Reference Guidance**: {top_ref.reference_note}"
        )
    else:  # general_reference
        concise_ans = (
            f"According to {top_ref.publisher}, **{top_ref.term}** refers to: {top_ref.definition} "
            f"{top_ref.reference_note}"
        )
        expanded_ans = (
            f"### {top_ref.term}\n\n"
            f"{top_ref.definition}\n\n"
            f"**Details**: {top_ref.what_it_measures}\n\n"
            f"**Context**: {top_ref.reference_note}"
        )

    chosen_answer = expanded_ans if request.response_style == "expanded" else concise_ans
    gen_used = False
    provider_name = "curated_catalogue"

    # 5. Optional OpenAI Simplification
    system_inst = (
        "You are HealthMate AI's Quick Reference Assistant. "
        "Explain the provided medical information in plain, accessible language for patients. "
        "STRICT RULES:\n"
        "1. Never diagnose, prescribe, or recommend changing any treatment.\n"
        "2. Do not state whether a value is dangerous or urgent.\n"
        "3. Preserve all stated facts, units, and nuances without inventing data.\n"
        "4. Keep the answer concise and clear."
    )
    prompt_text = (
        f"User asked: {query_text}\n"
        f"Mode: {request.mode}\n"
        f"Curated Source Facts: {chosen_answer}\n"
        "Provide a clear, respectful, plain-language patient summary:"
    )

    simplified, did_generate = await maybe_simplify_with_llm(
        prompt=prompt_text,
        system_instruction=system_inst,
        user_id=str(user.id),
    )
    if did_generate and simplified:
        chosen_answer = sanitize_generated_answer(simplified, [])
        gen_used = True
        provider_name = llm_provider_name() or "llm"

    resp = QuickReferenceResponse(
        mode=request.mode,
        scope="general_reference",
        answer=chosen_answer,
        expanded_answer=expanded_ans if request.response_style == "concise" else None,
        sources=sources,
        record_citations=[],
        limitations=[MANDATORY_LIMITATION],
        generation=GenerationMetadata(used=gen_used, provider=provider_name, cached=False),
        status="grounded",
        request_id=req_id,
        questions_to_ask=top_ref.questions_to_ask,
    )

    # Cache response
    set_cached_response(cache_key, resp.model_dump(), ttl_seconds=3600)
    return resp


async def handle_profile_quick_reference(
    db: Session,
    profile_id: str,
    query_text: str,
    mode: str,
    record_ids: list[str],
    include_archived: bool,
    response_style: str,
    user: User,
) -> QuickReferenceResponse:
    """Handle authenticated, profile-scoped modes: explain_report, find_records, prepare_doctor_questions."""
    req_id = f"qr_rec_{uuid.uuid4().hex[:10]}"

    # 1. Emergency Safety Check
    if is_emergency_query(query_text):
        return QuickReferenceResponse(
            mode=mode,
            scope="from_records",
            answer=EMERGENCY_ADVISORY,
            expanded_answer=None,
            sources=[],
            record_citations=[],
            limitations=[MANDATORY_LIMITATION],
            generation=GenerationMetadata(used=False, provider="safety_guard", cached=False),
            status="emergency_redirect",
            request_id=req_id,
        )

    # 2. Verify Profile Access
    try:
        prof_uuid = uuid.UUID(str(profile_id))
    except Exception:
        raise PermissionError("Access denied: Invalid profile ID format.")

    profile = db.query(FamilyProfile).filter(FamilyProfile.id == prof_uuid).first()
    if not profile or str(profile.owner_id) != str(user.id):
        raise PermissionError("Access denied: You do not have permission to view records for this profile.")

    # 3. Retrieve Profile Evidence
    data_version = get_profile_data_version(db, prof_uuid)
    cache_key = compute_profile_cache_key(
        mode=mode,
        query=query_text,
        profile_id=str(prof_uuid),
        data_version=data_version,
        style=response_style,
        record_ids=record_ids,
    )

    cached = get_cached_response(cache_key)
    if cached:
        cached["generation"]["cached"] = True
        cached["request_id"] = req_id
        return QuickReferenceResponse(**cached)

    # Build query for observations
    obs_query = (
        db.query(DocumentObservation)
        .join(Document, DocumentObservation.document_id == Document.id)
        .filter(Document.profile_id == prof_uuid)
    )

    # Default to verified observations only
    obs_query = obs_query.filter(DocumentObservation.is_reviewed.is_(True))

    if record_ids:
        # Convert string record_ids to uuid if needed
        rec_uuids = []
        for rid in record_ids:
            try:
                rec_uuids.append(uuid.UUID(str(rid)))
            except Exception:
                pass
        if rec_uuids:
            obs_query = obs_query.filter(DocumentObservation.document_id.in_(rec_uuids))

    obs_records = obs_query.order_by(DocumentObservation.created_at.desc()).all()

    # Map documents for titles and document date
    doc_ids = {o.document_id for o in obs_records if o.document_id}
    docs_map = {}
    if doc_ids:
        docs = db.query(Document).filter(Document.id.in_(list(doc_ids))).all()
        for d in docs:
            docs_map[str(d.id)] = {
                "filename": d.filename,
                "document_date": d.document_date,
            }

    # Build Citation Items
    citations: list[RecordCitationItem] = []
    ground_values: list[str] = []
    for idx, o in enumerate(obs_records[:10], start=1):
        doc_info = docs_map.get(str(o.document_id), {})
        doc_title = doc_info.get("filename", "Uploaded Report")
        clin_date = doc_info.get("document_date") or (o.created_at.strftime("%Y-%m-%d") if o.created_at else None)

        cit = RecordCitationItem(
            id=f"[S{idx}]",
            document_id=str(o.document_id),
            document_title=doc_title,
            page_number=o.source_page or 1,
            clinical_date=clin_date,
            test_name=o.normalized_test_name or o.test_name,
            value=o.value,
            unit=o.unit,
            reference_range=o.reference_range,
            abnormal_flag=o.flag,
            is_reviewed=o.is_reviewed,
        )
        citations.append(cit)
        if o.value:
            ground_values.append(str(o.value))

    # Process by mode
    if mode == "explain_report":
        if not citations:
            ans = (
                "No verified findings were found for the selected report in this profile. "
                "Please ensure the document has been reviewed and verified in the Health Records section."
            )
            return QuickReferenceResponse(
                mode=mode,
                scope="from_records",
                answer=ans,
                sources=[],
                record_citations=[],
                limitations=[MANDATORY_LIMITATION],
                generation=GenerationMetadata(used=False, provider="deterministic", cached=False),
                status="no_evidence_found",
                request_id=req_id,
            )

        report_title = citations[0].document_title
        report_date = citations[0].clinical_date or "recent"
        lines = [
            f"### Report Summary: {report_title} ({report_date})\n",
            "Based on your verified medical records, here are the documented findings:\n",
        ]
        for c in citations:
            flag_badge = f" **[{c.abnormal_flag}]**" if c.abnormal_flag and c.abnormal_flag != "NORMAL" else ""
            ref_str = f" (Reference range: {c.reference_range})" if c.reference_range else ""
            lines.append(f"• **{c.test_name}**: {c.value} {c.unit or ''}{ref_str}{flag_badge} {c.id}")

        lines.extend([
            "\n**Clinical Note**:",
            "Laboratory reference ranges are established by each specific facility. "
            "Slight deviations from standard reference intervals do not automatically constitute a medical condition. "
            "Please discuss these results directly with your physician.",
        ])
        ans_text = "\n".join(lines)

    elif mode == "find_records":
        q_tokens = [w for w in query_text.lower().replace("?", "").split() if len(w) > 2]
        matching_citations = [
            c for c in citations
            if any(t in (c.test_name or "").lower() for t in q_tokens)
        ]
        if not matching_citations:
            matching_citations = citations[:4]  # Return top recent if general

        if not matching_citations:
            ans = (
                f"No verified record matching '{query_text}' was found in this profile's history. "
                "HealthMate AI does not fabricate test values or extrapolate without records."
            )
            return QuickReferenceResponse(
                mode=mode,
                scope="from_records",
                answer=ans,
                sources=[],
                record_citations=[],
                limitations=[MANDATORY_LIMITATION],
                generation=GenerationMetadata(used=False, provider="deterministic", cached=False),
                status="no_evidence_found",
                request_id=req_id,
            )

        lines = [
            f"Here are the matching verified observations from your health records:\n"
        ]
        for c in matching_citations:
            date_str = f" on {c.clinical_date}" if c.clinical_date else ""
            flag_str = f" [{c.abnormal_flag}]" if c.abnormal_flag and c.abnormal_flag != "NORMAL" else ""
            lines.append(
                f"• **{c.test_name}**: {c.value} {c.unit or ''}{flag_str}{date_str} in *{c.document_title}* (p. {c.page_number}) {c.id}"
            )
        ans_text = "\n".join(lines)
        citations = matching_citations

    else:  # prepare_doctor_questions
        # Identify abnormal or key items
        abnormal_items = [c for c in citations if c.abnormal_flag and c.abnormal_flag in ("HIGH", "LOW", "ABNORMAL")]
        questions: list[str] = []

        if abnormal_items:
            for item in abnormal_items[:2]:
                questions.append(
                    f"My {item.test_name} was recorded as {item.value} {item.unit or ''} (reference range: {item.reference_range or 'N/A'}). What does this mean in the context of my overall health?"
                )
        questions.extend([
            "Are there any repeat lab tests or follow-up timelines you recommend based on these findings?",
            "Do any of my current daily medications or lifestyle habits influence these results?",
            "Are there specific target ranges we should aim for at my next review?",
        ])

        lines = [
            "Here are recommended neutral, clinical questions prepared for your next appointment:\n"
        ]
        for q_idx, q in enumerate(questions, start=1):
            lines.append(f"{q_idx}. {q}")

        lines.extend([
            "\n*Prepared from your verified records to assist in constructive doctor-patient communication.*"
        ])
        ans_text = "\n".join(lines)

    # 4. Optional OpenAI Rephrase
    gen_used = False
    provider_name = "profile_records"

    system_inst = (
        "You are HealthMate AI's Clinical Record Assistant. "
        "Summarize the patient's record findings respectfully and accurately. "
        "CRITICAL CONSTRAINTS:\n"
        "1. GROUNDING: Keep all numeric values, units, dates, and citations [S1], [S2] EXACT.\n"
        "2. SAFETY: Never state a diagnosis or tell the patient they have a condition.\n"
        "3. PROVENANCE: Keep all citation references matching the source list.\n"
    )
    prompt_text = (
        f"Mode: {mode}\n"
        f"User Query: {query_text}\n"
        f"Grounded Record Facts: {ans_text}\n\n"
        "Format a clear patient summary:"
    )

    simplified, did_generate = await maybe_simplify_with_llm(
        prompt=prompt_text,
        system_instruction=system_inst,
        user_id=str(user.id),
    )
    if did_generate and simplified:
        # Verify numeric preservation
        all_preserved = all(gv in simplified for gv in ground_values)
        if all_preserved:
            ans_text = sanitize_generated_answer(simplified, ground_values)
            gen_used = True
            provider_name = llm_provider_name() or "llm"

    resp = QuickReferenceResponse(
        mode=mode,
        scope="from_records",
        answer=ans_text,
        expanded_answer=None,
        sources=[],
        record_citations=citations,
        limitations=[MANDATORY_LIMITATION],
        generation=GenerationMetadata(used=gen_used, provider=provider_name, cached=False),
        status="grounded",
        request_id=req_id,
    )

    set_cached_response(cache_key, resp.model_dump(), ttl_seconds=900, profile_id=profile_id)
    return resp
