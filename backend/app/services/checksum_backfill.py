"""Safe, idempotent checksum backfilling service for legacy documents.

Computes SHA-256 cryptographic checksums for documents lacking them,
by reading stored files in chunks without modifying the original medical files.
"""

import hashlib
import logging
import os
from pathlib import Path

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.document import Document

logger = logging.getLogger("healthmate.checksum_backfill")


def compute_file_sha256(file_path: Path) -> str:
    """Read file in 64KB chunks and compute its SHA-256 hex digest safely."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def backfill_document_checksums(db: Session) -> dict[str, int]:
    """Idempotently scan and backfill missing or empty SHA-256 checksums on Document records.

    Does not modify or rewrite the physical medical files.
    """
    settings = get_settings()
    storage_root = Path(settings.document_storage_dir).resolve()

    from sqlalchemy import update

    stmt = select(Document.id, Document.storage_key, Document.checksum_sha256).where(
        or_(
            Document.checksum_sha256.is_(None),
            Document.checksum_sha256 == "",
            Document.checksum_sha256 == "legacy",
        )
    )
    legacy_rows = list(db.execute(stmt).all())

    updated_count = 0
    missing_file_count = 0
    skipped_count = 0

    for doc_id, storage_key, _ in legacy_rows:
        target_path = (storage_root / storage_key).resolve()
        # Prevent path traversal outside storage root
        if not str(target_path).startswith(str(storage_root)):
            logger.warning("Storage path violation detected for document %s", doc_id)
            skipped_count += 1
            continue

        if not target_path.exists() or not target_path.is_file():
            logger.warning("Physical file missing for document %s at %s", doc_id, target_path)
            missing_file_count += 1
            continue

        try:
            computed_checksum = compute_file_sha256(target_path)
            db.execute(
                update(Document)
                .where(Document.id == doc_id)
                .values(checksum_sha256=computed_checksum)
            )
            updated_count += 1
        except Exception as exc:
            logger.error("Failed to compute checksum for doc %s: %s", doc_id, type(exc).__name__)
            skipped_count += 1

    if updated_count > 0:
        db.commit()
        logger.info("Successfully backfilled SHA-256 checksum for %d documents", updated_count)

    return {
        "scanned": len(legacy_rows),
        "updated": updated_count,
        "missing_files": missing_file_count,
        "skipped": skipped_count,
    }
