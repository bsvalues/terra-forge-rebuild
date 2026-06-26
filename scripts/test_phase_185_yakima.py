import json
from pathlib import Path

import pytest

from scripts import seed_yakima


def test_seed_yakima_dry_run_offline(tmp_path, monkeypatch):
    # Provide sample metadata and rows and monkeypatch network calls
    sample_meta = {"name": "AssessorParcels", "fields": [{"name": "PARCEL_ID"}, {"name": "market_value"}]}
    sample_rows = [
        {"PARCEL_ID": "A-1", "market_value": 100000},
        {"PARCEL_ID": "A-2", "market_value": 150000},
    ]

    # Monkeypatch functions on the seed_yakima module (they were imported at module load time)
    monkeypatch.setattr(seed_yakima, "probe_service", lambda url: sample_meta)
    monkeypatch.setattr(seed_yakima, "fetch_all", lambda url, limit=1000: sample_rows)

    out = tmp_path / "yakima_sample.json"
    rc = seed_yakima.run_seed(url="https://mocked.example/arcgis/0", limit=50, out_path=str(out), dry_run=True, vendor="aumentum_ascend")
    assert rc == 0
    assert out.exists(), "Output sample JSON not created"
    data = json.loads(out.read_text(encoding="utf-8"))
    assert "meta" in data and "rows" in data
    assert isinstance(data["rows"], list)
    assert data["stats"]["count"] == 2
