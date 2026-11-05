from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.chat import (
    MedicalChatAnswerResponse,
    MedicalChatConversationCreate,
    MedicalChatConversationDetail,
    MedicalChatConversationRead,
    MedicalChatMessageCreate,
    MedicalChatMessageRead,
)
from app.services.medical_chat import (
    create_conversation,
    delete_conversation,
    get_conversation_or_404,
    list_conversations,
    process_chat_message,
)

router = APIRouter(prefix="/medical-chat", tags=["Medical Chat & RAG"])


@router.post(
    "/conversations",
    response_model=MedicalChatConversationRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new medical chat conversation",
)
def create_new_conversation(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    payload: MedicalChatConversationCreate | None = None,
) -> MedicalChatConversationRead:
    """Create a new conversational context owned by the current authenticated user."""
    title = payload.title if payload else None
    conv = create_conversation(db, current_user, title=title)
    return MedicalChatConversationRead(
        id=conv.id,
        owner_id=conv.owner_id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        message_count=0,
    )


@router.get(
    "/conversations",
    response_model=list[MedicalChatConversationRead],
    status_code=status.HTTP_200_OK,
    summary="List all conversations owned by current user",
)
def get_user_conversations(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(50, ge=1, le=100),
) -> list[MedicalChatConversationRead]:
    """Retrieve all conversations for the authenticated user ordered by most recently updated."""
    convs = list_conversations(db, current_user, limit=limit)
    return [
        MedicalChatConversationRead(
            id=c.id,
            owner_id=c.owner_id,
            title=c.title,
            created_at=c.created_at,
            updated_at=c.updated_at,
            message_count=len(c.messages),
        )
        for c in convs
    ]


@router.get(
    "/conversations/{conversation_id}",
    response_model=MedicalChatConversationDetail,
    status_code=status.HTTP_200_OK,
    summary="Retrieve conversation history and messages",
)
def get_conversation_detail(
    conversation_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MedicalChatConversationDetail:
    """Retrieve single conversation with chronological messages and citations."""
    conv = get_conversation_or_404(db, current_user, conversation_id)
    messages_read = [
        MedicalChatMessageRead(
            id=m.id,
            conversation_id=m.conversation_id,
            role=m.role,
            content=m.content,
            citations=m.citations,
            created_at=m.created_at,
        )
        for m in conv.messages
    ]
    return MedicalChatConversationDetail(
        id=conv.id,
        owner_id=conv.owner_id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=messages_read,
    )


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MedicalChatAnswerResponse,
    status_code=status.HTTP_200_OK,
    summary="Send message and generate evidence-grounded medical answer",
)
async def send_chat_message(
    conversation_id: uuid.UUID,
    payload: MedicalChatMessageCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MedicalChatAnswerResponse:
    """Ask clinical question, retrieve user evidence, generate grounded answer, and persist."""
    assistant_msg, validated_citations, metadata = await process_chat_message(
        db=db,
        user=current_user,
        conversation_id=conversation_id,
        message_content=payload.message,
        include_unverified=payload.include_unverified,
        profile_id=payload.profile_id,
        include_archived=payload.include_archived,
    )
    return MedicalChatAnswerResponse(
        conversation_id=str(conversation_id),
        message_id=str(assistant_msg.id),
        answer=assistant_msg.content,
        citations=validated_citations,
        retrieval_metadata=metadata,
    )


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete conversation and all its messages",
)
def delete_user_conversation(
    conversation_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    """Delete a conversation, verifying that it belongs to the authenticated user."""
    delete_conversation(db, current_user, conversation_id)
