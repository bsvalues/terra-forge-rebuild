"""
TerraFusion OS — WA DNR Statewide Parcel Baseline Seed (Phase 182)
===================================================================
Seeds TerraFusion's `parcels` table from the Washington DNR Statewide
Parcel Fabric — a public ArcGIS Feature Service that covers all 39 WA
counties with a common schema.

This gives every county a baseline parcel layer before CAMA DB access
is negotiated, letting the app function as a validation tool the moment
a county row exists in Supabase.

Data source:
  WA DNR Statewide Parcels — Esri Feature Service
  https://geo.wa.gov/datasets/wadnr::wa-parcel-fabric/about
  REST: https://services.arcgis.com/jsIt88o09Q0r1j8h/arcgis/rest/services
        /WA_Statewide_Parcels/FeatureServer/0

Usage:
  # Seed a specific county (by FIPS or county name filter)
  python scripts/seed_wa_dnr.py --county yakima --limit 5000

  # Probe service metadata + estimated record counts
  python scripts/seed_wa_dnr.py --probe

  # Dry-run (fetch + print, no DB writes)
  python scripts/seed_wa_dnr.py --county yakima --dry-run --limit 100

Prerequisites:
  pip install requests python-dotenv
  SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

# ── Dependency guard ───────────────────────────────────────────────────────────

missing: list[str] = []
try:
    import requests
except ImportError:
    missing.append("requests")

if missing:
    print(f"[seed_wa_dnr] Missing packages: {', '.join(missing)}")
    print("  Install with:  pip install " + " ".join(missing))
    sys.exit(1)

try:
    from dotenv import load_dotenv
    _seed_env = Path(__file__).parent / ".env.seed"
    if _seed_env.exists():
        load_dotenv(_seed_env)
    load_dotenv()
except ImportError:
    pass

# ── Sibling imports ────────────────────────────────────────────────────────────

sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from scripts.arcgis_adapter import fetch_all, probe_service, detect_parcel_id_field
    from scripts.county_registry import COUNTY_REGISTRY
except ImportError:
    from arcgis_adapter import fetch_all, probe_service, detect_parcel_id_field  # type: ignore
    from county_registry import COUNTY_REGISTRY  # type: ignore

# ── WA DNR service constants ───────────────────────────────────────────────────

WA_DNR_URL = (
    "https://services.arcgis.com/jsIt88o09Q0r1j8h/arcgis/rest"
    "/services/WA_Statewide_Parcels/FeatureServer/0"
)

# WA county name → FIPS (for WHERE clause filtering)
# This list covers all 39 WA counties with the names as they appear
# in the DNR dataset's COUNTY_NM field.
WA_FIPS_BY_NAME: dict[str, str] = {
    "adams": "53001",   "asotin": "53003",   "benton": "53005",
    "chelan": "53007",  "clallam": "53009",  "clark": "53011",
    "columbia": "53013","cowlitz": "53015",  "douglas": "53017",
    "ferry": "53019",   "franklin": "53021", "garfield": "53023",
    "grant": "53025",   "grays harbor": "53027", "island": "53029",
    "jefferson": "53031","king": "53033",    "kitsap": "53035",
    "kittitas": "53037","klickitat": "53039","lewis": "53041",
    "lincoln": "53043", "mason": "53045",    "okanogan": "53047",
    "pacific": "53049", "pend oreille": "53051","pierce": "53053",
    "san juan": "53055","skagit": "53057",   "skamania": "53059",
    "snohomish": "53061","spokane": "53063", "stevens": "53065",
    "thurston": "53067","wahkiakum": "53069","walla walla": "53071",
    "whatcom": "53073", "whitman": "53075",  "yakima": "53077",
}

# Map our registry slugs → DNR COUNTY_NM values
SLUG_TO_DNR_NAME: dict[str, str] = {
    "benton":    "Benton",
    "yakima":    "Yakima",
    "franklin":  "Franklin",
    "thurston":  "Thurston",
    "clark":     "Clark",
    "snohomish": "Snohomish",
    "king":      "King",
}


# ── Supabase upsert ────────────────────────────────────────────────────────────

def _get_supabase_client():
    """Lazy import + init of supabase-py; avoids hard dep at module level."""
    try:
        from supabase import create_client
    except ImportError:
        print("[seed_wa_dnr] Missing 'supabase' package. Install: pip install supabase")
        sys.exit(1)

    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        print(
            "[seed_wa_dnr] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set "
            "in environment or .env.seed"
        )
        sys.exit(1)
    return create_client(url, key)


def _row_to_parcel(raw: dict[str, Any], county_id: str) -> dict[str, Any]:
    """
    Convert a normalised ArcGIS row → TerraFusion `parcels` table row.
    Only maps fields present in the canonical schema; ignores unknown extras.
    """
    return {
        "county_id":       county_id,
        "geo_id":          str(raw.get("parcel_id") or raw.get("objectid") or ""),
        "situs_address":   raw.get("situs_address"),
        "situs_city":      raw.get("situs_city"),
        "situs_state":     raw.get("situs_state", "WA"),
        "situs_zip":       raw.get("situs_zip"),
        "owner_name":      raw.get("owner_name"),
        "legal_desc":      raw.get("legal_desc"),
        "land_use":        raw.get("land_use"),
        "use_code":        raw.get("use_code"),
        "market_value":    _int_or_none(raw.get("market_value")),
        "assessed_value":  _int_or_none(raw.get("assessed_value")),
        "land_value":      _int_or_none(raw.get("land_value")),
        "imprv_value":     _int_or_none(raw.get("imprv_value")),
        "acres":           _float_or_none(raw.get("acres")),
        "hood_cd":         raw.get("hood_cd"),
        "data_source":     "wa_dnr_statewide",
    }


def _int_or_none(v: Any) -> int | None:
    try:
        return int(v) if v is not None else None
    except (ValueError, TypeError):
        return None


def _float_or_none(v: Any) -> float | None:
    try:
        return float(v) if v is not None else None
    except (ValueError, TypeError):
        return None


def _upsert_batch(
    client: Any,
    rows: list[dict[str, Any]],
    dry_run: bool,
    verbose: bool,
) -> int:
    """Upsert a batch; returns number of rows written."""
    if dry_run:
        if verbose:
            print(json.dumps(rows[:3], indent=2, default=str))
        return len(rows)

    # Filter out rows with empty geo_id (can't upsert without a key)
    valid = [r for r in rows if r.get("geo_id")]
    if not valid:
        return 0

    resp = (
        client.table("parcels")
        .upsert(valid, on_conflict="county_id,geo_id")
        .execute()
    )
    if hasattr(resp, "error") and resp.error:
        raise RuntimeError(f"Supabase upsert error: {resp.error}")

    if verbose:
        print(f"  Upserted {len(valid)} rows")
    return len(valid)


# ── Main seed logic ────────────────────────────────────────────────────────────

def seed_county(
    slug: str,
    county_id: str,
    limit: int | None,
    page_size: int,
    dry_run: bool,
    verbose: bool,
) -> int:
    """
    Fetch WA DNR parcel data for a single county and upsert to Supabase.
    Returns total rows written.
    """
    dnr_name = SLUG_TO_DNR_NAME.get(slug)
    if not dnr_name:
        raise ValueError(
            f"County '{slug}' has no DNR name mapping. "
            f"Add it to SLUG_TO_DNR_NAME in seed_wa_dnr.py"
        )

    where = f"COUNTY_NM = '{dnr_name}'"
    print(f"[seed_wa_dnr] Fetching {slug!r} | filter: {where} | limit: {limit or 'all'}")

    if not dry_run:
        client = _get_supabase_client()
    else:
        client = None

    batch_size = min(page_size, 500)
    batch: list[dict[str, Any]] = []
    total = 0

    for page in _iter_pages_lazy(where=where, page_size=page_size, limit=limit):
        for raw in page:
            parcel = _row_to_parcel(raw, county_id)
            batch.append(parcel)
            if len(batch) >= batch_size:
                total += _upsert_batch(client, batch, dry_run, verbose)
                batch = []

    if batch:
        total += _upsert_batch(client, batch, dry_run, verbose)

    print(f"[seed_wa_dnr] Done — {total} rows {'(dry-run)' if dry_run else 'upserted'}")
    return total


def _iter_pages_lazy(
    where: str,
    page_size: int,
    limit: int | None,
):
    """Thin wrapper around arcgis_adapter page iteration, with limit support."""
    from arcgis_adapter import _iter_pages  # type: ignore  # noqa: PLC0415

    fetched = 0
    for page in _iter_pages(WA_DNR_URL, where=where, page_size=page_size):
        if limit and fetched + len(page) > limit:
            yield page[: limit - fetched]
            return
        yield page
        fetched += len(page)
        if limit and fetched >= limit:
            return


# ── CLI ────────────────────────────────────────────────────────────────────────

def _cli() -> None:
    parser = argparse.ArgumentParser(
        description="Seed TerraFusion parcels table from WA DNR statewide dataset."
    )
    parser.add_argument(
        "--county",
        choices=list(SLUG_TO_DNR_NAME.keys()),
        help="County slug to seed (must also be in county_registry)",
    )
    parser.add_argument("--county-id", help="Supabase county UUID (required if not provisioned)")
    parser.add_argument("--limit", type=int, default=None,
                        help="Max rows to fetch per county (omit for all)")
    parser.add_argument("--page-size", type=int, default=1000)
    parser.add_argument("--dry-run", action="store_true",
                        help="Fetch + normalise but do NOT write to Supabase")
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--probe", action="store_true",
                        help="Show WA DNR service metadata and exit")
    args = parser.parse_args()

    if args.probe:
        meta = probe_service(WA_DNR_URL)
        fields = meta.get("fields", [])
        print(f"Service: {meta.get('name')}")
        print(f"maxRecordCount: {meta.get('maxRecordCount')}")
        print(f"Fields ({len(fields)}):")
        for f in fields:
            print(f"  {f['name']:<30} {f.get('alias', ''):<30} {f.get('type', '')}")
        print(f"\nDetected parcel ID field: {detect_parcel_id_field(fields)}")
        return

    if not args.county:
        parser.error("--county is required (or use --probe)")

    slug = args.county
    county_id = args.county_id

    if not county_id:
        # Look up from registry if provisioned
        entry = COUNTY_REGISTRY.get(slug, {})
        county_id = entry.get("id")
        if not county_id and not args.dry_run:
            parser.error(
                f"County '{slug}' has no id in the registry. "
                f"Provide --county-id or use --dry-run."
            )
        if not county_id:
            county_id = "00000000-0000-0000-0000-000000000000"  # dry-run sentinel

    seed_county(
        slug=slug,
        county_id=county_id,
        limit=args.limit,
        page_size=args.page_size,
        dry_run=args.dry_run,
        verbose=args.verbose,
    )


if __name__ == "__main__":
    _cli()
