"""Database models for Feature 5: Duplicate Detection & Data Quality Center."""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class DuplicateCandidate(Base):
    __tablename__ = "duplicate_candidates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("family_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    # 'document' or 'observation'
    record_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
    )

    primary_record_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    secondary_record_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    # Confidence score from 0.0 to 1.0 (e.g. 1.0 for exact hash match)
    confidence_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    # Structured match reasons:
    # [
    #   {"code": "EXACT_HASH", "description": "Identical SHA-256 cryptographic file checksum"},
    #   {"code": "SIMILAR_FILENAME", "description": "Normalized filename similarity is 95%"}
    # ]
    match_reasons: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    # 'pending', 'confirmed_duplicate', 'not_duplicate', 'resolved'
    status: Mapped[str] = mapped_column(
        String(30),
        server_default="pending",
        nullable=False,
        index=True,
    )

    # User's explicit choice for which record to retain
    retained_record_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )

    # The record archived upon resolution
    archived_record_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )

    # Resolution action summary, e.g. 'retained_primary', 'retained_secondary', 'dismissed_false_positive'
    resolution_action: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    decision_notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", back_populates="duplicate_candidates")
    profile = relationship("FamilyProfile", backref="duplicate_candidates")

    __table_args__ = (
        Index("ix_dup_user_profile_type_status", "user_id", "profile_id", "record_type", "status"),
        UniqueConstraint("user_id", "record_type", "primary_record_id", "secondary_record_id", name="uq_dup_pair"),
    )


class DataQualityAuditLog(Base):
    __tablename__ = "data_quality_audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    candidate_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("duplicate_candidates.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # 'scan_completed', 'confirmed_duplicate', 'marked_not_duplicate', 'resolved_duplicate'
    action: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    # 'document' or 'observation' or 'system'
    record_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    retained_record_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )

    archived_record_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )

    # Non-sensitive decision summary & reasons
    details: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user = relationship("User", back_populates="data_quality_audit_logs")
    candidate = relationship("DuplicateCandidate")
