"""API routes for Quick Reference AI Assistant (F-37, QUICK_REFERENCE_AI.md).

Endpoints:
- POST /quick-reference/query
- GET /quick-reference/suggestions
- GET /quick-reference/sources
- POST /profiles/{profile_id}/quick-reference/records
- GET /me/ai-usage
"""

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.data.medical_reference_catalog import CURATED_CATALOGUE
from app.models.user import User
from app.schemas.quick_reference import (
    AiUsageResponse,
    CuratedSourcesResponse,
    ProfileQuickReferenceRequest,
    QuickReferenceQueryRequest,
    QuickReferenceResponse,
    SuggestionMode,
    SuggestionsResponse,
)
from app.services.ai_quota import get_user_ai_usage
from app.services.quick_reference import (
    handle_general_quick_reference,
    handle_profile_quick_reference,
)

logger = logging.getLogger("healthmate.api.quick_reference")

router = APIRouter(tags=["Quick Reference AI"])


@router.post(
    "/quick-reference/query",
    response_model=QuickReferenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Query general medical reference catalogue or explain a term/test",
)
async def quick_reference_general_query(
    payload: QuickReferenceQueryRequest,
    current_user: User = Depends(get_current_user),
) -> QuickReferenceResponse:
    """Execute general medical reference query across curated knowledge sources."""
    try:
        return await handle_general_quick_reference(request=payload, user=current_user)
    except Exception as exc:
        logger.exception("General quick reference query failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving clinical reference: {str(exc)}",
        )


@router.get(
    "/quick-reference/suggestions",
    response_model=SuggestionsResponse,
    status_code=status.HTTP_200_OK,
    summary="List safe example prompts and operational modes",
)
def get_quick_reference_suggestions() -> SuggestionsResponse:
    """Return categorized suggestions and example prompts for the assistant modes."""
    suggestions = [
        SuggestionMode(
            mode="medical_term",
            title="Explain a Medical Term",
            description="Plain-language definition, context and caveats",
            example_prompts=[
                "What is HbA1c?",
                "What does Creatinine measure?",
                "Explain what Dyslipidemia means",
                "What is TSH in blood tests?",
                "What does Hematocrit represent?",
            ],
        ),
        SuggestionMode(
            mode="understand_test",
            title="Understand a Test",
            description="What it measures, why it may be ordered, and units",
            example_prompts=[
                "What is a Complete Blood Count (CBC)?",
                "Why would a doctor order a Lipid Panel?",
                "What is the difference between Fasting Glucose and Random Glucose?",
                "What does a Comprehensive Metabolic Panel test?",
                "What does a Thyroid Function Panel check?",
            ],
        ),
        SuggestionMode(
            mode="explain_report",
            title="Explain My Report",
            description="Summary of what your report states with exact values and citations",
            example_prompts=[
                "Summarize the key values in my latest blood report",
                "Explain the findings and reference ranges in my metabolic panel",
                "What observations were marked outside reference bounds?",
            ],
        ),
        SuggestionMode(
            mode="find_records",
            title="Find in My Records",
            description="Find exact matching record facts in your verified health history",
            example_prompts=[
                "What was my latest hemoglobin result?",
                "Show all records where cholesterol was recorded",
                "When was my last glucose test?",
                "Did my recent reports include vitamin D levels?",
            ],
        ),
        SuggestionMode(
            mode="prepare_doctor_questions",
            title="Prepare Doctor Questions",
            description="Neutral questions to discuss with your clinician",
            example_prompts=[
                "What questions should I ask my doctor about my elevated glucose?",
                "Prepare questions about my recent lipid panel results",
                "What should I discuss at my upcoming annual review?",
            ],
        ),
        SuggestionMode(
            mode="general_reference",
            title="General Health Reference",
            description="Concise educational health reference with cited public sources",
            example_prompts=[
                "What are normal resting blood pressure ranges?",
                "What is the difference between LDL and HDL cholesterol?",
                "How does hemoglobin carry oxygen in the blood?",
            ],
        ),
    ]
    return SuggestionsResponse(suggestions=suggestions)


@router.get(
    "/quick-reference/sources",
    response_model=CuratedSourcesResponse,
    status_code=status.HTTP_200_OK,
    summary="List available curated reference catalogue metadata",
)
def get_quick_reference_sources() -> CuratedSourcesResponse:
    """Return catalogued sources, publishers, and canonical reference links."""
    sources = [s.to_dict() for s in CURATED_CATALOGUE]
    return CuratedSourcesResponse(count=len(sources), sources=sources)


@router.post(
    "/profiles/{profile_id}/quick-reference/records",
    response_model=QuickReferenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Query verified records within the authorized family profile",
)
async def quick_reference_profile_records(
    profile_id: str = Path(..., description="Family profile ID"),
    payload: ProfileQuickReferenceRequest = ...,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> QuickReferenceResponse:
    """Query verified personal records for the active authorized profile."""
    try:
        return await handle_profile_quick_reference(
            db=db,
            profile_id=profile_id,
            query_text=payload.question,
            mode=payload.mode,
            record_ids=payload.record_ids,
            include_archived=payload.include_archived,
            response_style=payload.response_style,
            user=current_user,
        )
    except PermissionError as perm_err:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(perm_err),
        )
    except Exception as exc:
        logger.exception("Profile quick reference failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while processing profile records: {str(exc)}",
        )


@router.get(
    "/me/ai-usage",
    response_model=AiUsageResponse,
    status_code=status.HTTP_200_OK,
    summary="Get remaining daily AI usage quota for the authenticated user",
)
def get_my_ai_usage(
    current_user: User = Depends(get_current_user),
) -> AiUsageResponse:
    """Return user's remaining and consumed AI quotas for today."""
    usage = get_user_ai_usage(str(current_user.id))
    return AiUsageResponse(**usage)

