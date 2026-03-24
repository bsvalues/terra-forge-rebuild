"""
Seed Yakima County (Phase 185) — Aumentum Ascend + Sigma pathway (dry-run)
-----------------------------------------------------------------------
Probe Yakima's ArcGIS parcel layer, perform a schema diff using
`field_alias_loader`, fetch a sample (default 1000 rows), compute a
simple appraisal value distribution, normalise fields, and write a
sample JSON for review.

Usage:
  python scripts/seed_yakima.py --dry-run --limit 1000 --out yakima_sample.json

Requires: `requests`, `python-dotenv` (for env support), optional `supabase` for upsert.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

# local imports
try:
    from scripts.county_registry import COUNTY_REGISTRY
    from scripts.arcgis_adapter import probe_service, fetch_all
    from scripts.field_alias_loader import FieldAliasLoader
except Exception:
    from county_registry import COUNTY_REGISTRY  # type: ignore
    from arcgis_adapter import probe_service, fetch_all  # type: ignore
    from field_alias_loader import FieldAliasLoader  # type: ignore


def _get_yakima_url() -> str:
    entry = COUNTY_REGISTRY.get("yakima")
    if not entry:
        raise RuntimeError("Yakima not in COUNTY_REGISTRY")
    url = entry.get("open_data_url")
    if not url:
        raise RuntimeError("Yakima has no open_data_url in registry")
    return url


def _summary_stats(rows: list[dict[str, Any]]) -> dict[str, Any]:
    vals = [r.get("market_value") or r.get("TOTALVALUE") or r.get("MarketValue") for r in rows]
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
        "mean": sum(nums_sorted) / n,
    }


def _normalise_rows(rows: list[dict[str, Any]], loader: FieldAliasLoader, vendor: str | None) -> list[dict[str, Any]]:
    return [loader.resolve_row(r, vendor) for r in rows]


def _cli() -> None:
    p = argparse.ArgumentParser(description="Seed Yakima (dry-run by default)")
    p.add_argument("--limit", type=int, default=1000)
    p.add_argument("--out", help="Write sample JSON to this path")
    p.add_argument("--dry-run", action="store_true", default=True)
    p.add_argument("--vendor", default="aumentum_ascend", help="Vendor hint for alias resolver")
    args = p.parse_args()
    run_seed(limit=args.limit, out_path=args.out, dry_run=args.dry_run, vendor=args.vendor)


if __name__ == "__main__":
    _cli()


def run_seed(*, url: str | None = None, limit: int = 1000, out_path: str | None = None, dry_run: bool = True, vendor: str | None = "aumentum_ascend") -> int:
    """Run the Yakima seeder logic. Returns exit code 0 on success, 1 on failure.

    If `url` is None, the county registry will be consulted for Yakima's URL.
    """
    try:
        if url is None:
            url = _get_yakima_url()
        print(f"[seed_yakima] Probing: {url}")
        meta = probe_service(url)
        fields = [f["name"] for f in meta.get("fields", [])]
        print(f"[seed_yakima] Layer: {meta.get('name')} | fields: {len(fields)}")

        loader = FieldAliasLoader()
        diff = loader.schema_diff(fields, vendor=vendor)
        print("[seed_yakima] Schema diff coverage:", diff.get("coverage_pct"))

        rows = fetch_all(url, limit=limit)
        norm = _normalise_rows(rows, loader, vendor)
        stats = _summary_stats(norm)

        out_blob = {
            "meta": {"layer_name": meta.get("name"), "coverage": diff.get("coverage_pct"), "appraisal_system": "sigma"},
            "stats": stats,
            "rows": norm[: min(100, len(norm))]
        }

        if out_path:
            Path(out_path).write_text(json.dumps(out_blob, indent=2), encoding="utf-8")
            print(f"[seed_yakima] Wrote sample → {out_path}")

        print(f"[seed_yakima] Fetched {len(rows)} rows; normalised {len(norm)} rows (vendor hint: {vendor})")
        return 0
    except Exception as e:
        print(f"[seed_yakima] ERROR: {e}")
        return 1
