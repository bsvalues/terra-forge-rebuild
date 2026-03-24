"""
Tests for Phase 186 — Thurston and Clark county seed scripts.
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
from scripts import seed_thurston, seed_clark


# ── Registry checks ───────────────────────────────────────────────────────────

def test_thurston_in_registry():
    assert "thurston" in COUNTY_REGISTRY
    assert COUNTY_REGISTRY["thurston"].get("open_data_url")


def test_clark_in_registry():
    assert "clark" in COUNTY_REGISTRY
    assert COUNTY_REGISTRY["clark"].get("open_data_url")


# ── Field alias loader ────────────────────────────────────────────────────────

def test_aumentum_ascend_aliases():
    loader = FieldAliasLoader()
    # resolve() should map a known aumentum_ascend alias to parcel_id
    canon = loader.resolve("Parcel_ID", vendor="aumentum_ascend")
    assert canon == "parcel_id", f"Expected 'parcel_id', got {canon!r}"


def test_harris_pacs_aliases():
    loader = FieldAliasLoader()
    # resolve() should map a known harris_govern_pacs alias to parcel_id
    canon = loader.resolve("prop_id", vendor="harris_govern_pacs")
    assert canon == "parcel_id", f"Expected 'parcel_id', got {canon!r}"


# ── Thurston seed (aumentum_ascend path) ──────────────────────────────────────

def test_thurston_seed_dry_run_offline(tmp_path, monkeypatch):
    sample_meta = {
        "name": "TaxParcels",
        "fields": [
            {"name": "Parcel_ID"},
            {"name": "SitusAddress"},
            {"name": "OwnerName"},
            {"name": "MarketValue"},
            {"name": "AssessedValue"},
            {"name": "Neighborhood"},
        ],
    }
    sample_rows = [
        {"Parcel_ID": "21-01-01234-0", "SitusAddress": "123 Main St", "OwnerName": "Smith, John", "MarketValue": 425000, "AssessedValue": 425000, "Neighborhood": "101"},
        {"Parcel_ID": "21-01-01235-0", "SitusAddress": "456 Oak Ave", "OwnerName": "Jones, Mary", "MarketValue": 310000, "AssessedValue": 310000, "Neighborhood": "101"},
    ]

    monkeypatch.setattr(seed_thurston, "probe_service", lambda url: sample_meta)
    monkeypatch.setattr(seed_thurston, "fetch_all", lambda url, limit=1000: sample_rows)

    out = tmp_path / "thurston_sample.json"
    rc = seed_thurston.run_seed(
        url="https://mocked.example/arcgis/0",
        limit=50,
        out_path=str(out),
        dry_run=True,
        vendor="aumentum_ascend",
    )
    assert rc == 0
    assert out.exists(), "Output sample JSON not created"
    data = json.loads(out.read_text(encoding="utf-8"))
    assert "meta" in data and "rows" in data
    assert isinstance(data["rows"], list)
    assert data["stats"]["count"] == 2


def test_thurston_seed_graceful_probe_failure(tmp_path, monkeypatch):
    """probe_service raises -- should write stub and return 0"""
    monkeypatch.setattr(seed_thurston, "probe_service", lambda url: (_ for _ in ()).throw(ConnectionError("unreachable")))

    out = tmp_path / "thurston_stub.json"
    rc = seed_thurston.run_seed(
        url="https://mocked.example/arcgis/0",
        out_path=str(out),
        dry_run=True,
    )
    assert rc == 0
    assert out.exists()
    data = json.loads(out.read_text(encoding="utf-8"))
    assert data["meta"]["stub"] is True


def test_thurston_seed_graceful_fetch_failure(tmp_path, monkeypatch):
    """probe_service succeeds but fetch_all raises -- stub + rc=0"""
    sample_meta = {"name": "TaxParcels", "fields": [{"name": "Parcel_ID"}]}
    monkeypatch.setattr(seed_thurston, "probe_service", lambda url: sample_meta)
    monkeypatch.setattr(seed_thurston, "fetch_all", lambda url, limit=1000: (_ for _ in ()).throw(TimeoutError("timed out")))

    out = tmp_path / "thurston_stub.json"
    rc = seed_thurston.run_seed(
        url="https://mocked.example/arcgis/0",
        out_path=str(out),
        dry_run=True,
    )
    assert rc == 0
    data = json.loads(out.read_text(encoding="utf-8"))
    assert data["meta"]["stub"] is True


# ── Clark seed (harris_govern_pacs path) ──────────────────────────────────────

def test_clark_seed_dry_run_offline(tmp_path, monkeypatch):
    sample_meta = {
        "name": "AssessorParcels",
        "fields": [
            {"name": "prop_id"},
            {"name": "geo_id"},
            {"name": "situs_1"},
            {"name": "file_as_name"},
            {"name": "market_value"},
            {"name": "assessed_value"},
            {"name": "hood_cd"},
        ],
    }
    sample_rows = [
        {"prop_id": "109876-000", "geo_id": "31233", "situs_1": "789 Pine Blvd", "file_as_name": "Clark, Robert", "market_value": 520000, "assessed_value": 520000, "hood_cd": "200"},
        {"prop_id": "109877-000", "geo_id": "31234", "situs_1": "101 Cedar Ct", "file_as_name": "White, Sandra", "market_value": 380000, "assessed_value": 380000, "hood_cd": "200"},
    ]

    monkeypatch.setattr(seed_clark, "probe_service", lambda url: sample_meta)
    monkeypatch.setattr(seed_clark, "fetch_all", lambda url, limit=1000: sample_rows)

    out = tmp_path / "clark_sample.json"
    rc = seed_clark.run_seed(
        url="https://mocked.example/arcgis/0",
        limit=50,
        out_path=str(out),
        dry_run=True,
        vendor="harris_govern_pacs",
    )
    assert rc == 0
    assert out.exists()
    data = json.loads(out.read_text(encoding="utf-8"))
    assert "meta" in data and "rows" in data
    assert data["stats"]["count"] == 2


def test_clark_seed_graceful_probe_failure(tmp_path, monkeypatch):
    monkeypatch.setattr(seed_clark, "probe_service", lambda url: (_ for _ in ()).throw(ConnectionError("unreachable")))

    out = tmp_path / "clark_stub.json"
    rc = seed_clark.run_seed(
        url="https://mocked.example/arcgis/0",
        out_path=str(out),
        dry_run=True,
    )
    assert rc == 0
    data = json.loads(out.read_text(encoding="utf-8"))
    assert data["meta"]["stub"] is True
