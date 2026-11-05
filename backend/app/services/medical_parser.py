"""Structured medical report text and clinical observation parser.

Extracts patient demographics, collection/report dates, laboratory names,
and structured observations (test name, value, unit, reference range, abnormal flag, source text, source page).
Strictly deterministic and provenance-preserving: never fabricates values, dates, or reference ranges.
"""

import re
from dataclasses import dataclass

from app.services.normalization import normalize_test_name


@dataclass
class ParsedObservation:
    test_name: str
    value: str
    numeric_value: float | None
    unit: str | None
    reference_range: str | None
    flag: str | None  # "HIGH", "LOW", "NORMAL", "ABNORMAL", or None
    source_page: int
    source_text: str
    is_low_confidence: bool = False
    normalized_test_name: str | None = None
    category: str | None = None


@dataclass
class ParsedMedicalRecord:
    patient_name: str | None
    lab_name: str | None
    document_date: str | None
    observations: list[ParsedObservation]


def compute_abnormal_flag(
    numeric_val: float | None,
    val_str: str,
    reference_range: str | None,
) -> str | None:
    """Determine abnormal flag based strictly on evidence in reference range or qualitative values.

    Never guesses or invents flags without evidence.
    """
    clean_val = val_str.strip().upper()

    # Qualitative indicators
    if clean_val in ("NEGATIVE", "NON-REACTIVE", "NOT DETECTED", "NORMAL"):
        return "NORMAL"
    if clean_val in ("POSITIVE", "REACTIVE", "DETECTED", "ABNORMAL"):
        return "ABNORMAL"

    if numeric_val is None or not reference_range:
        return None

    ref = reference_range.strip()

    # Range format: "X - Y" or "X-Y"
    range_match = re.match(r"^([0-9]+(?:\.[0-9]+)?)\s*[-–—]\s*([0-9]+(?:\.[0-9]+)?)$", ref)
    if range_match:
        try:
            low = float(range_match.group(1))
            high = float(range_match.group(2))
            if numeric_val < low:
                return "LOW"
            if numeric_val > high:
                return "HIGH"
            return "NORMAL"
        except (ValueError, TypeError):
            return None

    # Less than format: "< X" or "<= X"
    lt_match = re.match(r"^[<≤]\s*([0-9]+(?:\.[0-9]+)?)$", ref)
    if lt_match:
        try:
            max_val = float(lt_match.group(1))
            if numeric_val > max_val:
                return "HIGH"
            return "NORMAL"
        except (ValueError, TypeError):
            return None

    # Greater than format: "> X" or ">= X"
    gt_match = re.match(r"^[>≥]\s*([0-9]+(?:\.[0-9]+)?)$", ref)
    if gt_match:
        try:
            min_val = float(gt_match.group(1))
            if numeric_val < min_val:
                return "LOW"
            return "NORMAL"
        except (ValueError, TypeError):
            return None

    return None


def parse_numeric_value(val_str: str) -> tuple[str, float | None]:
    """Parse numeric float while preserving original text precision and formatting."""
    cleaned = val_str.strip().rstrip(".").rstrip(",")
    try:
        num = float(cleaned)
        # Format integer values cleanly in string representation if strictly integer float (e.g. 245.0 -> 245)
        # while keeping string exact
        return cleaned, num
    except (ValueError, TypeError):
        return val_str.strip(), None


def parse_medical_record(text: str | None) -> ParsedMedicalRecord:
    """Parse raw extracted medical report text into structured clinical data.

    Preserves source text provenance and page numbers.
    """
    if not text or not text.strip():
        return ParsedMedicalRecord(
            patient_name=None,
            lab_name=None,
            document_date=None,
            observations=[],
        )

    patient_name: str | None = None
    lab_name: str | None = None
    document_date: str | None = None
    observations: list[ParsedObservation] = []

    # 1. Patient Name Extraction
    m_patient = re.search(
        r"(?:Patient(?:\s+Name)?|Name)\s*[:]\s*([^\n\r]+)",
        text,
        re.IGNORECASE,
    )
    if m_patient:
        patient_candidate = m_patient.group(1).split("|")[0].strip()
        if patient_candidate:
            patient_name = patient_candidate

    # 2. Date Extraction (YYYY-MM-DD or MM/DD/YYYY or DD-MM-YYYY)
    m_date = re.search(
        r"(?:Collected|Collection Date|Report Date|Date of Service|Date)\s*[:]\s*([0-9]{4}-[0-9]{2}-[0-9]{2})",
        text,
        re.IGNORECASE,
    )
    if m_date:
        document_date = m_date.group(1).strip()
    else:
        m_alt_date = re.search(
            r"\b([0-9]{4}-[0-9]{2}-[0-9]{2})\b",
            text,
        )
        if m_alt_date:
            document_date = m_alt_date.group(1).strip()

    # 3. Lab / Provider Extraction
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    for line in lines[:10]:
        if re.search(
            r"(?:Labs|Diagnostics|Clinic|Hospital|Laboratory|Center|Health|Pathology)",
            line,
            re.IGNORECASE,
        ):
            if not line.startswith("---") and not line.lower().startswith("patient"):
                clean_lab = line.split("|")[0].strip()
                if clean_lab:
                    lab_name = clean_lab
                    break

    # 4. Observation Extraction by Page
    pages = re.split(r"--- Page ([0-9]+) ---", text)
    if len(pages) > 1:
        # pages will alternate: [pre_text, page_num_1, page_content_1, page_num_2, page_content_2, ...]
        i = 1
        while i < len(pages):
            page_num = int(pages[i])
            page_content = pages[i + 1] if i + 1 < len(pages) else ""
            obs = _extract_observations_from_page(page_content, page_num)
            observations.extend(obs)
            i += 2
    else:
        observations = _extract_observations_from_page(text, 1)

    return ParsedMedicalRecord(
        patient_name=patient_name,
        lab_name=lab_name,
        document_date=document_date,
        observations=observations,
    )


def _extract_observations_from_page(page_text: str, page_num: int) -> list[ParsedObservation]:
    """Extract clinical observations from a single page's text."""
    observations: list[ParsedObservation] = []
    lines = [line.strip() for line in page_text.splitlines() if line.strip()]

    # Strategy A: Structured pipe-delimited lines (from OCR horizontal clustering)
    for line in lines:
        if "|" in line:
            parts = [p.strip() for p in line.split("|") if p.strip()]
            header_check = parts[0].lower()
            if any(h in header_check for h in ["test", "analyte", "panel", "patient", "collected", "synthetic", "reference", "page"]):
                continue

            t_name = parts[0]
            val_raw = ""
            unit = ""
            ref_range = ""
            explicit_flag = None

            if len(parts) >= 4:
                val_raw = parts[1]
                unit = parts[2]
                ref_range = parts[3]
                explicit_flag = parts[4].upper() if len(parts) >= 5 else None
            elif len(parts) == 3:
                # Check if parts[1] combined value + unit (e.g. "2.4*mIU/L" or "2.4 mIU/L")
                m_vu = re.match(r"^([<>]?\s*[0-9]+(?:\.[0-9]+)?)[*,\s]+([A-Za-z0-9\/\^\%]+)$", parts[1])
                if m_vu:
                    val_raw = m_vu.group(1)
                    unit = m_vu.group(2)
                    ref_range = parts[2]
                else:
                    # Check if parts[2] combined unit + reference range (e.g. "ng/dL,0.8-1.8")
                    m_ur = re.match(r"^([A-Za-z0-9\/\^\%]+)[*,\s]+([<>]?\s*[0-9]+(?:\.[0-9]+)?.*)$", parts[2])
                    if m_ur:
                        val_raw = parts[1]
                        unit = m_ur.group(1)
                        ref_range = m_ur.group(2)
                    else:
                        val_raw = parts[1]
                        ref_range = parts[2]

            if not val_raw:
                continue

            clean_str, num_val = parse_numeric_value(val_raw)
            flag = explicit_flag or compute_abnormal_flag(num_val, clean_str, ref_range)

            # Check low confidence indicator
            is_low_conf = False
            if num_val is None and ref_range and ("-" in ref_range or "<" in ref_range or ">" in ref_range):
                # Value failed to parse as number even though reference range expects numeric
                is_low_conf = True

            norm_name, cat = normalize_test_name(t_name)
            observations.append(
                ParsedObservation(
                    test_name=t_name,
                    value=clean_str,
                    numeric_value=num_val,
                    unit=unit if unit else None,
                    reference_range=ref_range if ref_range else None,
                    flag=flag,
                    source_page=page_num,
                    source_text=line,
                    is_low_confidence=is_low_conf,
                    normalized_test_name=norm_name,
                    category=cat,
                )
            )

    if observations:
        return observations

    # Strategy B: Native PDF vertical column flow
    # Patterns like:
    # Test
    # Result
    # Unit
    # Reference Range
    # <Name>
    # <Value>
    # <Unit>
    # <Range>
    idx = 0
    while idx < len(lines):
        line_lower = lines[idx].lower()
        if line_lower == "test" and idx + 3 < len(lines) and "result" in lines[idx + 1].lower() and "unit" in lines[idx + 2].lower():
            idx += 4
            while idx + 3 < len(lines):
                cur_line = lines[idx]
                if any(k in cur_line.lower() for k in ["synthetic", "page", "collected", "patient"]) or cur_line.startswith("---"):
                    break

                t_name = cur_line
                val_raw = lines[idx + 1]
                unit = lines[idx + 2]
                ref_range = lines[idx + 3]

                clean_str, num_val = parse_numeric_value(val_raw)
                flag = compute_abnormal_flag(num_val, clean_str, ref_range)
                norm_name, cat = normalize_test_name(t_name)

                source_snippet = f"{t_name} {val_raw} {unit} {ref_range}"
                observations.append(
                    ParsedObservation(
                        test_name=t_name,
                        value=clean_str,
                        numeric_value=num_val,
                        unit=unit,
                        reference_range=ref_range,
                        flag=flag,
                        source_page=page_num,
                        source_text=source_snippet,
                        is_low_confidence=False,
                        normalized_test_name=norm_name,
                        category=cat,
                    )
                )
                idx += 4
        idx += 1

    if observations:
        return observations

    # Strategy C: Single line tabular pattern (space or tab separated)
    # e.g.: "Hemoglobin  13.2  g/dL  13.5-17.5"
    row_pattern = re.compile(
        r"^([A-Za-z0-9\s\(\)\/\-\+]+?)\s{2,}([<>]?\s*[0-9]+(?:\.[0-9]+)?|[A-Za-z]+)\s{2,}([A-Za-z0-9\/\^\%\_\-]+)\s{2,}([<>]?\s*[0-9]+(?:\.[0-9]+)?(?:\s*[-–—]\s*[0-9]+(?:\.[0-9]+)?)?)$"
    )
    for line in lines:
        if line.startswith("---") or any(h in line.lower() for h in ["test", "result", "patient", "collected", "synthetic"]):
            continue
        m = row_pattern.match(line)
        if m:
            t_name = m.group(1).strip()
            val_raw = m.group(2).strip()
            unit = m.group(3).strip()
            ref_range = m.group(4).strip()
            clean_str, num_val = parse_numeric_value(val_raw)
            flag = compute_abnormal_flag(num_val, clean_str, ref_range)
            norm_name, cat = normalize_test_name(t_name)
            observations.append(
                ParsedObservation(
                    test_name=t_name,
                    value=clean_str,
                    numeric_value=num_val,
                    unit=unit,
                    reference_range=ref_range,
                    flag=flag,
                    source_page=page_num,
                    source_text=line,
                    is_low_confidence=False,
                    normalized_test_name=norm_name,
                    category=cat,
                )
            )

    return observations
