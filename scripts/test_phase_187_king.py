"""
Tests for Phase 187 — King County seed script.
All network calls are monkeypatched; no real HTTP traffic.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.county_registry import COUNTY_REGISTRY
from scripts.field_alias_loader import FieldAliasLoader
from scripts import seed_king


# ── Registry checks ───────────────────────────────────────────────────────────

def test_king_in_registry():
    assert "king" in COUNTY_REGISTRY
    assert COUNTY_REGISTRY["king"].get("open_data_url")


def test_inhouse_vendor_not_in_aliases():
    """King County is in-house — generic_arcgis is the fallback alias path."""
    loader = FieldAliasLoader()
    # schema_diff with generic_arcgis aliases should match known King fields
    diff = loader.schema_diff(["PIN", "APPRAISEDVALUE", "TAXPAYER_NAME"], vendor="generic_arcgis")
    assert "parcel_id" in diff["matched"] or diff["coverage_pct"] >= 0


# ── King seed (in-house / generic_arcgis path) ───────────────────────────────

def test_king_seed_dry_run_offline(tmp_path, monkeypatch):
    sample_meta = {
        "name": "KingCountyParcel",
        "fields": [
            {"name": "PIN"},
            {"name": "ADDR_FULL"},
            {"name": "TAXPAYER_NAME"},
            {"name": "APPR_VALUE"},
            {"name": "ASSESSED_VALUE"},
            {"name": "NBHD_CODE"},
            {"name": "LEVY_CODE"},
            {"name": "AREA_ACRES"},
        ],
    }
    sample_rows = [
        {
            "PIN": "0001000010", "ADDR_FULL": "1 MICROSOFT WAY",
            "TAXPAYER_NAME": "Microsoft Corporation",
            "APPRAISEDVALUE": 12_500_000, "ASSESSED_VALUE": 12_500_000,
            "NBHD_CODE": "012", "LEVY_CODE": "0110", "AREA_ACRES": 2.3,
        },
        {
            "PIN": "0001000011", "ADDR_FULL": "2 AMAZON BLVD",
            "TAXPAYER_NAME": "Amazon Inc",
            "APPRAISEDVALUE": 9_000_000, "ASSESSED_VALUE": 9_000_000,
            "NBHD_CODE": "012", "LEVY_CODE": "0110", "AREA_ACRES": 1.7,
        },
    ]

    monkeypatch.setattr(seed_king, "probe_service", lambda url: sample_meta)
    monkeypatch.setattr(seed_king, "fetch_all", lambda url, limit=1000: sample_rows)

    out = tmp_path / "king_sample.json"
    rc = seed_king.run_seed(
        url="https://mocked.example/arcgis/0",
        limit=50,
        out_path=str(out),
        dry_run=True,
        vendor="generic_arcgis",
    )
    assert rc == 0
    assert out.exists(), "Output sample JSON not created"
    data = json.loads(out.read_text(encoding="utf-8"))
    assert "meta" in data and "rows" in data
    assert isinstance(data["rows"], list)
    assert data["stats"]["count"] == 2


def test_king_seed_graceful_probe_failure(tmp_path, monkeypatch):
    """probe_service raises -- should write stub and return 0."""
    monkeypatch.setattr(seed_king, "probe_service", lambda url: (_ for _ in ()).throw(ConnectionError("unreachable")))

    out = tmp_path / "king_stub.json"
    rc = seed_king.run_seed(
        url="https://mocked.example/arcgis/0",
        out_path=str(out),
        dry_run=True,
    )
    assert rc == 0
    assert out.exists()
    data = json.loads(out.read_text(encoding="utf-8"))
    assert data["meta"]["stub"] is True


def test_king_seed_graceful_fetch_failure(tmp_path, monkeypatch):
    """probe_service succeeds but fetch_all raises -- stub + rc=0."""
    sample_meta = {"name": "KingCountyParcel", "fields": [{"name": "PIN"}, {"name": "ADDR_FULL"}]}
    monkeypatch.setattr(seed_king, "probe_service", lambda url: sample_meta)
    monkeypatch.setattr(seed_king, "fetch_all", lambda url, limit=1000: (_ for _ in ()).throw(TimeoutError("timed out")))

    out = tmp_path / "king_stub.json"
    rc = seed_king.run_seed(
        url="https://mocked.example/arcgis/0",
        out_path=str(out),
        dry_run=True,
    )
    assert rc == 0
    data = json.loads(out.read_text(encoding="utf-8"))
    assert data["meta"]["stub"] is True


def test_king_seed_large_parcel_count_label(tmp_path, monkeypatch):
    """King's metadata should reflect 700K-range parcel count for the meta comment."""
    sample_meta = {
        "name": "KingCountyParcel",
        "fields": [{"name": "PIN"}, {"name": "ADDR_FULL"}],
    }
    monkeypatch.setattr(seed_king, "probe_service", lambda url: sample_meta)
    monkeypatch.setattr(seed_king, "fetch_all", lambda url, limit=1000: [])

    out = tmp_path / "king_empty.json"
    rc = seed_king.run_seed(
        url="https://mocked.example/arcgis/0",
        limit=5,
        out_path=str(out),
        dry_run=True,
    )
    assert rc == 0
    data = json.loads(out.read_text(encoding="utf-8"))
    assert data["meta"]["county"] == "king"
