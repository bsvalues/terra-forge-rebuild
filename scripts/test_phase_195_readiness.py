"""
TerraFusion OS — Phase 195 Tests: County Readiness Report
=========================================================
Tests for generate_readiness_report.py.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from scripts import generate_readiness_report as grr


# ── Fixtures ──────────────────────────────────────────────────────────────────

SAMPLE_JSON = {
    "meta": {"county": "yakima", "vendor": "aumentum_ascend"},
    "stats": {"count": 500, "min": 45000, "max": 1200000, "median": 280000, "mean": 310500.0},
    "rows": [
        {"parcel_id": "123", "market_value": 280000, "owner_name": "Jones, Bob",
         "situs_address": "789 Valley Rd", "use_cd": "R", "hood_cd": "NH03"},
    ],
}


# ── build_report unit tests ────────────────────────────────────────────────────

class TestBuildReport:

    def test_report_returns_string(self) -> None:
        report = grr.build_report("benton")
        assert isinstance(report, str)
        assert len(report) > 100

    def test_report_contains_county_name(self) -> None:
        report = grr.build_report("benton")
        assert "Benton County" in report

    def test_report_contains_vendor(self) -> None:
        report = grr.build_report("benton")
        assert "Harris Govern PACS" in report or "harris_govern_pacs" in report

    def test_report_contains_fips(self) -> None:
        report = grr.build_report("benton")
        assert "53005" in report

    def test_report_has_schema_section(self) -> None:
        report = grr.build_report("benton")
        assert "Schema Coverage" in report

    def test_report_has_next_steps(self) -> None:
        report = grr.build_report("benton")
        assert "Recommended Next Steps" in report

    def test_report_has_seed_cli(self) -> None:
        report = grr.build_report("benton")
        assert "Seed CLI" in report

    def test_report_with_sample_json(self) -> None:
        report = grr.build_report("yakima", sample_json=SAMPLE_JSON)
        assert "Yakima County" in report
        assert "500" in report  # parcel count
        assert "280,000" in report or "280000" in report  # median value

    def test_report_key_fields_table(self) -> None:
        report = grr.build_report("yakima", sample_json=SAMPLE_JSON)
        # Key fields table should be present
        assert "parcel_id" in report
        assert "owner_name" in report
        assert "market_value" in report

    def test_all_registry_counties_generate(self) -> None:
        """Every county in the registry should produce a report without error."""
        from scripts.county_registry import COUNTY_REGISTRY
        for slug in COUNTY_REGISTRY:
            try:
                report = grr.build_report(slug)
                assert len(report) > 50, f"{slug} report too short"
            except Exception as e:
                pytest.fail(f"build_report('{slug}') raised: {e}")

    def test_unknown_county_raises(self) -> None:
        with pytest.raises(ValueError, match="not found in COUNTY_REGISTRY"):
            grr.build_report("narnia")

    def test_tier1_county_has_direct_note(self) -> None:
        report = grr.build_report("benton")
        assert "Tier 1" in report or "Full CAMA" in report

    def test_tier2_county_note(self) -> None:
        report = grr.build_report("yakima")
        assert "Tier 2" in report or "Open Data" in report

    def test_coverage_bar_present(self) -> None:
        report = grr.build_report("benton")
        assert "█" in report or "░" in report  # ASCII coverage bar

    def test_provisioned_status(self) -> None:
        benton_report = grr.build_report("benton")
        assert "✅ Yes" in benton_report  # benton is provisioned

        yakima_report = grr.build_report("yakima")
        assert "❌ No" in yakima_report  # yakima not provisioned


# ── generate_report file output test ──────────────────────────────────────────

class TestGenerateReportFileOutput:

    def test_file_output(self, tmp_path: Path) -> None:
        out = tmp_path / "benton_report.md"
        result = grr.generate_report("benton", out_path=str(out))
        assert out.exists()
        content = out.read_text(encoding="utf-8")
        assert "Benton County" in content
        assert result == content

    def test_sample_json_path(self, tmp_path: Path) -> None:
        sample_path = tmp_path / "yakima_sample.json"
        sample_path.write_text(json.dumps(SAMPLE_JSON), encoding="utf-8")
        out = tmp_path / "yakima_report.md"
        grr.generate_report(
            "yakima",
            sample_json_path=str(sample_path),
            out_path=str(out),
        )
        content = out.read_text(encoding="utf-8")
        assert "500" in content  # sample parcel count from fixture

    def test_missing_sample_json_graceful(self, tmp_path: Path) -> None:
        """Non-existent sample_json should not crash — just warn."""
        out = tmp_path / "out.md"
        result = grr.generate_report(
            "yakima",
            sample_json_path="/nonexistent/path.json",
            out_path=str(out),
        )
        assert out.exists()
        assert len(result) > 50


# ── Helper function tests ──────────────────────────────────────────────────────

class TestHelpers:

    def test_coverage_label(self) -> None:
        assert grr._coverage_label(85.0) == "Excellent"
        assert grr._coverage_label(65.0) == "Good"
        assert grr._coverage_label(45.0) == "Fair"
        assert grr._coverage_label(20.0) == "Poor"

    def test_value_bar_length(self) -> None:
        bar = grr._value_bar(50.0, width=20)
        assert "50.0%" in bar
        # Inner content should be width chars
        inner = bar[1:bar.index("]")]
        assert len(inner) == 20

    def test_field_status_present(self) -> None:
        matched = {"parcel_id": "prop_id", "owner_name": "file_as_name"}
        assert grr._field_status(matched, "parcel_id") == "✅"
        assert grr._field_status(matched, "hood_cd") == "❌"

    def test_get_tier(self) -> None:
        from scripts.county_registry import COUNTY_REGISTRY
        benton = COUNTY_REGISTRY["benton"]
        yakima = COUNTY_REGISTRY["yakima"]
        assert grr._get_tier(benton) == 1
        assert grr._get_tier(yakima) == 2
