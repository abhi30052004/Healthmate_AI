"""Database model for Smart Health Reminders and Notifications."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Reminder(Base):
    __tablename__ = "reminders"

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
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    category: Mapped[str] = mapped_column(
        String(50),
        default="general",
        nullable=False,  # medication, appointment, follow_up, report_review, general
    )

    due_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    timezone: Mapped[str] = mapped_column(
        String(100),
        default="UTC",
        nullable=False,
    )

    frequency: Mapped[str] = mapped_column(
        String(50),
        default="once",
        nullable=False,  # once, daily, weekly, monthly
    )

    # Optional foreign key references to user care records
    medication_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("care_medications.id", ondelete="SET NULL"),
        nullable=True,
    )

    appointment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("care_appointments.id", ondelete="SET NULL"),
        nullable=True,
    )

    task_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("care_follow_up_tasks.id", ondelete="SET NULL"),
        nullable=True,
    )

    document_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Delivery & Status flags
    is_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    delivery_status: Mapped[str] = mapped_column(
        String(50),
        default="pending",
        nullable=False,  # pending, delivered, failed
    )

    delivered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    delivery_error: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    send_email: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    # Acknowledgement & Dismissal states
    is_acknowledged: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    acknowledged_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    is_dismissed: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    dismissed_at: Mapped[datetime | None] = mapped_column(
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

    # Relationships
    user = relationship("User", back_populates="reminders")
    family_profile = relationship("FamilyProfile", back_populates="reminders")
    medication = relationship("MedicationRecord")
    appointment = relationship("AppointmentRecord")
    task = relationship("FollowUpTask")
    document = relationship("Document")

    __table_args__ = (
        Index("ix_reminders_user_due", "user_id", "due_at"),
        Index("ix_reminders_status_due", "delivery_status", "is_enabled", "due_at"),
    )

    def __repr__(self) -> str:
        return f"<Reminder(id={self.id}, title='{self.title}', category='{self.category}', due_at={self.due_at})>"
