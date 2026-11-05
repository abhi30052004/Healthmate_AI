"""Clinical observation normalization and unit compatibility engine.

Normalizes test names into canonical representations and clinical categories
without mutating or destroying original source labels.
Provides safe, evidence-based unit conversions for compatible measurements.
Never compares or merges incompatible clinical units.
"""

import re

# Canonical category definitions
CATEGORIES = {
    "HEMATOLOGY": "Hematology",
    "LIPIDS": "Lipids",
    "METABOLIC": "Metabolic",
    "ENDOCRINE": "Endocrine",
    "URINALYSIS": "Urinalysis",
    "IMMUNOLOGY": "Immunology",
    "OTHER": "Other",
}

# Mapping: alias regex pattern -> (canonical_name, category)
TEST_MAPPINGS: list[tuple[re.Pattern, str, str]] = [
    # Hematology
    (
        re.compile(r"^(hemoglobin|hgb|hb)$", re.IGNORECASE),
        "Hemoglobin",
        CATEGORIES["HEMATOLOGY"],
    ),
    (
        re.compile(r"^(hematocrit|hct|packed\s*cell\s*volume|pcv)$", re.IGNORECASE),
        "Hematocrit",
        CATEGORIES["HEMATOLOGY"],
    ),
    (
        re.compile(r"^(white\s*blood\s*cells?|wbc|leukocytes?|white\s*count)$", re.IGNORECASE),
        "WBC",
        CATEGORIES["HEMATOLOGY"],
    ),
    (
        re.compile(r"^(platelets?|plt|platelet\s*count|thrombocytes?)$", re.IGNORECASE),
        "Platelets",
        CATEGORIES["HEMATOLOGY"],
    ),
    (
        re.compile(r"^(red\s*blood\s*cells?|rbc|erythrocytes?)$", re.IGNORECASE),
        "RBC",
        CATEGORIES["HEMATOLOGY"],
    ),
    (
        re.compile(r"^(mean\s*corpuscular\s*volume|mcv)$", re.IGNORECASE),
        "MCV",
        CATEGORIES["HEMATOLOGY"],
    ),
    (
        re.compile(r"^(mean\s*corpuscular\s*hemoglobin|mch)$", re.IGNORECASE),
        "MCH",
        CATEGORIES["HEMATOLOGY"],
    ),
    (
        re.compile(r"^(mean\s*corpuscular\s*hemoglobin\s*concentration|mchc)$", re.IGNORECASE),
        "MCHC",
        CATEGORIES["HEMATOLOGY"],
    ),
    # Lipids
    (
        re.compile(r"^(total\s*cholesterol|cholesterol|cholesterol,\s*total|serum\s*cholesterol)$", re.IGNORECASE),
        "Total Cholesterol",
        CATEGORIES["LIPIDS"],
    ),
    (
        re.compile(r"^(ldl\s*cholesterol|ldl|ldl-c|low\s*density\s*lipoprotein)$", re.IGNORECASE),
        "LDL Cholesterol",
        CATEGORIES["LIPIDS"],
    ),
    (
        re.compile(r"^(hdl\s*cholesterol|hdl|hdl-c|high\s*density\s*lipoprotein)$", re.IGNORECASE),
        "HDL Cholesterol",
        CATEGORIES["LIPIDS"],
    ),
    (
        re.compile(r"^(triglycerides?|trigs?|tg)$", re.IGNORECASE),
        "Triglycerides",
        CATEGORIES["LIPIDS"],
    ),
    # Metabolic
    (
        re.compile(r"^(fasting\s*glucose|blood\s*glucose|glucose|serum\s*glucose|fasting\s*blood\s*sugar|fbs)$", re.IGNORECASE),
        "Fasting Glucose",
        CATEGORIES["METABOLIC"],
    ),
    (
        re.compile(r"^(hba1c|hemoglobin\s*a1c|glycated\s*hemoglobin|glycohemoglobin|a1c)$", re.IGNORECASE),
        "HbA1c",
        CATEGORIES["METABOLIC"],
    ),
    (
        re.compile(r"^(creatinine|serum\s*creatinine|creat)$", re.IGNORECASE),
        "Creatinine",
        CATEGORIES["METABOLIC"],
    ),
    (
        re.compile(r"^(blood\s*urea\s*nitrogen|bun|urea)$", re.IGNORECASE),
        "BUN",
        CATEGORIES["METABOLIC"],
    ),
    (
        re.compile(r"^(estimated\s*gfr|egfr)$", re.IGNORECASE),
        "eGFR",
        CATEGORIES["METABOLIC"],
    ),
    (
        re.compile(r"^(sodium|na)$", re.IGNORECASE),
        "Sodium",
        CATEGORIES["METABOLIC"],
    ),
    (
        re.compile(r"^(potassium|k)$", re.IGNORECASE),
        "Potassium",
        CATEGORIES["METABOLIC"],
    ),
    (
        re.compile(r"^(calcium|ca)$", re.IGNORECASE),
        "Calcium",
        CATEGORIES["METABOLIC"],
    ),
    # Endocrine
    (
        re.compile(r"^(tsh|thyroid\s*stimulating\s*hormone|thyrotropin)$", re.IGNORECASE),
        "TSH",
        CATEGORIES["ENDOCRINE"],
    ),
    (
        re.compile(r"^(free\s*t4|ft4|free\s*thyroxine)$", re.IGNORECASE),
        "Free T4",
        CATEGORIES["ENDOCRINE"],
    ),
    (
        re.compile(r"^(total\s*t4|t4|thyroxine)$", re.IGNORECASE),
        "Total T4",
        CATEGORIES["ENDOCRINE"],
    ),
    (
        re.compile(r"^(free\s*t3|ft3|free\s*triiodothyronine)$", re.IGNORECASE),
        "Free T3",
        CATEGORIES["ENDOCRINE"],
    ),
    (
        re.compile(r"^(total\s*t3|t3|triiodothyronine)$", re.IGNORECASE),
        "Total T3",
        CATEGORIES["ENDOCRINE"],
    ),
]


def normalize_test_name(test_name: str | None) -> tuple[str, str]:
    """Normalize a raw clinical test name to its canonical name and clinical category.

    Preserves title-cased fallback if no predefined alias matches.
    """
    if not test_name or not test_name.strip():
        return "Unknown Test", CATEGORIES["OTHER"]

    cleaned = test_name.strip()
    # Normalize internal punctuation and whitespace
    simplified = re.sub(r"[\s\-_]+", " ", cleaned).strip()

    for pattern, canonical_name, category in TEST_MAPPINGS:
        if pattern.match(simplified) or pattern.match(cleaned):
            return canonical_name, category

    # Substring matches for compound names
    lower_name = simplified.lower()
    if "glucose" in lower_name:
        return "Fasting Glucose", CATEGORIES["METABOLIC"]
    if "cholesterol" in lower_name and "total" in lower_name:
        return "Total Cholesterol", CATEGORIES["LIPIDS"]
    if "cholesterol" in lower_name and "ldl" in lower_name:
        return "LDL Cholesterol", CATEGORIES["LIPIDS"]
    if "cholesterol" in lower_name and "hdl" in lower_name:
        return "HDL Cholesterol", CATEGORIES["LIPIDS"]
    if "triglyceride" in lower_name:
        return "Triglycerides", CATEGORIES["LIPIDS"]
    if "hemoglobin" in lower_name and "a1c" in lower_name:
        return "HbA1c", CATEGORIES["METABOLIC"]
    if "hemoglobin" in lower_name:
        return "Hemoglobin", CATEGORIES["HEMATOLOGY"]
    if "thyroid" in lower_name or "tsh" in lower_name:
        return "TSH", CATEGORIES["ENDOCRINE"]

    return cleaned.title(), CATEGORIES["OTHER"]


def are_units_compatible(test_name: str, unit_a: str | None, unit_b: str | None) -> bool:
    """Determine whether two measurement units can be compared or charted together.

    Strictly refuses incompatible units (e.g. mg/dL vs % or mIU/L).
    """
    if not unit_a or not unit_b:
        return unit_a == unit_b

    clean_a = unit_a.strip().lower()
    clean_b = unit_b.strip().lower()

    if clean_a == clean_b:
        return True

    canonical, _ = normalize_test_name(test_name)

    # Blood Glucose compatible units: mg/dL <-> mmol/L
    if canonical == "Fasting Glucose":
        glucose_units = {"mg/dl", "mmol/l"}
        return clean_a in glucose_units and clean_b in glucose_units

    # Lipid compatible units: mg/dL <-> mmol/L
    if canonical in ("Total Cholesterol", "LDL Cholesterol", "HDL Cholesterol", "Triglycerides"):
        lipid_units = {"mg/dl", "mmol/l"}
        return clean_a in lipid_units and clean_b in lipid_units

    return False


def convert_to_standard_unit(
    test_name: str,
    numeric_value: float | None,
    unit: str | None,
) -> tuple[float | None, str | None, bool]:
    """Convert measurement value to standard display unit when a verified clinical factor exists.

    Returns:
        (standardized_value, standard_unit, was_converted)
    """
    if numeric_value is None or not unit:
        return numeric_value, unit, False

    canonical, _ = normalize_test_name(test_name)
    clean_unit = unit.strip().lower()

    # Fasting Glucose: Standard unit is mg/dL
    # 1 mmol/L Glucose = 18.0182 mg/dL
    if canonical == "Fasting Glucose":
        if clean_unit == "mmol/l":
            converted = round(numeric_value * 18.0182, 1)
            return converted, "mg/dL", True
        if clean_unit == "mg/dl":
            return numeric_value, "mg/dL", False

    # Cholesterol (Total, LDL, HDL): Standard unit is mg/dL
    # 1 mmol/L Cholesterol = 38.67 mg/dL
    if canonical in ("Total Cholesterol", "LDL Cholesterol", "HDL Cholesterol"):
        if clean_unit == "mmol/l":
            converted = round(numeric_value * 38.67, 1)
            return converted, "mg/dL", True
        if clean_unit == "mg/dl":
            return numeric_value, "mg/dL", False

    # Triglycerides: Standard unit is mg/dL
    # 1 mmol/L Triglycerides = 88.57 mg/dL
    if canonical == "Triglycerides":
        if clean_unit == "mmol/l":
            converted = round(numeric_value * 88.57, 1)
            return converted, "mg/dL", True
        if clean_unit == "mg/dl":
            return numeric_value, "mg/dL", False

    # Default: no conversion available
    return numeric_value, unit, False
