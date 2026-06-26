"""
Seed King County (Phase 187) — In-house custom system (largest WA county)
--------------------------------------------------------------------------
King County uses an in-house custom assessment system (since 1995) and is the
largest WA county with ~701K parcels. Public parcel data is available via
ArcGIS. Field names are non-standard; suggest_vendor() will fall back to
generic_arcgis, which is the correct path for in-house systems.

Usage:
  python scripts/seed_king.py --dry-run --limit 1000
  python scripts/seed_king.py --out king_sample.json
  python scripts/seed_king.py --probe

Requires: requests, python-dotenv
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

try:
    from scripts.county_registry import COUNTY_REGISTRY
    from scripts.arcgis_adapter import probe_service, fetch_all
    from scripts.field_alias_loader import FieldAliasLoader
except Exception:
    from county_registry import COUNTY_REGISTRY  # type: ignore
    from arcgis_adapter import probe_service, fetch_all  # type: ignore
    from field_alias_loader import FieldAliasLoader  # type: ignore

_COUNTY = "king"


def _get_url() -> str:
    entry = COUNTY_REGISTRY.get(_COUNTY)
    if not entry:
        raise RuntimeError(f"{_COUNTY} not in COUNTY_REGISTRY")
    url = entry.get("open_data_url")
    if not url:
        raise RuntimeError(f"{_COUNTY} has no open_data_url in county registry")
    return url


def _summary_stats(rows: list[dict[str, Any]]) -> dict[str, Any]:
    vals = [
        r.get("market_value")
        or r.get("AppraisedValue")
        or r.get("APPRAISED_VALUE")
        or r.get("TOTAPPR")
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


def _stub_output(reason: str, vendor: str | None = None) -> dict[str, Any]:
    return {
        "meta": {
            "county": _COUNTY,
            "layer_name": None,
            "coverage": None,
            "detected_vendor": vendor,
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
    vendor: str | None = None,
    probe_only: bool = False,
) -> int:
    """
    Seed King County. Uses generic_arcgis alias path (in-house system has
    no standard CAMA field names). suggest_vendor() auto-detects.
    Returns 0 on success or graceful degradation. Returns 1 on fatal errors.
    """
    try:
        if url is None:
            url = _get_url()

        print(f"[seed_king] Probing: {url}")

        try:
            meta = probe_service(url)
        except Exception as probe_err:
            print(f"[seed_king] WARNING - probe failed: {probe_err}")
            blob = _stub_output(str(probe_err))
            if out_path:
                Path(out_path).write_text(json.dumps(blob, indent=2), encoding="utf-8")
                print(f"[seed_king] Wrote stub -> {out_path}")
            return 0

        fields = [f["name"] for f in meta.get("fields", [])]
        print(f"[seed_king] Layer: {meta.get('name')} | fields: {len(fields)}")

        loader = FieldAliasLoader()

        if vendor is None:
            vendor = loader.suggest_vendor(fields)
            print(f"[seed_king] Auto-detected vendor: {vendor}")
        else:
            print(f"[seed_king] Using vendor hint: {vendor}")

        diff = loader.schema_diff(fields, vendor=vendor)
        coverage = diff.get("coverage_pct")
        print(f"[seed_king] Schema coverage ({vendor}): {coverage}%")

        unmatched = diff.get("unmatched", [])
        if unmatched:
            print(f"[seed_king] Unmatched fields ({len(unmatched)}): {unmatched[:10]}")

        if probe_only:
            print("[seed_king] --probe flag set; skipping row fetch.")
            return 0

        try:
            rows = fetch_all(url, limit=limit)
        except Exception as fetch_err:
            print(f"[seed_king] WARNING - fetch failed: {fetch_err}")
            blob = _stub_output(str(fetch_err), vendor)
            blob["meta"]["layer_name"] = meta.get("name")
            blob["meta"]["coverage"] = coverage
            if out_path:
                Path(out_path).write_text(json.dumps(blob, indent=2), encoding="utf-8")
            return 0

        norm = [loader.resolve_row(r, vendor) for r in rows]
        stats = _summary_stats(norm)

        out_blob = {
            "meta": {
                "county": _COUNTY,
                "layer_name": meta.get("name"),
                "coverage": coverage,
                "detected_vendor": vendor,
                "unmatched_fields": unmatched[:20],
            },
            "stats": stats,
            "rows": norm[: min(100, len(norm))],
        }

        if out_path:
            Path(out_path).write_text(json.dumps(out_blob, indent=2), encoding="utf-8")
            print(f"[seed_king] Wrote sample -> {out_path}")

        print(
            f"[seed_king] Fetched {len(rows)} rows; "
            f"normalised {len(norm)} rows (vendor: {vendor})"
        )
        return 0

    except Exception as e:
        print(f"[seed_king] ERROR: {e}")
        return 1


def _cli() -> None:
    p = argparse.ArgumentParser(description="Seed King County (generic ArcGIS / in-house path)")
    p.add_argument("--limit", type=int, default=1000)
    p.add_argument("--out", help="Write sample JSON to this file path")
    p.add_argument("--dry-run", action="store_true", default=True)
    p.add_argument("--probe", action="store_true", default=False)
    p.add_argument("--vendor", default=None, help="Vendor hint (auto-detected if omitted)")
    p.add_argument("--url", default=None, help="Override ArcGIS URL")
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
