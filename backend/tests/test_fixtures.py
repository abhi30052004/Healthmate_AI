import json
from pathlib import Path

FIX = Path(__file__).resolve().parents[2] / "fixtures" / "synthetic_reports"


def test_five_reports_with_truth_files():
    truths = sorted(FIX.glob("*.truth.json"))
    assert len(truths) == 5
    for t in truths:
        data = json.loads(t.read_text(encoding="utf-8"))
        assert (FIX / data["file"]).exists()
        assert data["observations"]
        for o in data["observations"]:
            assert {"test_name", "value", "unit", "reference_range"} <= o.keys()


def test_includes_scan_and_unit_mismatch():
    truths = [json.loads(p.read_text(encoding="utf-8")) for p in FIX.glob("*.truth.json")]
    assert any(t["file"].endswith(".png") for t in truths)
    units = {o["unit"] for t in truths for o in t["observations"] if o["test_name"] == "Fasting Glucose"}
    assert {"mg/dL", "mmol/L"} <= units
