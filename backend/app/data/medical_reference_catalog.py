"""Curated Medical Knowledge Reference Catalogue.

Authoritative, source-attributed, non-diagnostic public medical references
from verified public domain clinical resources (MedlinePlus / NLM, CDC, WHO, AHA, ADA).
Provides deterministic term lookup, test explanations, and reference metadata.
"""

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class CuratedReferenceSource:
    id: str
    term: str
    category: str
    definition: str
    what_it_measures: str
    why_ordered: str
    typical_units: list[str]
    reference_note: str
    questions_to_ask: list[str]
    publisher: str
    canonical_url: str
    license_or_reuse_note: str
    published_at: str | None = "2025-01-15"
    retrieved_at: str = "2026-11-04T00:00:00Z"
    keywords: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "term": self.term,
            "category": self.category,
            "definition": self.definition,
            "what_it_measures": self.what_it_measures,
            "why_ordered": self.why_ordered,
            "typical_units": self.typical_units,
            "reference_note": self.reference_note,
            "questions_to_ask": self.questions_to_ask,
            "publisher": self.publisher,
            "canonical_url": self.canonical_url,
            "license_or_reuse_note": self.license_or_reuse_note,
            "published_at": self.published_at,
            "retrieved_at": self.retrieved_at,
            "keywords": self.keywords,
        }


CURATED_CATALOGUE: list[CuratedReferenceSource] = [
    CuratedReferenceSource(
        id="REF_HBA1C",
        term="HbA1c (Hemoglobin A1c)",
        category="Metabolic",
        definition="A blood test that measures your average blood glucose (sugar) level over the past 2 to 3 months by assessing glucose bound to hemoglobin in red blood cells.",
        what_it_measures="Measures the percentage of hemoglobin—a protein in red blood cells that carries oxygen—that is coated with sugar (glycated).",
        why_ordered="Commonly ordered to screen for prediabetes and type 2 diabetes, and to monitor blood glucose control in people diagnosed with diabetes.",
        typical_units=["%", "mmol/mol"],
        reference_note="Standard clinical reference guidelines generally indicate <5.7% is normal, 5.7%-6.4% suggests prediabetes, and 6.5% or higher on two separate tests indicates diabetes. Target levels for individuals with diabetes are individualized with their clinician.",
        questions_to_ask=[
            "What is my personal target HbA1c based on my overall health profile?",
            "How does this result compare to my previous 3-month test?",
            "Are there non-diabetic factors (such as anemia or hemoglobin variants) affecting my HbA1c result?",
        ],
        publisher="MedlinePlus / National Library of Medicine",
        canonical_url="https://medlineplus.gov/lab-tests/hemoglobin-a1c-hba1c-test/",
        license_or_reuse_note="Public domain / U.S. National Library of Medicine",
        keywords=["hba1c", "a1c", "glycated hemoglobin", "hemoglobin a1c", "sugar average", "diabetes test"],
    ),
    CuratedReferenceSource(
        id="REF_FASTING_GLUCOSE",
        term="Fasting Blood Glucose",
        category="Metabolic",
        definition="A measurement of the concentration of glucose circulating in the blood after a period of fasting (typically at least 8 hours).",
        what_it_measures="Measures the amount of free glucose in the bloodstream, indicating how effectively the pancreas produces insulin and how sensitive cells are to it.",
        why_ordered="Ordered to screen for diabetes, hypoglycemia, and insulin resistance, or as part of a routine comprehensive metabolic panel.",
        typical_units=["mg/dL", "mmol/L"],
        reference_note="Typical standard fasting reference ranges: 70–99 mg/dL (3.9–5.5 mmol/L) is normal; 100–125 mg/dL indicates impaired fasting glucose (prediabetes); 126 mg/dL or higher on repeat testing indicates diabetes.",
        questions_to_ask=[
            "Did my fasting duration accurately match what was needed for this test?",
            "Should we pair this with an oral glucose tolerance test or an HbA1c?",
            "Could current medications or acute stress have temporarily altered this reading?",
        ],
        publisher="MedlinePlus / National Library of Medicine",
        canonical_url="https://medlineplus.gov/lab-tests/blood-glucose-test/",
        license_or_reuse_note="Public domain / U.S. National Library of Medicine",
        keywords=["glucose", "fasting blood sugar", "fbs", "blood glucose", "sugar", "hyperglycemia", "hypoglycemia"],
    ),
    CuratedReferenceSource(
        id="REF_LIPID_PANEL",
        term="Lipid Panel (Cholesterol Profile)",
        category="Lipids",
        definition="A group of blood tests measuring various types of cholesterol and circulating blood fats to assess cardiovascular health and risk.",
        what_it_measures="Evaluates Total Cholesterol, LDL (low-density lipoprotein or 'bad' cholesterol), HDL (high-density lipoprotein or 'good' cholesterol), and Triglycerides.",
        why_ordered="Ordered to evaluate heart disease risk, monitor response to cholesterol-lowering medications or dietary adjustments, and guide cardiovascular prevention.",
        typical_units=["mg/dL", "mmol/L"],
        reference_note="General reference benchmarks for adults: Total Cholesterol <200 mg/dL desirable; LDL <100 mg/dL optimal; HDL >40 mg/dL for men, >50 mg/dL for women; Triglycerides <150 mg/dL.",
        questions_to_ask=[
            "What is my estimated 10-year cardiovascular risk score based on these numbers?",
            "How do my LDL and HDL ratios impact my overall cardiovascular prevention plan?",
            "Are lifestyle interventions or prescription medications appropriate at this level?",
        ],
        publisher="American Heart Association & MedlinePlus",
        canonical_url="https://medlineplus.gov/lab-tests/cholesterol-levels/",
        license_or_reuse_note="Public domain / U.S. Government health guidelines",
        keywords=["lipid panel", "cholesterol", "lipid profile", "lipids", "ldl", "hdl", "triglycerides", "cardiovascular risk"],
    ),
    CuratedReferenceSource(
        id="REF_TOTAL_CHOLESTEROL",
        term="Total Cholesterol",
        category="Lipids",
        definition="The total amount of cholesterol in your blood, including both low-density lipoprotein (LDL) and high-density lipoprotein (HDL).",
        what_it_measures="Quantifies the combined sum of HDL, LDL, and 20% of your triglyceride level.",
        why_ordered="Part of routine cardiovascular screening and health risk assessments.",
        typical_units=["mg/dL", "mmol/L"],
        reference_note="Generally: Less than 200 mg/dL is desirable; 200–239 mg/dL is borderline high; 240 mg/dL and above is considered high.",
        questions_to_ask=[
            "Is my total cholesterol elevated primarily due to LDL or protective HDL?",
            "When should I repeat this test to check consistency?",
        ],
        publisher="MedlinePlus / National Library of Medicine",
        canonical_url="https://medlineplus.gov/cholesterol.html",
        license_or_reuse_note="Public domain / U.S. National Library of Medicine",
        keywords=["total cholesterol", "cholesterol", "hypercholesterolemia"],
    ),
    CuratedReferenceSource(
        id="REF_LDL_CHOLESTEROL",
        term="LDL Cholesterol (Low-Density Lipoprotein)",
        category="Lipids",
        definition="Often called 'bad' cholesterol because elevated levels can lead to plaque buildup (atherosclerosis) in the walls of arteries.",
        what_it_measures="Measures the amount of cholesterol carried in low-density lipoprotein particles.",
        why_ordered="To assess coronary artery disease risk and measure the therapeutic effect of statins or lifestyle modifications.",
        typical_units=["mg/dL", "mmol/L"],
        reference_note="Optimal is generally <100 mg/dL (or <70 mg/dL for individuals with established coronary disease or diabetes); 100–129 mg/dL near optimal; 130–159 mg/dL borderline high; 160–189 mg/dL high; 190+ mg/dL very high.",
        questions_to_ask=[
            "What specific LDL target is safest for my clinical history?",
            "Would coronary calcium scoring (CAC) provide helpful additional risk context?",
        ],
        publisher="MedlinePlus / National Library of Medicine",
        canonical_url="https://medlineplus.gov/lab-tests/cholesterol-levels/",
        license_or_reuse_note="Public domain / U.S. National Library of Medicine",
        keywords=["ldl", "ldl-c", "bad cholesterol", "low density lipoprotein"],
    ),
    CuratedReferenceSource(
        id="REF_HDL_CHOLESTEROL",
        term="HDL Cholesterol (High-Density Lipoprotein)",
        category="Lipids",
        definition="Often referred to as 'good' cholesterol because it absorbs excess cholesterol in the bloodstream and carries it back to the liver for excretion.",
        what_it_measures="Quantifies the cholesterol contained in protective high-density lipoproteins.",
        why_ordered="To measure protective cardiovascular factors and calculate total-to-HDL ratios.",
        typical_units=["mg/dL", "mmol/L"],
        reference_note="Desirable level is >=40 mg/dL for men and >=50 mg/dL for women; levels of 60 mg/dL or higher are considered protective against heart disease.",
        questions_to_ask=[
            "Are there dietary patterns or exercise habits that can support my HDL levels?",
            "How does my HDL interact with my triglyceride levels?",
        ],
        publisher="MedlinePlus / National Library of Medicine",
        canonical_url="https://medlineplus.gov/lab-tests/cholesterol-levels/",
        license_or_reuse_note="Public domain / U.S. National Library of Medicine",
        keywords=["hdl", "hdl-c", "good cholesterol", "high density lipoprotein"],
    ),
    CuratedReferenceSource(
        id="REF_TRIGLYCERIDES",
        term="Triglycerides",
        category="Lipids",
        definition="The most common type of fat (lipid) in your body, derived from dietary calories that are converted into fat storage.",
        what_it_measures="Measures the concentration of triglyceride fat molecules in the blood.",
        why_ordered="Evaluates cardiovascular risk, metabolic syndrome, and acute pancreatitis risk when extremely elevated.",
        typical_units=["mg/dL", "mmol/L"],
        reference_note="Normal: <150 mg/dL (1.7 mmol/L); Borderline high: 150–199 mg/dL; High: 200–499 mg/dL; Very high: >=500 mg/dL.",
        questions_to_ask=[
            "Could alcohol, refined carbohydrates, or fasting duration have influenced this result?",
            "What lifestyle steps best target elevated triglycerides?",
        ],
        publisher="MedlinePlus / National Library of Medicine",
        canonical_url="https://medlineplus.gov/triglycerides.html",
        license_or_reuse_note="Public domain / U.S. National Library of Medicine",
        keywords=["triglycerides", "blood fats", "hypertriglyceridemia"],
    ),
    CuratedReferenceSource(
        id="REF_CBC",
        term="Complete Blood Count (CBC)",
        category="Hematology",
        definition="A comprehensive blood test evaluating the circulating cellular components of blood: red blood cells, white blood cells, and platelets.",
        what_it_measures="Measures cellular counts, concentrations, and physical traits including Hemoglobin, Hematocrit, RBC count, WBC count, and Platelet count.",
        why_ordered="Ordered as a baseline health screen, or to evaluate symptoms such as fatigue, weakness, infection, bruising, or suspected bleeding.",
        typical_units=["mixed"],
        reference_note="Each parameter has independent reference ranges that vary by age, sex at birth, and testing laboratory equipment.",
        questions_to_ask=[
            "Do any mild variations in my red or white cell indices require follow-up?",
            "Are my platelet levels sufficient for upcoming procedures or surgery?",
        ],
        publisher="MedlinePlus / National Library of Medicine",
        canonical_url="https://medlineplus.gov/lab-tests/complete-blood-count-cbc/",
        license_or_reuse_note="Public domain / U.S. National Library of Medicine",
        keywords=["cbc", "complete blood count", "blood test", "hemogram", "full blood count"],
    ),
    CuratedReferenceSource(
        id="REF_HEMOGLOBIN",
        term="Hemoglobin",
        category="Hematology",
        definition="The iron-rich protein inside red blood cells responsible for binding oxygen in the lungs and transporting it to tissues throughout the body.",
        what_it_measures="Quantifies the total concentration of hemoglobin protein in a given volume of whole blood.",
        why_ordered="Diagnoses and monitors anemia (low hemoglobin) or polycythemia (elevated hemoglobin), nutritional deficiencies, or blood loss.",
        typical_units=["g/dL", "g/L"],
        reference_note="Adult standard reference intervals typically range between 13.5–17.5 g/dL for adult males, and 12.0–15.5 g/dL for adult non-pregnant females.",
        questions_to_ask=[
            "If my hemoglobin is below normal, should we test ferritin, vitamin B12, or iron levels?",
            "Could my current symptoms of fatigue or lightheadedness relate to this reading?",
        ],
        publisher="MedlinePlus / National Library of Medicine",
        canonical_url="https://medlineplus.gov/lab-tests/hemoglobin-test/",
        license_or_reuse_note="Public domain / U.S. National Library of Medicine",
        keywords=["hemoglobin", "hgb", "hb", "anemia", "iron"],
    ),
    CuratedReferenceSource(
        id="REF_HEMATOCRIT",
        term="Hematocrit",
        category="Hematology",
        definition="The proportion or percentage of whole blood volume that is occupied by red blood cells.",
        what_it_measures="Calculates the ratio of red blood cell volume compared to total blood volume.",
        why_ordered="Evaluated in tandem with hemoglobin to detect anemia, dehydration, or bone marrow disorders.",
        typical_units=["%"],
        reference_note="Typical adult reference bounds: approximately 41%–53% for men, and 36%–48% for women, subject to lab variation.",
        questions_to_ask=[
            "Could dehydration have artificially concentrated my hematocrit percentage?",
            "How does this value align with my red blood cell count and hemoglobin?",
        ],
        publisher="MedlinePlus / National Library of Medicine",
        canonical_url="https://medlineplus.gov/lab-tests/hematocrit-test/",
        license_or_reuse_note="Public domain / U.S. National Library of Medicine",
        keywords=["hematocrit", "hct", "red blood cell volume", "pcv", "packed cell volume"],
    ),
    CuratedReferenceSource(
        id="REF_WBC",
        term="White Blood Cell Count (WBC)",
        category="Hematology",
        definition="The number of leukocytes (infection-fighting immune cells) circulating in a microliter of blood.",
        what_it_measures="Total count of circulating immune cells, including neutrophils, lymphocytes, monocytes, eosinophils, and basophils.",
        why_ordered="Detects active infections, inflammatory conditions, allergic responses, or bone marrow reactions.",
        typical_units=["10^3/uL", "x10^9/L", "/mcL"],
        reference_note="Typical reference range for healthy adults is generally 4.0–11.0 x 10^3 cells/mcL (4,000–11,000 cells per microliter).",
        questions_to_ask=[
            "Could a recent minor cold, dental procedure, or acute stress explain an elevated WBC?",
            "Do we need a WBC differential to examine specific sub-types of immune cells?",
        ],
        publisher="MedlinePlus / National Library of Medicine",
        canonical_url="https://medlineplus.gov/lab-tests/white-blood-cell-count-wbc/",
        license_or_reuse_note="Public domain / U.S. National Library of Medicine",
        keywords=["wbc", "white blood cells", "leukocytes", "infection count"],
    ),
    CuratedReferenceSource(
        id="REF_PLATELETS",
        term="Platelet Count",
        category="Hematology",
        definition="Tiny disc-shaped cell fragments in the blood essential for normal blood clotting and vessel repair.",
        what_it_measures="Number of platelets present per microliter of blood.",
        why_ordered="Investigates unexplained bruising, prolonged bleeding, or monitors medications that can affect platelet production.",
        typical_units=["10^3/uL", "x10^9/L"],
        reference_note="Standard expected reference interval for adults is 150,000 to 450,000 platelets/mcL (150–450 x 10^3/uL).",
        questions_to_ask=[
            "Is my platelet count stable over time?",
            "Do any over-the-counter supplements or medications (e.g. aspirin) affect my clotting?",
        ],
        publisher="MedlinePlus / National Library of Medicine",
        canonical_url="https://medlineplus.gov/lab-tests/platelet-tests/",
        license_or_reuse_note="Public domain / U.S. National Library of Medicine",
        keywords=["platelets", "plt", "thrombocytes", "clotting cells"],
    ),
    CuratedReferenceSource(
        id="REF_CREATININE",
        term="Serum Creatinine",
        category="Renal",
        definition="A chemical waste product generated from muscle metabolism and protein breakdown that is filtered from the blood by the kidneys.",
        what_it_measures="Assesses how efficiently the kidneys are clearing metabolic waste from the bloodstream.",
        why_ordered="Essential marker used to calculate estimated Glomerular Filtration Rate (eGFR) and monitor kidney function.",
        typical_units=["mg/dL", "umol/L"],
        reference_note="Typical adult reference ranges: roughly 0.7–1.3 mg/dL for men and 0.6–1.1 mg/dL for women, though baseline depends on muscle mass and age.",
        questions_to_ask=[
            "What is my calculated eGFR based on this creatinine value?",
            "Could heavy exercise, high dietary protein, or mild dehydration have influenced this result?",
            "Are my ongoing prescriptions safe for my level of kidney function?",
        ],
        publisher="MedlinePlus / National Library of Medicine",
        canonical_url="https://medlineplus.gov/lab-tests/creatinine-test/",
        license_or_reuse_note="Public domain / U.S. National Library of Medicine",
        keywords=["creatinine", "kidney function", "renal", "egfr", "waste product"],
    ),
    CuratedReferenceSource(
        id="REF_TSH",
        term="TSH (Thyroid Stimulating Hormone)",
        category="Endocrine",
        definition="A hormone produced by the pituitary gland that directs the thyroid gland how much thyroxine (T4) and triiodothyronine (T3) to produce.",
        what_it_measures="Pituitary signal regulation of thyroid endocrine activity.",
        why_ordered="Primary screening and management tool for hypothyroidism (underactive thyroid) and hyperthyroidism (overactive thyroid).",
        typical_units=["mIU/L", "uIU/mL"],
        reference_note="Standard adult reference intervals generally span 0.4–4.0 mIU/L, though target ranges may be narrower during pregnancy or thyroid hormone replacement therapy.",
        questions_to_ask=[
            "If TSH is slightly outside reference bounds, do we need Free T4 and Free T3 tests?",
            "How does this TSH level correlate with symptoms of sluggishness or temperature sensitivity?",
        ],
        publisher="MedlinePlus / National Library of Medicine",
        canonical_url="https://medlineplus.gov/lab-tests/tsh-thyroid-stimulating-hormone-test/",
        license_or_reuse_note="Public domain / U.S. National Library of Medicine",
        keywords=["tsh", "thyroid", "thyrotropin", "hypothyroidism", "hyperthyroidism"],
    ),
    CuratedReferenceSource(
        id="REF_FREE_T4",
        term="Free T4 (Free Thyroxine)",
        category="Endocrine",
        definition="The active, unbound fraction of thyroxine hormone produced by the thyroid gland that is available to enter body tissues.",
        what_it_measures="Circulating unbound thyroid hormone available for tissue metabolism.",
        why_ordered="Follow-up test when TSH is abnormal or to monitor thyroid medication dosage.",
        typical_units=["ng/dL", "pmol/L"],
        reference_note="Typical reference range in non-pregnant adults is approximately 0.8–1.8 ng/dL (10–23 pmol/L).",
        questions_to_ask=[
            "Does my Free T4 confirm whether my thyroid function is balanced?",
            "Should I take my thyroid medication before or after a blood draw?",
        ],
        publisher="MedlinePlus / National Library of Medicine",
        canonical_url="https://medlineplus.gov/lab-tests/thyroxine-t4-test/",
        license_or_reuse_note="Public domain / U.S. National Library of Medicine",
        keywords=["free t4", "t4", "thyroxine", "thyroid hormone"],
    ),
    CuratedReferenceSource(
        id="REF_BLOOD_PRESSURE",
        term="Blood Pressure (Systolic and Diastolic)",
        category="Cardiovascular",
        definition="The hydrostatic force exerted by circulating blood against the walls of the body's arteries as the heart pumps.",
        what_it_measures="Systolic pressure (top number: peak force during heart contraction) and Diastolic pressure (bottom number: pressure in arteries between beats).",
        why_ordered="Routine vital sign to screen for hypertension, hypotension, and cardiovascular strain.",
        typical_units=["mmHg"],
        reference_note="American Heart Association guidelines define: Normal: <120/<80 mmHg; Elevated: systolic 120-129 and diastolic <80; Stage 1 Hypertension: systolic 130-139 or diastolic 80-89; Stage 2 Hypertension: systolic >=140 or diastolic >=90 mmHg.",
        questions_to_ask=[
            "Should I track home blood pressure readings across mornings and evenings?",
            "Could white-coat effect or cuff size have contributed to higher clinic readings?",
            "What non-pharmacological steps (sodium reduction, physical activity) are most indicated?",
        ],
        publisher="American Heart Association & MedlinePlus",
        canonical_url="https://medlineplus.gov/bloodpressure.html",
        license_or_reuse_note="Public domain / AHA Guidelines",
        keywords=["blood pressure", "bp", "hypertension", "systolic", "diastolic", "hypotension"],
    ),
    CuratedReferenceSource(
        id="REF_VITAMIN_D",
        term="Vitamin D (25-Hydroxyvitamin D)",
        category="Metabolic",
        definition="The primary circulating form of vitamin D, which plays a pivotal role in calcium absorption, bone mineralization, and immune function.",
        what_it_measures="Total circulating 25-hydroxyvitamin D [25(OH)D] in serum.",
        why_ordered="Screens for vitamin D insufficiency or deficiency, osteoporosis, bone density concerns, or malabsorption.",
        typical_units=["ng/mL", "nmol/L"],
        reference_note="Most clinical guidance defines: Deficiency: <20 ng/mL (<50 nmol/L); Insufficiency: 20–29 ng/mL; Sufficient: 30–100 ng/mL.",
        questions_to_ask=[
            "What daily supplement dosage (D3) is appropriate for my verified level?",
            "When should we retest to verify improvement?",
        ],
        publisher="MedlinePlus / National Library of Medicine",
        canonical_url="https://medlineplus.gov/lab-tests/vitamin-d-test/",
        license_or_reuse_note="Public domain / U.S. National Library of Medicine",
        keywords=["vitamin d", "25-hydroxy", "cholecalciferol", "bone health", "vit d"],
    ),
    CuratedReferenceSource(
        id="REF_CMP",
        term="Comprehensive Metabolic Panel (CMP)",
        category="Metabolic",
        definition="A panel of 14 blood tests that gives information about your body's chemical balance, kidney and liver health, electrolytes, and metabolism.",
        what_it_measures="Evaluates Glucose, Calcium, Albumin, Total Protein, Electrolytes (Sodium, Potassium, CO2, Chloride), Kidney tests (BUN, Creatinine), and Liver enzymes (ALP, ALT, AST, Bilirubin).",
        why_ordered="Ordered as part of a routine physical, before surgery, or to monitor medications affecting organ systems.",
        typical_units=["mixed"],
        reference_note="Provides a holistic snapshot; individual analyte variations are interpreted collectively by a clinician rather than in isolation.",
        questions_to_ask=[
            "How do my liver and kidney markers compare with my prior panels?",
            "Are there any electrolyte shifts that warrant dietary or medication review?",
        ],
        publisher="MedlinePlus / National Library of Medicine",
        canonical_url="https://medlineplus.gov/lab-tests/comprehensive-metabolic-panel-cmp/",
        license_or_reuse_note="Public domain / U.S. National Library of Medicine",
        keywords=["cmp", "comprehensive metabolic panel", "metabolic panel", "organ panel"],
    ),
]


def search_curated_reference(query: str, limit: int = 5) -> list[CuratedReferenceSource]:
    """Perform deterministic keyword and full-text search against the curated medical reference catalogue.

    Ranks by keyword matches, title matches, and definition relevance.
    Guarantees reproducible, source-attributed results without any generative hallucinations.
    """
    q_clean = query.strip().lower()
    if not q_clean:
        return CURATED_CATALOGUE[:limit]

    scored_items: list[tuple[int, CuratedReferenceSource]] = []
    tokens = [t for t in q_clean.replace("?", "").replace(",", "").split() if len(t) > 2]

    for item in CURATED_CATALOGUE:
        score = 0
        term_lower = item.term.lower()

        # Exact or substring match in term title
        if q_clean == term_lower:
            score += 100
        elif q_clean in term_lower:
            score += 60
        elif term_lower in q_clean:
            score += 50

        # Keyword matches
        for kw in item.keywords:
            if kw == q_clean:
                score += 80
            elif kw in q_clean or q_clean in kw:
                score += 40

        # Token matches across term, definition, and what_it_measures
        for token in tokens:
            if token in term_lower:
                score += 25
            if token in item.keywords:
                score += 20
            if token in item.category.lower():
                score += 15
            if token in item.definition.lower():
                score += 10
            if token in item.what_it_measures.lower():
                score += 5

        if score > 0:
            scored_items.append((score, item))

    scored_items.sort(key=lambda x: x[0], reverse=True)
    results = [item for score, item in scored_items[:limit]]

    # If no specific tokens matched, return top general matches
    if not results and len(q_clean) > 2:
        for item in CURATED_CATALOGUE:
            if any(t in item.definition.lower() for t in tokens):
                results.append(item)
                if len(results) >= limit:
                    break

    return results


def get_reference_by_id(ref_id: str) -> CuratedReferenceSource | None:
    """Retrieve a single curated reference entry by its stable ID."""
    for item in CURATED_CATALOGUE:
        if item.id.lower() == ref_id.lower():
            return item
    return None

