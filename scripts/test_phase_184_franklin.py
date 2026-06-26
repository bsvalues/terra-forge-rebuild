"""
Tests for Phase 184 — Franklin seed script (dry-run path)
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.field_alias_loader import FieldAliasLoader
from scripts.county_registry import COUNTY_REGISTRY


def test_franklin_in_registry():
    assert "franklin" in COUNTY_REGISTRY
    assert COUNTY_REGISTRY["franklin"].get("open_data_url")


def test_field_alias_loader_can_load():
    loader = FieldAliasLoader()
    # common canonical present
    assert "parcel_id" in loader.canonical_fields


def test_seed_franklin_cli_dry_run(tmp_path):
    out = tmp_path / "franklin_sample.json"
    # Run the CLI in dry-run mode; ensure it writes a sample file
    rc = subprocess.run([sys.executable, "scripts/seed_franklin.py", "--out", str(out), "--limit", "10"], check=False)
    assert rc.returncode == 0
    assert out.exists()
    j = json.loads(out.read_text(encoding="utf-8"))
    assert "meta" in j and "rows" in j
    assert isinstance(j["rows"], list)
