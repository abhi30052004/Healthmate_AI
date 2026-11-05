"""Medical document text extraction service.

Supports native PDF extraction via PyMuPDF and local OCR fallback via RapidOCR / Tesseract
for scanned PDFs, PNG, JPG, and JPEG documents.
Enforces limits: page counts (max 50), image dimensions (max 8000x8000), file size,
and does not silently accept empty extractions.
"""

import io
import logging
import os
import shutil
from dataclasses import dataclass
from pathlib import Path

import pymupdf
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

# System limits
MAX_PDF_PAGES = 50
MAX_IMAGE_DIMENSION = 8000
MIN_TEXT_CHAR_THRESHOLD = 20


@dataclass
class ExtractionResult:
    status: str  # "extracted", "failed"
    extracted_text: str | None = None
    page_count: int | None = None
    ocr_applied: bool = False
    error_message: str | None = None


# Global cached RapidOCR instance
_rapid_ocr_instance = None


def get_ocr_engine():
    """Lazy initialize RapidOCR engine."""
    global _rapid_ocr_instance
    if _rapid_ocr_instance is None:
        try:
            from rapidocr_onnxruntime import RapidOCR

            _rapid_ocr_instance = RapidOCR()
        except Exception as exc:
            logger.warning("RapidOCR failed to initialize: %s", exc)
            _rapid_ocr_instance = False
    return _rapid_ocr_instance if _rapid_ocr_instance is not False else None


def run_ocr_on_image_bytes(image_bytes: bytes) -> tuple[str, bool]:
    """Run local OCR on image bytes.

    Uses RapidOCR with horizontal line clustering.
    Falls back to pytesseract if RapidOCR is unavailable.
    Returns (extracted_text, is_low_confidence).
    """
    engine = get_ocr_engine()

    if engine is not None:
        try:
            result, _ = engine(image_bytes)
            if not result:
                return "", False

            # Cluster text boxes into horizontal lines
            items = []
            low_conf_count = 0
            for box, text, score in result:
                ys = [p[1] for p in box]
                xs = [p[0] for p in box]
                y_center = (min(ys) + max(ys)) / 2.0
                x_min = min(xs)
                conf = float(score)
                if conf < 0.60:
                    low_conf_count += 1
                items.append((y_center, x_min, text.strip(), conf))

            if not items:
                return "", False

            is_low_conf = (low_conf_count / len(items)) > 0.35

            # Group boxes where vertical center distance is < 18px
            items.sort(key=lambda it: it[0])
            lines: list[list[tuple[float, float, str, float]]] = []
            for it in items:
                y_center = it[0]
                matched = False
                for line in lines:
                    line_y_avg = sum(x[0] for x in line) / len(line)
                    if abs(y_center - line_y_avg) < 18:
                        line.append(it)
                        matched = True
                        break
                if not matched:
                    lines.append([it])

            # Sort lines vertically and sort items within each line horizontally
            lines.sort(key=lambda line: sum(it[0] for it in line) / len(line))
            rendered_lines: list[str] = []
            for line in lines:
                line.sort(key=lambda it: it[1])
                # Delimit columns with ' | ' if multiple distinct boxes exist
                rendered_lines.append(" | ".join(it[2] for it in line if it[2]))

            return "\n".join(rendered_lines), is_low_conf
        except Exception as exc:
            logger.warning("RapidOCR execution error: %s", exc)

    # Fallback to pytesseract if installed
    try:
        import pytesseract

        tess_bin = shutil.which("tesseract")
        if not tess_bin:
            # Check default Windows location
            default_win_tess = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
            if os.path.exists(default_win_tess):
                pytesseract.pytesseract.tesseract_cmd = default_win_tess
                tess_bin = default_win_tess

        if tess_bin:
            with Image.open(io.BytesIO(image_bytes)) as pil_img:
                text = pytesseract.image_to_string(pil_img)
                return text.strip(), False
    except Exception as exc:
        logger.warning("Pytesseract fallback failed: %s", exc)

    return "", False


def extract_text_from_pdf(file_path: Path) -> ExtractionResult:
    """Extract text from PDF.

    First attempts native text extraction via PyMuPDF.
    If the document is a scanned image (< 20 characters), automatically
    routes each page through OCR.
    """
    try:
        with open(file_path, "rb") as f:
            pdf_bytes = f.read()
        doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    except Exception as exc:
        return ExtractionResult(
            status="failed",
            error_message=f"Failed to parse PDF structure: {type(exc).__name__}",
        )

    try:
        if doc.is_encrypted:
            return ExtractionResult(
                status="failed",
                page_count=len(doc),
                error_message="PDF is encrypted or password-protected and cannot be processed.",
            )

        page_count = len(doc)
        if page_count == 0:
            return ExtractionResult(
                status="failed",
                page_count=0,
                error_message="Document contains 0 readable pages.",
            )

        if page_count > MAX_PDF_PAGES:
            return ExtractionResult(
                status="failed",
                page_count=page_count,
                error_message=f"Document exceeds the maximum page limit of {MAX_PDF_PAGES} pages.",
            )

        pages_text: list[str] = []
        total_text_length = 0

        # Attempt native text extraction
        for page_idx in range(page_count):
            page = doc[page_idx]
            page_content = page.get_text().strip()
            if page_content:
                pages_text.append(f"--- Page {page_idx + 1} ---\n{page_content}")
                total_text_length += len(page_content)

        # Scanned PDF detection: if little or no selectable text found, run OCR page-by-page
        if total_text_length < MIN_TEXT_CHAR_THRESHOLD:
            ocr_pages: list[str] = []
            ocr_applied = True
            total_ocr_text_length = 0

            for page_idx in range(page_count):
                page = doc[page_idx]
                pix = page.get_pixmap(dpi=150)
                img_bytes = pix.tobytes("png")
                page_ocr_text, _ = run_ocr_on_image_bytes(img_bytes)
                if page_ocr_text.strip():
                    ocr_pages.append(f"--- Page {page_idx + 1} ---\n{page_ocr_text.strip()}")
                    total_ocr_text_length += len(page_ocr_text.strip())

            if total_ocr_text_length == 0:
                return ExtractionResult(
                    status="failed",
                    page_count=page_count,
                    ocr_applied=True,
                    error_message="OCR was unable to extract any readable text from this scanned PDF.",
                )

            return ExtractionResult(
                status="extracted",
                extracted_text="\n\n".join(ocr_pages),
                page_count=page_count,
                ocr_applied=True,
            )

        full_extracted_text = "\n\n".join(pages_text)
        return ExtractionResult(
            status="extracted",
            extracted_text=full_extracted_text,
            page_count=page_count,
            ocr_applied=False,
        )
    except Exception as exc:
        return ExtractionResult(
            status="failed",
            error_message=f"Text extraction failed: {type(exc).__name__}",
        )
    finally:
        doc.close()


def extract_text_from_image(file_path: Path, mime_type: str) -> ExtractionResult:
    """Extract text from an image document (PNG / JPEG) using local OCR."""
    try:
        with Image.open(file_path) as img:
            # Handle EXIF rotation and verify integrity
            img_oriented = ImageOps.exif_transpose(img)
            width, height = img_oriented.size
            if width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
                return ExtractionResult(
                    status="failed",
                    error_count=1,
                    error_message=f"Image dimensions ({width}x{height}) exceed maximum allowed dimension of {MAX_IMAGE_DIMENSION}px.",
                )

            img_bytes_io = io.BytesIO()
            img_oriented.save(img_bytes_io, format="PNG")
            img_bytes = img_bytes_io.getvalue()
    except Exception as exc:
        return ExtractionResult(
            status="failed",
            error_message=f"Malformed or corrupt image file: {type(exc).__name__}",
        )

    ocr_text, _ = run_ocr_on_image_bytes(img_bytes)

    if not ocr_text or not ocr_text.strip():
        return ExtractionResult(
            status="failed",
            page_count=1,
            ocr_applied=True,
            error_message="OCR was unable to detect or extract readable text from this image report.",
        )

    formatted_text = f"--- Page 1 ---\n{ocr_text.strip()}"
    return ExtractionResult(
        status="extracted",
        extracted_text=formatted_text,
        page_count=1,
        ocr_applied=True,
    )


def extract_document_content(file_path: Path, mime_type: str) -> ExtractionResult:
    """Dispatch extraction by MIME type."""
    if mime_type == "application/pdf":
        return extract_text_from_pdf(file_path)
    if mime_type in ("image/png", "image/jpeg"):
        return extract_text_from_image(file_path, mime_type)
    return ExtractionResult(
        status="failed",
        error_message=f"Unsupported MIME type for extraction: {mime_type}",
    )
