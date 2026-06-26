"""
TerraFusion OS — ArcGIS Feature Service Adapter (Phase 181)
=============================================================
Generic adapter that queries any Esri ArcGIS Feature Service REST endpoint,
pages through all records, normalises the response to a flat list of dicts,
and maps field names through the county's canonical alias dictionary.

Designed to back the county open-data seeds (Yakima, King, Thurston, etc.)
without needing pyogrio/FGDB access.

Usage (standalone test):
  python scripts/arcgis_adapter.py \\
    --url "https://gis.yakimacounty.us/arcgis/rest/services/Assessor/Parcels/FeatureServer/0" \\
    --county yakima \\
    --limit 500

Environment variables (optional):
  ARCGIS_TIMEOUT_SECONDS   Default 30
  ARCGIS_PAGE_SIZE         Default 1000

Prerequisites:
  pip install requests python-dotenv
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Generator

# ── Dependency guard ───────────────────────────────────────────────────────────

missing: list[str] = []
try:
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry
except ImportError:
    missing.append("requests")

if missing:
    print(f"[arcgis_adapter] Missing packages: {', '.join(missing)}")
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

# ── Configuration ──────────────────────────────────────────────────────────────

DEFAULT_PAGE_SIZE = int(os.getenv("ARCGIS_PAGE_SIZE", "1000"))
DEFAULT_TIMEOUT   = int(os.getenv("ARCGIS_TIMEOUT_SECONDS", "30"))

# ── Canonical field aliases ────────────────────────────────────────────────────
# Maps raw ArcGIS field names → TerraFusion canonical field names.
# Built from the Phase 183 field alias dictionary; kept here as the
# runtime mapping so callers don't have to import the full dictionary.

CANONICAL_ALIAS: dict[str, str] = {
    # Parcel identifiers
    "parcelid":           "parcel_id",
    "parcel_id":          "parcel_id",
    "parcelnumber":       "parcel_id",
    "parcel_number":      "parcel_id",
    "assessorparcelno":   "parcel_id",
    "apn":                "parcel_id",
    "pin":                "parcel_id",
    "taxlot":             "parcel_id",
    "tax_lot":            "parcel_id",
    "objectid":           "objectid",

    # Geometry
    "shape":              "geom",
    "shape_area":         "shape_area",
    "shape_length":       "shape_length",
    "acres":              "acres",
    "sqft":               "sqft",
    "land_sqft":          "sqft",

    # Situs / address
    "situsaddress":       "situs_address",
    "situs_address":      "situs_address",
    "propertyaddress":    "situs_address",
    "property_address":   "situs_address",
    "situscity":          "situs_city",
    "situs_city":         "situs_city",
    "situsstate":         "situs_state",
    "situszip":           "situs_zip",
    "situs_zip":          "situs_zip",

    # Legal description / subdivision
    "legaldescription":   "legal_desc",
    "legal_desc":         "legal_desc",
    "legal_description":  "legal_desc",
    "subdivision":        "subdivision",
    "plat":               "subdivision",
    "platname":           "subdivision",
    "block":              "block",
    "lot":                "lot",

    # Owner
    "ownername":          "owner_name",
    "owner_name":         "owner_name",
    "taxpayer_name":      "owner_name",
    "taxpayername":       "owner_name",
    "mailingaddress":     "mailing_address",
    "mailing_address":    "mailing_address",

    # Valuation
    "appraised_value":    "market_value",
    "appraisedvalue":     "market_value",
    "totalappraisedvalue":"market_value",
    "total_value":        "market_value",
    "marketvalue":        "market_value",
    "assessedvalue":      "assessed_value",
    "assessed_value":     "assessed_value",
    "landvalue":          "land_value",
    "land_value":         "land_value",
    "improvementvalue":   "imprv_value",
    "imprv_value":        "imprv_value",

    # Property classification
    "proptype":           "prop_type",
    "prop_type":          "prop_type",
    "propertytype":       "prop_type",
    "landuse":            "land_use",
    "land_use":           "land_use",
    "landusecode":        "land_use",
    "usecode":            "use_code",
    "use_code":           "use_code",
    "zoningcode":         "zone_code",
    "zonecode":           "zone_code",
    "zone_code":          "zone_code",

    # Parcel attributes
    "neighborhood":       "hood_cd",
    "hood_cd":            "hood_cd",
    "nbhd":               "hood_cd",
    "nbhd_cd":            "hood_cd",
    "taxcode":            "tax_code",
    "tax_code":           "tax_code",
    "taxyear":            "tax_year",
    "tax_year":           "tax_year",
    "levy_code":          "levy_code",
    "levycode":           "levy_code",

    # Dates
    "lastupdated":        "last_updated",
    "last_updated":       "last_updated",
    "dateupdated":        "last_updated",
}


def _build_session(retries: int = 3) -> "requests.Session":
    """Return a requests Session with automatic retry on transient errors."""
    session = requests.Session()
    retry = Retry(
        total=retries,
        backoff_factor=0.5,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods={"GET", "POST"},
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def probe_service(url: str, timeout: int = DEFAULT_TIMEOUT) -> dict[str, Any]:
    """
    Fetch the Feature Layer metadata (fields, maxRecordCount, etc.).
    `url` should point to the layer endpoint (no trailing slash).
    """
    session = _build_session()
    resp = session.get(
        url,
        params={"f": "json"},
        timeout=timeout,
    )
    resp.raise_for_status()
    meta = resp.json()
    if "error" in meta:
        raise RuntimeError(f"ArcGIS error: {meta['error']}")
    return meta


def _iter_pages(
    url: str,
    where: str = "1=1",
    out_fields: str = "*",
    page_size: int = DEFAULT_PAGE_SIZE,
    timeout: int = DEFAULT_TIMEOUT,
    result_offset: int = 0,
) -> Generator[list[dict[str, Any]], None, None]:
    """
    Generator that paginates through a Feature Service layer using
    `resultOffset` + `resultRecordCount` (supported since ArcGIS 10.3).
    Yields each page's feature list.
    """
    session = _build_session()
    offset = result_offset

    while True:
        params = {
            "where": where,
            "outFields": out_fields,
            "f": "json",
            "returnGeometry": "false",
            "resultOffset": offset,
            "resultRecordCount": page_size,
        }
        resp = session.get(f"{url}/query", params=params, timeout=timeout)
        resp.raise_for_status()
        data = resp.json()

        if "error" in data:
            raise RuntimeError(f"ArcGIS query error: {data['error']}")

        features = data.get("features", [])
        if not features:
            break

        yield [f.get("attributes", {}) for f in features]
        offset += len(features)

        # If the service returned fewer records than the page size, we're done
        if len(features) < page_size:
            break

        # Be polite to public ArcGIS endpoints
        time.sleep(0.1)


def fetch_all(
    url: str,
    where: str = "1=1",
    out_fields: str = "*",
    page_size: int = DEFAULT_PAGE_SIZE,
    limit: int | None = None,
    timeout: int = DEFAULT_TIMEOUT,
    normalise: bool = True,
) -> list[dict[str, Any]]:
    """
    Fetch every record from a Feature Service layer.

    Args:
        url: Layer endpoint (e.g. .../FeatureServer/0)
        where: ArcGIS where clause (default: all records)
        out_fields: comma-separated field list or "*"
        page_size: records per page (default 1000)
        limit: stop after this many rows (None = no limit; for dev sampling)
        timeout: per-request timeout in seconds
        normalise: if True, lower-case all field names and apply CANONICAL_ALIAS

    Returns:
        Flat list of attribute dicts, one per feature.
    """
    records: list[dict[str, Any]] = []

    for page in _iter_pages(url, where=where, out_fields=out_fields,
                             page_size=page_size, timeout=timeout):
        if normalise:
            page = [_normalise_row(row) for row in page]
        records.extend(page)
        if limit and len(records) >= limit:
            return records[:limit]

    return records


def _normalise_row(row: dict[str, Any]) -> dict[str, Any]:
    """
    Lower-case all keys and apply CANONICAL_ALIAS mapping.
    Unknown keys are preserved as-is (lower-cased).
    """
    out: dict[str, Any] = {}
    for key, val in row.items():
        k = key.lower()
        canonical = CANONICAL_ALIAS.get(k, k)
        out[canonical] = val
    return out


def detect_parcel_id_field(fields: list[dict[str, Any]]) -> str | None:
    """
    Given a list of field metadata dicts (from probe_service),
    return the field name most likely to be the parcel ID.
    Checks known aliases first; falls back to fuzzy prefix scan.
    """
    known = {
        "parcelid", "parcel_id", "parcelnumber", "parcel_number",
        "assessorparcelno", "apn", "pin", "taxlot", "tax_lot",
    }
    for f in fields:
        if f.get("name", "").lower() in known:
            return f["name"]
    # Fuzzy: any field containing "parcel" or "apn"
    for f in fields:
        name_lower = f.get("name", "").lower()
        if "parcel" in name_lower or name_lower == "apn":
            return f["name"]
    return None


# ── Known WA County endpoints ──────────────────────────────────────────────────
# Registry of known-good ArcGIS Feature Service URLs for WA counties.
# Used by seed scripts to avoid hard-coding URLs.
# Keys match county slugs in county_registry.py.

WA_COUNTY_PARCEL_ENDPOINTS: dict[str, str] = {
    # Source: county ArcGIS Online portals (verified patterns as of 2025)
    "yakima": (
        "https://gis.yakimacounty.us/arcgis/rest/services/Assessor"
        "/AssessorParcels/FeatureServer/0"
    ),
    "franklin": (
        "https://gis.co.franklin.wa.us/arcgis/rest/services/Parcels"
        "/Parcels/FeatureServer/0"
    ),
    "thurston": (
        "https://services.arcgis.com/qBoSerlfXyYNdJYP/arcgis/rest/services"
        "/Thurston_County_Parcels/FeatureServer/0"
    ),
    "clark": (
        "https://gis.clark.wa.gov/giserv/rest/services/Assessor"
        "/Parcels/MapServer/0"
    ),
    "snohomish": (
        "https://services2.arcgis.com/qBoSerlfXyYNdJYP/arcgis/rest/services"
        "/SnohomishCountyParcels/FeatureServer/0"
    ),
    "king": (
        "https://gismaps.kingcounty.gov/arcgis/rest/services/Property"
        "/KingCo_Parcel/MapServer/0"
    ),
    # WA DNR statewide parcel layer (all 39 counties, Phase 182)
    "wa_dnr_statewide": (
        "https://geo.wa.gov/datasets/wadnr::wa-parcel-fabric/about"
        # ArcGIS REST: https://services.arcgis.com/jsIt88o09Q0r1j8h/arcgis/rest/services
        #              /WA_Statewide_Parcels/FeatureServer/0
    ),
}


# ── CLI ────────────────────────────────────────────────────────────────────────

def _cli() -> None:
    parser = argparse.ArgumentParser(
        description="Query an ArcGIS Feature Service and print normalised rows."
    )
    parser.add_argument("--url", help="Feature layer URL (overrides --county)")
    parser.add_argument(
        "--county",
        choices=list(WA_COUNTY_PARCEL_ENDPOINTS.keys()),
        help="Use a known WA county endpoint from the built-in registry",
    )
    parser.add_argument("--where", default="1=1", help="ArcGIS WHERE clause")
    parser.add_argument("--limit", type=int, default=10,
                        help="Max rows to print (default 10)")
    parser.add_argument("--page-size", type=int, default=DEFAULT_PAGE_SIZE)
    parser.add_argument("--probe", action="store_true",
                        help="Show service metadata only (no data fetch)")
    parser.add_argument("--out", help="Write JSON output to this file path")
    args = parser.parse_args()

    if not args.url and not args.county:
        parser.error("Provide --url or --county")

    url = args.url or WA_COUNTY_PARCEL_ENDPOINTS[args.county]

    if args.probe:
        meta = probe_service(url)
        print(json.dumps({
            "name": meta.get("name"),
            "maxRecordCount": meta.get("maxRecordCount"),
            "fields": [
                {"name": f["name"], "alias": f.get("alias"), "type": f.get("type")}
                for f in meta.get("fields", [])
            ],
        }, indent=2))
        parcel_field = detect_parcel_id_field(meta.get("fields", []))
        print(f"\n[Detected parcel ID field]: {parcel_field}")
        return

    rows = fetch_all(url, where=args.where, limit=args.limit,
                     page_size=args.page_size)
    print(f"\nFetched {len(rows)} rows from: {url}\n")
    print(json.dumps(rows[:5], indent=2))

    if args.out:
        Path(args.out).write_text(json.dumps(rows, indent=2), encoding="utf-8")
        print(f"\nWrote {len(rows)} rows → {args.out}")


if __name__ == "__main__":
    _cli()
