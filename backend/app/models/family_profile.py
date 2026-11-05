"""Database model for Family Health Profiles."""

import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship as orm_relationship

from app.db.base import Base


class FamilyProfile(Base):
    __tablename__ = "family_profiles"

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

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    relationship: Mapped[str] = mapped_column(
        String(50),
        nullable=False,  # self, spouse, child, parent, sibling, dependent, other
    )

    date_of_birth: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    gender: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,  # male, female, other, prefer_not_to_say
    )

    blood_type: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,  # A+, A-, B+, B-, AB+, AB-, O+, O-
    )

    emergency_contact_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    emergency_contact_phone: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    allergies_summary: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    avatar_color: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,  # Hex or CSS color identifier for profile avatar
    )

    is_primary: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    is_dependent: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    consent_status: Mapped[str] = mapped_column(
        String(50),
        default="authorized",
        nullable=False,  # authorized, pending_consent, revoked
    )

    consent_granted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    consent_notes: Mapped[str | None] = mapped_column(
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
    owner = orm_relationship("User", back_populates="family_profiles")
    documents = orm_relationship("Document", back_populates="family_profile")
    medications = orm_relationship("MedicationRecord", back_populates="family_profile")
    appointments = orm_relationship("AppointmentRecord", back_populates="family_profile")
    follow_up_tasks = orm_relationship("FollowUpTask", back_populates="family_profile")
    reminders = orm_relationship("Reminder", back_populates="family_profile")

    __table_args__ = (
        Index("ix_family_profiles_owner_active", "owner_id", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<FamilyProfile(id={self.id}, name='{self.name}', relationship='{self.relationship}', active={self.is_active})>"
