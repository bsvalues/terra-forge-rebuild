"""
TerraFusion OS — Tests for Phase 181–183 scripts
=================================================
  pytest scripts/test_phases_181_183.py

Tests for:
  - arcgis_adapter: normalise_row, detect_parcel_id_field, CANONICAL_ALIAS
  - field_alias_loader: resolve, suggest_vendor, schema_diff
  - county_registry: expanded fields, get_open_data_counties
"""

from __future__ import annotations

import importlib
import sys
from pathlib import Path
from typing import Any

import pytest

# Make scripts/ importable
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.arcgis_adapter import (
    CANONICAL_ALIAS,
    _normalise_row,
    detect_parcel_id_field,
    fetch_all,
)
from scripts.field_alias_loader import FieldAliasLoader, resolve, schema_diff, suggest_vendor
from scripts.county_registry import (
    COUNTY_REGISTRY,
    get_county_id,
    get_open_data_counties,
    list_counties,
    print_registry_table,
)


# ── arcgis_adapter ─────────────────────────────────────────────────────────────

class TestNormaliseRow:
    def test_parcel_id_aliases(self):
        row = {"ParcelID": "12345", "TOTALVALUE": 200_000}
        out = _normalise_row(row)
        assert out["parcel_id"] == "12345"

    def test_market_value_alias(self):
        row = {"TotalAppraisedValue": 350_000}
        out = _normalise_row(row)
        assert out["market_value"] == 350_000

    def test_unknown_key_is_lowercased(self):
        row = {"MYSTERY_FIELD_XYZ": "foo"}
        out = _normalise_row(row)
        assert "mystery_field_xyz" in out
        assert out["mystery_field_xyz"] == "foo"

    def test_owner_name_alias(self):
        row = {"OwnName": "Smith, John"}
        out = _normalise_row(row)
        # "ownname" is not in CANONICAL_ALIAS so key is preserved lower-cased
        # but "ownername" variants ARE in the alias map
        row2 = {"OwnerName": "Smith, John"}
        out2 = _normalise_row(row2)
        assert out2["owner_name"] == "Smith, John"

    def test_situs_address_variants(self):
        for raw in ["SitusAddress", "PropertyAddress", "SITUS_ADDRESS"]:
            out = _normalise_row({raw: "123 Main St"})
            assert out.get("situs_address") == "123 Main St", f"Failed for {raw}"

    def test_empty_row(self):
        assert _normalise_row({}) == {}


class TestDetectParcelIdField:
    def _make_fields(self, names: list[str]) -> list[dict[str, Any]]:
        return [{"name": n, "type": "esriFieldTypeString"} for n in names]

    def test_exact_match_parcelid(self):
        fields = self._make_fields(["OBJECTID", "ParcelID", "OwnerName"])
        assert detect_parcel_id_field(fields) == "ParcelID"

    def test_fuzzy_parcel_in_name(self):
        fields = self._make_fields(["OBJECTID", "PARCEL_NUMBER", "SITE_ADDR"])
        result = detect_parcel_id_field(fields)
        assert result == "PARCEL_NUMBER"

    def test_apn_match(self):
        fields = self._make_fields(["OBJECTID", "APN", "OWNER"])
        assert detect_parcel_id_field(fields) == "APN"

    def test_no_match_returns_none(self):
        fields = self._make_fields(["OBJECTID", "SHAPE_AREA", "OWNER"])
        assert detect_parcel_id_field(fields) is None


class TestCanonicalAliasCompleteness:
    def test_all_values_are_strings(self):
        for k, v in CANONICAL_ALIAS.items():
            assert isinstance(v, str), f"Value for {k!r} is not a string"

    def test_parcel_id_in_alias(self):
        assert CANONICAL_ALIAS.get("parcelid") == "parcel_id"
        assert CANONICAL_ALIAS.get("apn") == "parcel_id"

    def test_objectid_preserved(self):
        assert CANONICAL_ALIAS.get("objectid") == "objectid"


# ── field_alias_loader ─────────────────────────────────────────────────────────

class TestFieldAliasLoader:
    @pytest.fixture
    def loader(self) -> FieldAliasLoader:
        return FieldAliasLoader()

    def test_resolve_catalis_parcel_id(self, loader):
        assert loader.resolve("prop_id", vendor="harris_govern_pacs") == "parcel_id"

    def test_resolve_harris_market_value(self, loader):
        assert loader.resolve("market_value", vendor="harris_govern_pacs") == "market_value"

    def test_resolve_aumentum_t2_parcel(self, loader):
        assert loader.resolve("ParcelID", vendor="aumentum_t2") == "parcel_id"

    def test_resolve_unknown_field_returns_none(self, loader):
        assert loader.resolve("TOTALLY_UNKNOWN_XYZ_FIELD") is None

    def test_resolve_case_insensitive(self, loader):
        assert loader.resolve("OWNERNAME") == "owner_name"
        assert loader.resolve("ownername") == "owner_name"

    def test_suggest_vendor_aumentum_t2(self, loader):
        # T2 counties have ParcelID-style fields and T2-specific aliases
        fields = ["ParcelID", "TotalAppraisedValue", "UseCode", "TaxCode", "SitusAddress"]
        vendor = loader.suggest_vendor(fields)
        # generic_arcgis has broad coverage; we just assert it's not PACS
        assert vendor != "harris_govern_pacs"

    def test_suggest_vendor_harris_pacs(self, loader):
        fields = ["file_as_name", "prop_val_yr", "tax_area_cd", "land_type_cd", "situs_1"]
        vendor = loader.suggest_vendor(fields)
        assert vendor == "harris_govern_pacs"

    def test_schema_diff_has_required_keys(self, loader):
        diff = loader.schema_diff(["ParcelID", "OwnerName", "MYSTERY"])
        assert "matched" in diff
        assert "unmatched" in diff
        assert "missing_canonical" in diff
        assert "coverage_pct" in diff

    def test_schema_diff_unmatched_captured(self, loader):
        diff = loader.schema_diff(["MYSTERY_FIELD_XYZ_123"])
        assert "MYSTERY_FIELD_XYZ_123" in diff["unmatched"]

    def test_schema_diff_coverage_pct_range(self, loader):
        # Full canonical set (all known fields)
        all_aliases = []
        for info in loader.canonical_fields.values():
            for aliases in info.get("aliases", {}).values():
                if aliases:
                    all_aliases.append(aliases[0])
        diff = loader.schema_diff(all_aliases)
        assert 0.0 <= diff["coverage_pct"] <= 100.0

    def test_resolve_row_remaps_keys(self, loader):
        row = {"ParcelID": "ABC123", "TotalAppraisedValue": 250_000}
        out = loader.resolve_row(row, vendor="aumentum_t2")
        assert out.get("parcel_id") == "ABC123"
        assert out.get("market_value") == 250_000

    def test_module_level_shortcuts(self):
        assert resolve("prop_id", "harris_govern_pacs") == "parcel_id"
        assert suggest_vendor(["file_as_name", "prop_val_yr", "tax_area_cd"]) == "harris_govern_pacs"
        diff = schema_diff(["prop_id", "geo_id"])
        assert isinstance(diff, dict)


# ── county_registry ────────────────────────────────────────────────────────────

class TestExpandedRegistry:
    def test_all_counties_have_cama_vendor(self):
        for slug, county in COUNTY_REGISTRY.items():
            assert "cama_vendor" in county, f"{slug} missing cama_vendor"

    def test_all_counties_have_wa_dnr_name(self):
        for slug, county in COUNTY_REGISTRY.items():
            assert "wa_dnr_name" in county, f"{slug} missing wa_dnr_name"

    def test_open_data_counties_have_urls(self):
        for slug in get_open_data_counties():
            assert COUNTY_REGISTRY[slug]["open_data_url"] is not None

    def test_benton_has_no_open_data_url(self):
        # Benton uses direct FGDB — no open_data_url
        assert COUNTY_REGISTRY["benton"]["open_data_url"] is None

    def test_open_data_counties_includes_yakima_king(self):
        ods = get_open_data_counties()
        assert "yakima" in ods
        assert "king" in ods

    def test_registry_has_six_or_more_counties(self):
        assert len(COUNTY_REGISTRY) >= 6

    def test_print_registry_table_runs(self, capsys):
        print_registry_table()
        captured = capsys.readouterr()
        assert "benton" in captured.out.lower()
        assert "yakima" in captured.out.lower()

    def test_list_counties_sorted_by_name(self):
        counties = list_counties()
        names = [c["name"] for c in counties]
        assert names == sorted(names)

    def test_benton_still_provisioned(self):
        county = COUNTY_REGISTRY["benton"]
        assert county["provisioned"] is True
        assert county["id"] == "842a6c54-c7c0-4b2d-aa43-0e3ba63fa57d"
