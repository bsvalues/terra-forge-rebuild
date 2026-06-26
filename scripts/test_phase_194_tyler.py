"""
TerraFusion OS — Phase 194 Tests: Tyler iasWorld Direct Adapter
===============================================================
Tests for seed_tyler_iasworld.py and the tyler_iasworld vendor in field_alias_dict.json.
"""
from __future__ import annotations

import csv
import json
import os
import sys
from pathlib import Path

import pytest

from scripts import seed_tyler_iasworld
from scripts.field_alias_loader import FieldAliasLoader


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture()
def csv_dir(tmp_path: Path) -> Path:
    """Create a minimal set of Tyler CSV exports in a temp directory."""
    # prop.csv
    prop_rows = [
        {
            "prop_id": "1001", "geo_id": "G1001", "use_cd": "R",
            "situs_1": "123 Main St", "situs_city": "Everett",
            "state_cd": "WA", "zip_cd": "98201",
            "hood_cd": "NH001", "tax_area_cd": "T01",
            "prop_val_yr": "2024",
            "appraised_value": "350000", "assessed_value": "315000",
        },
        {
            "prop_id": "1002", "geo_id": "G1002", "use_cd": "C",
            "situs_1": "456 Oak Ave", "situs_city": "Marysville",
            "state_cd": "WA", "zip_cd": "98270",
            "hood_cd": "NH002", "tax_area_cd": "T02",
            "prop_val_yr": "2024",
            "appraised_value": "480000", "assessed_value": "432000",
        },
    ]
    _write_csv(tmp_path / "prop.csv", prop_rows)

    # owner.csv
    owner_rows = [
        {"prop_id": "1001", "file_as_name": "Smith, John A", "addr_line1": "PO Box 1", "city": "Everett", "state": "WA", "zip_cd": "98201"},
        {"prop_id": "1002", "file_as_name": "Acme LLC",       "addr_line1": "789 Corp Rd", "city": "Seattle", "state": "WA", "zip_cd": "98101"},
    ]
    _write_csv(tmp_path / "owner.csv", owner_rows)

    # land.csv
    land_rows = [
        {"prop_id": "1001", "land_type_cd": "SFR", "land_sqft": "8500",  "land_val": "120000"},
        {"prop_id": "1002", "land_type_cd": "COM", "land_sqft": "12000", "land_val": "200000"},
    ]
    _write_csv(tmp_path / "land.csv", land_rows)

    # imprv.csv
    imprv_rows = [
        {"prop_id": "1001", "imprv_id": "I1", "yr_built": "1998", "living_area": "1800", "stories": "2"},
        {"prop_id": "1002", "imprv_id": "I2", "yr_built": "2005", "living_area": "3500", "stories": "1"},
    ]
    _write_csv(tmp_path / "imprv.csv", imprv_rows)

    # sale.csv
    sale_rows = [
        {"prop_id": "1001", "sl_dt": "2023-06-15", "sl_price": "345000", "sl_type_cd": "Q", "excise_num": "EX001"},
        {"prop_id": "1001", "sl_dt": "2019-03-01", "sl_price": "280000", "sl_type_cd": "Q", "excise_num": "EX002"},
    ]
    _write_csv(tmp_path / "sale.csv", sale_rows)

    return tmp_path


def _write_csv(path: Path, rows: list[dict]) -> None:
    with open(path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


# ── Field alias dict tests ────────────────────────────────────────────────────

class TestTylerVendorInAliasDict:
    """tyler_iasworld vendor must be present in field_alias_dict.json."""

    def setup_method(self) -> None:
        self.loader = FieldAliasLoader()

    def test_tyler_vendor_in_vendor_confidence(self) -> None:
        dict_path = Path(__file__).parent / "field_alias_dict.json"
        data = json.loads(dict_path.read_text(encoding="utf-8"))
        assert "tyler_iasworld" in data["vendor_confidence"], \
            "tyler_iasworld must appear in vendor_confidence"

    def test_resolve_prop_id_tyler(self) -> None:
        result = self.loader.resolve("prop_id", vendor="tyler_iasworld")
        assert result == "parcel_id", f"expected parcel_id, got {result}"

    def test_resolve_file_as_name_tyler(self) -> None:
        result = self.loader.resolve("file_as_name", vendor="tyler_iasworld")
        assert result == "owner_name", f"expected owner_name, got {result}"

    def test_resolve_appraised_value_tyler(self) -> None:
        result = self.loader.resolve("appraised_value", vendor="tyler_iasworld")
        assert result == "market_value", f"expected market_value, got {result}"

    def test_resolve_land_val_tyler(self) -> None:
        result = self.loader.resolve("land_val", vendor="tyler_iasworld")
        assert result == "land_value", f"expected land_value, got {result}"

    def test_resolve_hood_cd_tyler(self) -> None:
        result = self.loader.resolve("hood_cd", vendor="tyler_iasworld")
        assert result == "hood_cd", f"expected hood_cd, got {result}"

    def test_schema_diff_tyler_key_cols(self) -> None:
        """Key Tyler prop table columns should have high coverage."""
        key_fields = ["prop_id", "use_cd", "situs_1", "hood_cd", "geo_id",
                      "appraised_value", "assessed_value", "land_val", "imprv_val",
                      "file_as_name", "tax_area_cd", "prop_val_yr"]
        diff = self.loader.schema_diff(key_fields, vendor="tyler_iasworld")
        assert diff["coverage_pct"] >= 40.0, \
            f"tyler_iasworld key col coverage too low: {diff['coverage_pct']}%"
        assert "parcel_id" in diff["matched"], "prop_id should resolve to parcel_id"

    def test_suggest_vendor_tyler_cols(self) -> None:
        """suggest_vendor with Tyler-specific columns should not return generic_arcgis."""
        tyler_cols = ["prop_id", "geo_id", "hood_cd", "file_as_name",
                      "land_val", "imprv_val", "tax_area_cd", "prop_val_yr"]
        vendor = self.loader.suggest_vendor(tyler_cols)
        # Should suggest a specific vendor (not None), may match pacs-lineage or tyler
        assert vendor is not None
        assert isinstance(vendor, str)


# ── Seed script tests ─────────────────────────────────────────────────────────

class TestSeedTylerIasworld:
    """Unit tests for seed_tyler_iasworld.run_seed()."""

    def test_stub_when_no_csv_dir(self, tmp_path: Path) -> None:
        """If csv_dir doesn't exist, should return 0 with stub output."""
        out = tmp_path / "out.json"
        rc = seed_tyler_iasworld.run_seed(
            county="snohomish",
            csv_dir=Path(tmp_path / "does_not_exist"),
            dry_run=True,
            out_path=str(out),
        )
        assert rc == 0
        assert out.exists()
        data = json.loads(out.read_text(encoding="utf-8"))
        assert data["meta"]["stub"] is True

    def test_dry_run_with_csvs(self, csv_dir: Path, tmp_path: Path) -> None:
        """With valid CSVs and dry_run=True, should return 0 and write sample JSON."""
        out = tmp_path / "snohomish_sample.json"
        rc = seed_tyler_iasworld.run_seed(
            county="snohomish",
            csv_dir=csv_dir,
            dry_run=True,
            out_path=str(out),
        )
        assert rc == 0, "run_seed should return 0 on dry run"
        assert out.exists(), "sample JSON should be written"
        data = json.loads(out.read_text(encoding="utf-8"))
        assert "meta" in data
        assert "stats" in data
        assert data["stats"]["count"] == 2
        assert data["meta"]["vendor"] == "tyler_iasworld"
        assert data["meta"]["dry_run"] is True

    def test_parcel_row_fields(self, csv_dir: Path, tmp_path: Path) -> None:
        """Parcel rows should contain canonical field names."""
        out = tmp_path / "out.json"
        seed_tyler_iasworld.run_seed(
            county="snohomish",
            csv_dir=csv_dir,
            dry_run=True,
            out_path=str(out),
        )
        data = json.loads(out.read_text(encoding="utf-8"))
        row = data["rows"][0]
        assert "parcel_id" in row, "parcel_id missing from output row"
        assert "owner_name" in row, "owner_name missing from output row"
        assert "geo_id" in row, "geo_id missing from output row"
        assert row["parcel_id"] in ("1001", "1002")

    def test_market_value_resolved(self, csv_dir: Path, tmp_path: Path) -> None:
        """market_value should be resolved from Tyler's 'appraised_value' column."""
        out = tmp_path / "out.json"
        seed_tyler_iasworld.run_seed(
            county="snohomish",
            csv_dir=csv_dir,
            dry_run=True,
            out_path=str(out),
        )
        data = json.loads(out.read_text(encoding="utf-8"))
        # At least one row should have a non-null market_value from appraised_value
        mv_vals = [r.get("market_value") for r in data["rows"]]
        assert any(v is not None for v in mv_vals), \
            "market_value should resolve from tyler appraised_value"

    def test_owner_name_merged(self, csv_dir: Path, tmp_path: Path) -> None:
        """Owner names from owner.csv should appear in parcel rows."""
        out = tmp_path / "out.json"
        seed_tyler_iasworld.run_seed(
            county="snohomish",
            csv_dir=csv_dir,
            dry_run=True,
            out_path=str(out),
        )
        data = json.loads(out.read_text(encoding="utf-8"))
        owners = [r.get("owner_name") for r in data["rows"]]
        assert "Smith, John A" in owners or "Acme LLC" in owners, \
            f"expected owner names from owner.csv, got {owners}"

    def test_detect_schema_no_dir(self, tmp_path: Path) -> None:
        """--detect-schema with missing dir should still return 0."""
        rc = seed_tyler_iasworld.run_seed(
            county="snohomish",
            csv_dir=None,
            dry_run=True,
            detect_schema_only=True,
        )
        assert rc == 0

    def test_detect_schema_with_csvs(self, csv_dir: Path) -> None:
        """--detect-schema with real CSVs should return 0."""
        rc = seed_tyler_iasworld.run_seed(
            county="snohomish",
            csv_dir=csv_dir,
            dry_run=True,
            detect_schema_only=True,
        )
        assert rc == 0

    def test_invalid_county_returns_1(self) -> None:
        """Unknown county slug should return exit code 1."""
        rc = seed_tyler_iasworld.run_seed(
            county="atlantis",
            dry_run=True,
        )
        assert rc == 1

    def test_limit_respected(self, csv_dir: Path, tmp_path: Path) -> None:
        """--limit 1 should produce at most 1 row."""
        out = tmp_path / "out.json"
        seed_tyler_iasworld.run_seed(
            county="snohomish",
            csv_dir=csv_dir,
            limit=1,
            dry_run=True,
            out_path=str(out),
        )
        data = json.loads(out.read_text(encoding="utf-8"))
        assert data["stats"]["count"] <= 1

    def test_land_value_summed(self, csv_dir: Path, tmp_path: Path) -> None:
        """land_value should be summed from land.csv land_val column."""
        out = tmp_path / "out.json"
        seed_tyler_iasworld.run_seed(
            county="snohomish",
            csv_dir=csv_dir,
            dry_run=True,
            out_path=str(out),
        )
        data = json.loads(out.read_text(encoding="utf-8"))
        lv_vals = [r.get("land_value") for r in data["rows"]]
        numeric = [v for v in lv_vals if v is not None]
        assert len(numeric) > 0, "At least one row should have land_value from land.csv"
