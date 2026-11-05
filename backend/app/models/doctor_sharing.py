"""Database models for Feature 4: Secure Doctor Sharing."""

import uuid
from datetime import datetime
from typing import Any, Dict, List

from sqlalchemy import DateTime, ForeignKey, Index, Integer, JSON, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class DoctorSharingSession(Base):
    __tablename__ = "doctor_sharing_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    owner_id: Mapped[uuid.UUID] = mapped_column(
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

    doctor_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    doctor_email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # Cryptographic SHA-256 hex digest of the raw bearer access token
    # Raw token is NEVER stored in database or exposed in logs/listings
    token_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
        nullable=False,
    )

    # Status: 'active', 'expired', 'revoked'
    status: Mapped[str] = mapped_column(
        String(20),
        server_default="active",
        nullable=False,
    )

    # Explicit expiration timestamp (enforced maximum e.g. 30 days)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        index=True,
        nullable=False,
    )

    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    last_accessed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    access_count: Mapped[int] = mapped_column(
        Integer,
        server_default="0",
        nullable=False,
    )

    # Explicitly selected resources dictionary:
    # {
    #   "document_ids": ["uuid-1", "uuid-2"],
    #   "include_visit_pack": bool,
    #   "visit_pack_categories": ["documents", "observations", "medications", "appointments"],
    #   "include_medications": bool,
    #   "include_appointments": bool
    # }
    shared_resources: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
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

    # Relationships
    owner = relationship("User", back_populates="doctor_sharing_sessions")
    profile = relationship("FamilyProfile", backref="doctor_sharing_sessions")
    audit_logs = relationship(
        "DoctorSharingAuditLog",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="DoctorSharingAuditLog.created_at.desc()",
    )

    __table_args__ = (
        Index("ix_doctor_sharing_owner_status", "owner_id", "status"),
        Index("ix_doctor_sharing_profile_status", "profile_id", "status"),
    )


class DoctorSharingAuditLog(Base):
    __tablename__ = "doctor_sharing_audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("doctor_sharing_sessions.id", ondelete="CASCADE"),
        index=True,

        nullable=False,
    )

    # Event types: 'created', 'viewed_summary', 'downloaded_document',
    # 'downloaded_visit_pack', 'revoked', 'access_denied_expired', 'access_denied_revoked'
    event_type: Mapped[str] = mapped_column(
        
        String(50),
        nullable=False,
    )

    # Resource identifier if applicable (e.g. document UUID)
    resource_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    ip_address: Mapped[str | None] = mapped_column(
        String(45),
        nullable=True,
    )

    user_agent: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # Safe summary details (NEVER sensitive medical data or secrets)
    details: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    session = relationship("DoctorSharingSession", back_populates="audit_logs")
