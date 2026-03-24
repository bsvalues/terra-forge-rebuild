"""
Seed Franklin County (Phase 184) — Aumentum T2 (TerraScan 2 lineage) pathway
------------------------------------------------------------------------------
Franklin County uses Aumentum Technologies T2 — the fourth CAMA vendor path
after Harris Govern PACS (Benton), Aumentum Ascend/Sigma (Yakima), and in-house
(King). T2 descends from TerraScan 2 → Tyler Technologies → Aumentum.

Workflow:
  1. Probe the Franklin ArcGIS Feature Service for layer metadata + field list.
  2. Run schema_diff via field_alias_loader to compute T2 coverage score.
  3. Fetch sample rows, normalise to canonical schema.
  4. Compute simple value distribution stats.
  5. Write sample JSON for review.

Usage:
  python scripts/seed_franklin.py --dry-run --limit 1000
  python scripts/seed_franklin.py --out franklin_sample.json --limit 500
  python scripts/seed_franklin.py --probe   (metadata only, no rows)

Requires: requests, python-dotenv
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

# ── local imports ──────────────────────────────────────────────────────────────
try:
    from scripts.county_registry import COUNTY_REGISTRY
    from scripts.arcgis_adapter import probe_service, fetch_all
    from scripts.field_alias_loader import FieldAliasLoader
except Exception:
    from county_registry import COUNTY_REGISTRY  # type: ignore
    from arcgis_adapter import probe_service, fetch_all  # type: ignore
    from field_alias_loader import FieldAliasLoader  # type: ignore

_VENDOR = "aumentum_t2"


def _get_franklin_url() -> str:
    entry = COUNTY_REGISTRY.get("franklin")
    if not entry:
        raise RuntimeError("Franklin not in COUNTY_REGISTRY")
    url = entry.get("open_data_url")
    if not url:
        raise RuntimeError("Franklin has no open_data_url in registry")
    return url


def _summary_stats(rows: list[dict[str, Any]]) -> dict[str, Any]:
    vals = [
        r.get("market_value")
        or r.get("TOTALVALUE")
        or r.get("TotalValue")
        or r.get("MKTVALUE")
        for r in rows
    ]
    nums = [v for v in vals if isinstance(v, (int, float))]
    if not nums:
        return {"count": 0}
    nums_sorted = sorted(nums)
    n = len(nums_sorted)
    return {
        "count": n,
        "min": nums_sorted[0],
        "max": nums_sorted[-1],
        "median": nums_sorted[n // 2],
        "mean": round(sum(nums_sorted) / n, 2),
    }


def _normalise_rows(
    rows: list[dict[str, Any]], loader: FieldAliasLoader, vendor: str | None
) -> list[dict[str, Any]]:
    return [loader.resolve_row(r, vendor) for r in rows]


def _stub_output(reason: str) -> dict[str, Any]:
    """Empty-but-valid output blob used when the network is unreachable."""
    return {
        "meta": {
            "layer_name": None,
            "coverage": None,
            "appraisal_system": _VENDOR,
            "stub": True,
            "reason": reason,
        },
        "stats": {"count": 0},
        "rows": [],
    }


def run_seed(
    *,
    url: str | None = None,
    limit: int = 1000,
    out_path: str | None = None,
    dry_run: bool = True,
    vendor: str | None = _VENDOR,
    probe_only: bool = False,
) -> int:
    """
    Run the Franklin County seeder.  Returns 0 on success or graceful
    degradation (network unavailable).  Returns 1 on fatal errors only.
    """
    try:
        if url is None:
            url = _get_franklin_url()

        print(f"[seed_franklin] Probing: {url}")

        try:
            meta = probe_service(url)
        except Exception as probe_err:
            print(f"[seed_franklin] WARNING — probe failed: {probe_err}")
            print("[seed_franklin] Writing stub output (service unreachable).")
            blob = _stub_output(str(probe_err))
            if out_path:
                Path(out_path).write_text(json.dumps(blob, indent=2), encoding="utf-8")
                print(f"[seed_franklin] Wrote stub -> {out_path}")
            return 0

        fields = [f["name"] for f in meta.get("fields", [])]
        print(f"[seed_franklin] Layer: {meta.get('name')} | fields: {len(fields)}")

        loader = FieldAliasLoader()
        diff = loader.schema_diff(fields, vendor=vendor)
        coverage = diff.get("coverage_pct")
        print(f"[seed_franklin] Schema diff coverage ({vendor}): {coverage}%")

        unmatched = diff.get("unmatched", [])
        if unmatched:
            print(f"[seed_franklin] Unmatched fields ({len(unmatched)}): {unmatched[:10]}")

        if probe_only:
            print("[seed_franklin] --probe flag set; skipping row fetch.")
            return 0

        try:
            rows = fetch_all(url, limit=limit)
        except Exception as fetch_err:
            print(f"[seed_franklin] WARNING — fetch failed: {fetch_err}")
            blob = _stub_output(str(fetch_err))
            blob["meta"]["layer_name"] = meta.get("name")
            blob["meta"]["coverage"] = coverage
            if out_path:
                Path(out_path).write_text(json.dumps(blob, indent=2), encoding="utf-8")
            return 0

        norm = _normalise_rows(rows, loader, vendor)
        stats = _summary_stats(norm)

        out_blob = {
            "meta": {
                "layer_name": meta.get("name"),
                "coverage": coverage,
                "appraisal_system": _VENDOR,
                "unmatched_fields": unmatched[:20],
            },
            "stats": stats,
            "rows": norm[: min(100, len(norm))],
        }

        if out_path:
            Path(out_path).write_text(json.dumps(out_blob, indent=2), encoding="utf-8")
            print(f"[seed_franklin] Wrote sample -> {out_path}")

        print(
            f"[seed_franklin] Fetched {len(rows)} rows; "
            f"normalised {len(norm)} rows (vendor: {vendor})"
        )
        return 0

    except Exception as e:
        print(f"[seed_franklin] ERROR: {e}")
        return 1


def _cli() -> None:
    p = argparse.ArgumentParser(
        description="Seed Franklin County from ArcGIS (Aumentum T2 vendor path)"
    )
    p.add_argument("--limit", type=int, default=1000, help="Max rows to fetch")
    p.add_argument("--out", help="Write sample JSON to this file path")
    p.add_argument("--dry-run", action="store_true", default=True,
                   help="Fetch + normalise but do not write to Supabase")
    p.add_argument("--probe", action="store_true", default=False,
                   help="Probe service metadata only; skip row fetch")
    p.add_argument("--vendor", default=_VENDOR,
                   help="Vendor hint for field alias resolver")
    p.add_argument("--url", default=None,
                   help="Override Franklin ArcGIS URL (default: county registry)")
    args = p.parse_args()
    sys.exit(
        run_seed(
            url=args.url,
            limit=args.limit,
            out_path=args.out,
            dry_run=args.dry_run,
            vendor=args.vendor,
            probe_only=args.probe,
        )
    )


if __name__ == "__main__":
    _cli()

