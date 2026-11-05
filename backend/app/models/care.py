import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MedicationRecord(Base):
    __tablename__ = "care_medications"

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

    profile_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("family_profiles.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    medication_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,  # Prescription, OTC, Supplement, etc.
    )

    strength: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,  # Preserve exact text, e.g. "500 mg", "10 mg/mL"
    )

    dosage_instructions: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,  # Exact user/extracted text
    )

    route: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,  # Oral, Sublingual, Topical, Inhalation, etc.
    )

    frequency: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,  # Twice daily, Once daily at bedtime, etc.
    )

    start_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    end_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    prescriber: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    pharmacy: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,  # Free-text user notes
    )

    source_document_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        default="active",
        nullable=False,  # active, paused, completed, archived
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

    user = relationship("User", back_populates="medications")
    family_profile = relationship("FamilyProfile", back_populates="medications")
    source_document = relationship("Document")

    def __repr__(self) -> str:
        return f"<MedicationRecord(id={self.id}, name='{self.name}', status='{self.status}')>"


class AppointmentRecord(Base):
    __tablename__ = "care_appointments"

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

    profile_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("family_profiles.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,  # e.g. "Annual Cardiology Review"
    )

    appointment_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,  # Consultation, Follow-up, Lab Work, Imaging, etc.
    )

    provider_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,  # e.g. "Dr. Emily Wong"
    )

    location: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,  # Clinic address or "Telehealth"
    )

    scheduled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    timezone: Mapped[str | None] = mapped_column(
        String(100),
        default="UTC",
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        default="scheduled",
        nullable=False,  # scheduled, completed, cancelled, rescheduled
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    source_document_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
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

    user = relationship("User", back_populates="appointments")
    family_profile = relationship("FamilyProfile", back_populates="appointments")
    source_document = relationship("Document")
    follow_up_tasks = relationship(
        "FollowUpTask",
        back_populates="appointment",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<AppointmentRecord(id={self.id}, title='{self.title}', scheduled_at={self.scheduled_at})>"


class FollowUpTask(Base):
    __tablename__ = "care_follow_up_tasks"

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

    profile_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("family_profiles.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,  # e.g. "Schedule fasting blood draw before follow-up"
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    due_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        default="pending",
        nullable=False,  # pending, completed, dismissed
    )

    priority: Mapped[str] = mapped_column(
        String(50),
        default="medium",
        nullable=False,  # low, medium, high (user-selected only)
    )

    source_document_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    appointment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("care_appointments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
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

    user = relationship("User", back_populates="follow_up_tasks")
    family_profile = relationship("FamilyProfile", back_populates="follow_up_tasks")
    source_document = relationship("Document")
    appointment = relationship("AppointmentRecord", back_populates="follow_up_tasks")

    def __repr__(self) -> str:
        return f"<FollowUpTask(id={self.id}, title='{self.title}', status='{self.status}')>"
