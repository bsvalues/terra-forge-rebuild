#!/usr/bin/env python3
"""
TerraFusion OS — Benton County PACS Data Seeder
================================================
Reads real Benton PACS CSV exports and seeds TerraFusion Supabase with:
  • Benton County tenant record
  • Parcels (geo_id, situs, assessed value, lat/lng from GDB centroids)
  • Current-year assessments (land + improvement values)
  • Historical assessments (from roll_value_history)
  • Sales/transfers (qualified + unqualified history)
  • Improvement summary (living area, year built, stories)

Data Sources:
  E:\\Exports\\Exports\\dataextract\\ftp_dl_property_val.csv
  E:\\Exports\\Exports\\dataextract\\ftp_dl_situs.csv
  E:\\Exports\\Exports\\dataextract\\ftp_dl_sales_chg_of_owner.csv
  E:\\Exports\\Exports\\dataextract\\ftp_dl_imprv.csv
  E:\\Exports\\Exports\\dataextract\\ftp_dl_roll_value_history.csv
  E:\\Benton_County_Assessor.gdb  (Parcel layer for centroids)

Requirements:
  py -3.12 -m pip install requests pyogrio python-dotenv geopandas pyproj --quiet

Configuration:
  Set SUPABASE_SERVICE_ROLE_KEY in environment OR create scripts/.env.seed:
    SUPABASE_SERVICE_ROLE_KEY=eyJ...
    SUPABASE_URL=https://jzuculrmjuwrshramgye.supabase.co   # optional

Usage:
  py -3.12 scripts/seed_benton_pacs.py
  py -3.12 scripts/seed_benton_pacs.py --skip-gdb       # skip centroid loading
  py -3.12 scripts/seed_benton_pacs.py --dry-run        # parse only, no writes
  py -3.12 scripts/seed_benton_pacs.py --skip-sales     # skip sales table
"""

from __future__ import annotations

import csv
import json
import os
import sys
import time
import argparse
from pathlib import Path
from datetime import datetime

# ── Dependency guard ──────────────────────────────────────────────────────────

MISSING: list[str] = []
try:
    import requests
except ImportError:
    MISSING.append("requests")

if MISSING:
    print(f"[seed_benton_pacs] Missing: {', '.join(MISSING)}")
    print("  Install with: py -3.12 -m pip install requests pyogrio geopandas python-dotenv")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    # Load .env.seed first (secrets), then .env
    _seed_env = Path(__file__).parent / ".env.seed"
    if _seed_env.exists():
        load_dotenv(_seed_env)
    load_dotenv()
except ImportError:
    # Manual .env.seed loader if python-dotenv is absent
    _seed_env = Path(__file__).parent / ".env.seed"
    if _seed_env.exists():
        for _line in _seed_env.read_text().splitlines():
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _, _v = _line.partition("=")
                os.environ.setdefault(_k.strip(), _v.strip())

# ── Configuration ─────────────────────────────────────────────────────────────

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://jzuculrmjuwrshramgye.supabase.co").rstrip("/")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

EXPORTS_DIR = Path(os.getenv("BENTON_EXPORTS", r"E:\Exports\Exports\dataextract"))
GDB_PATH = os.getenv("BENTON_GDB", r"E:\Benton_County_Assessor.gdb")

PROP_VAL_CSV = EXPORTS_DIR / "ftp_dl_property_val.csv"
SITUS_CSV    = EXPORTS_DIR / "ftp_dl_situs.csv"
SALES_CSV    = EXPORTS_DIR / "ftp_dl_sales_chg_of_owner.csv"
IMPRV_CSV    = EXPORTS_DIR / "ftp_dl_imprv.csv"
ROLL_HIST_CSV = EXPORTS_DIR / "ftp_dl_roll_value_history.csv"
OWNER_CSV    = EXPORTS_DIR / "ftp_dl_owner.csv"
ACCOUNT_CSV  = EXPORTS_DIR / "ftp_dl_account.csv"

BENTON_FIPS = "53005"
BENTON_NAME = "Benton County"
BENTON_STATE = "WA"
CURRENT_TAX_YEAR = 2026

BATCH_SIZE = 500

# Qualified sale ratio type codes (IAAO arm's-length criteria for Benton)
# Empty/null sl_ratio_type_cd typically means arms-length in PACS
UNQUALIFIED_CODES = {
    "UA", "UB", "UC", "UD", "UE", "UF", "UG", "UH", "UI",  # unqualified
    "HDeed", "QClaim", "QuitClaim", "Q",                     # deed type flags
    "NQ", "NQA", "NQB",                                      # non-qualifying
}

# ── HTTP / REST helpers ───────────────────────────────────────────────────────

def _headers(return_repr: bool = False) -> dict[str, str]:
    h = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation" if return_repr else "return=minimal",
    }
    return h


def _rest_get(path: str, params: dict | None = None) -> list:
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    resp = requests.get(url, headers=_headers(), params=params, timeout=60)
    resp.raise_for_status()
    return resp.json()


def _upsert_batch(table: str, rows: list, on_conflict: str) -> list:
    if not rows:
        return []
    url = f"{SUPABASE_URL}/rest/v1/{table}?on_conflict={on_conflict}"
    resp = requests.post(url, headers=_headers(return_repr=True), json=rows, timeout=120)
    if resp.status_code not in (200, 201):
        # Log first 300 chars of error context without leaking data
        snippet = resp.text[:300].replace(SERVICE_KEY, "***")
        raise RuntimeError(f"upsert {table} [{resp.status_code}]: {snippet}")
    return resp.json()


def bulk_upsert(
    table: str,
    rows: list,
    on_conflict: str,
    label: str = "",
    dry_run: bool = False,
) -> list:
    if dry_run:
        print(f"  DRY-RUN {table}: {len(rows):,} rows (not written)")
        return []
    total = len(rows)
    collected = []
    for i in range(0, total, BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        result = _upsert_batch(table, batch, on_conflict)
        collected.extend(result)
        pct = min(100, int((i + len(batch)) / total * 100))
        written = i + len(batch)
        print(f"  {label or table}: {pct}%  ({written:,}/{total:,})", end="\r", flush=True)
        time.sleep(0.04)  # courtesy pause
    print()
    return collected


# ── CSV helpers ───────────────────────────────────────────────────────────────

def _s(val) -> str:
    """Strip whitespace from any value."""
    return str(val).strip() if val is not None else ""


def _f(val, default: float = 0.0) -> float:
    try:
        v = str(val).strip()
        return float(v) if v else default
    except (ValueError, TypeError):
        return default


def _i(val, default: int = 0) -> int:
    try:
        v = str(val).strip()
        return int(float(v)) if v else default
    except (ValueError, TypeError):
        return default


def _date(val: str) -> str | None:
    v = _s(val)
    if not v:
        return None
    return v[:10]  # "1997-10-28 00:00:00.000" → "1997-10-28"


def load_csv_dict(path: Path, key_col: str) -> dict[str, dict]:
    """Load CSV as {key_col_value: row_dict}. Last row wins for duplicate keys."""
    if not path.exists():
        print(f"  WARN: {path} not found — skipping")
        return {}
    result: dict[str, dict] = {}
    with open(path, newline="", encoding="utf-8", errors="replace") as f:
        for row in csv.DictReader(f):
            k = _s(row.get(key_col, ""))
            if k:
                result[k] = row
    return result


def load_csv_multidict(path: Path, key_col: str) -> dict[str, list[dict]]:
    """Load CSV as {key: [rows]}. Useful for one-to-many."""
    if not path.exists():
        print(f"  WARN: {path} not found — skipping")
        return {}
    result: dict[str, list[dict]] = {}
    with open(path, newline="", encoding="utf-8", errors="replace") as f:
        for row in csv.DictReader(f):
            k = _s(row.get(key_col, ""))
            if k:
                result.setdefault(k, []).append(row)
    return result


# ── GDB centroid extraction ───────────────────────────────────────────────────

def load_gdb_centroids(gdb_path: str) -> dict[str, tuple[float, float]]:
    """
    Read Benton Parcel layer from FGDB, compute WGS-84 centroids.
    Returns {geo_id: (lat, lng)}.
    Falls back to ParcelsAndAssess if needed.
    Requires: geopandas, pyproj, pyogrio
    """
    try:
        import geopandas as gpd  # type: ignore
    except ImportError:
        print("  WARN: geopandas not installed — centroids will be null")
        print("        Install: py -3.12 -m pip install geopandas")
        return {}

    p = Path(gdb_path)
    if not p.exists():
        print(f"  WARN: GDB not found at {gdb_path} — centroids will be null")
        return {}

    for layer in ("Parcel", "ParcelsAndAssess"):
        try:
            print(f"  Reading GDB layer: {layer} ... ", end="", flush=True)
            gdf = gpd.read_file(gdb_path, layer=layer)
            print(f"{len(gdf):,} features", end="")

            # Re-project to WGS-84
            if gdf.crs is not None and gdf.crs.to_epsg() != 4326:
                gdf = gdf.to_crs(epsg=4326)
                print(" → EPSG:4326", end="")

            # Compute centroids
            gdf = gdf[gdf.geometry.notna()].copy()
            gdf["_cx"] = gdf.geometry.centroid.x
            gdf["_cy"] = gdf.geometry.centroid.y

            # Find geo_id field (try multiple candidates)
            id_col = None
            for candidate in ("geo_id", "GEO_ID", "Geo_Id", "PARCEL_ID", "parcel_number", "PIN"):
                if candidate in gdf.columns:
                    id_col = candidate
                    break

            if id_col is None:
                print(f" — no parcel ID field found, tried geo_id/PARCEL_ID/PIN")
                continue

            print(f" (id_col={id_col})")
            centroids: dict[str, tuple[float, float]] = {}
            for _, row in gdf[[id_col, "_cy", "_cx"]].iterrows():
                gid = _s(row[id_col])
                if gid and row["_cy"] and row["_cx"]:
                    centroids[gid] = (float(row["_cy"]), float(row["_cx"]))  # (lat, lng)
            print(f"  Centroids extracted: {len(centroids):,}")
            return centroids
        except Exception as exc:
            print(f" — failed ({exc})")
            continue

    return {}


# ── Phase 1: Ensure Benton county exists ─────────────────────────────────────

def ensure_county(dry_run: bool) -> str | None:
    """
    Upsert Benton county into `counties` table. Returns county_id UUID.
    Creates a stub county if it doesn't exist.
    """
    print("\n── PHASE 1: County Tenant ──────────────────────────────────────────")

    if dry_run:
        print("  DRY-RUN: would upsert Benton County (fips=53005, state=WA)")
        return "00000000-0000-0000-0000-000000000000"

    # Check if Benton already exists
    existing = _rest_get("counties", {"fips_code": f"eq.{BENTON_FIPS}", "select": "id,name"})
    if existing:
        county_id = existing[0]["id"]
        print(f"  Benton County already exists: {county_id}")
        return county_id

    # Create it
    result = _upsert_batch(
        "counties",
        [{"name": BENTON_NAME, "fips_code": BENTON_FIPS, "state": BENTON_STATE}],
        "fips_code",
    )
    if not result:
        raise RuntimeError("Failed to create Benton county record")
    county_id = result[0]["id"]
    print(f"  Created Benton County: {county_id}")
    return county_id


# ── Phase 2: Load CSVs into memory ────────────────────────────────────────────

def load_all_csvs() -> dict:
    print("\n── PHASE 2: Loading PACS CSVs ──────────────────────────────────────")

    t0 = time.time()
    print("  property_val ... ", end="", flush=True)
    prop_val = load_csv_dict(PROP_VAL_CSV, "prop_id")
    print(f"{len(prop_val):,} rows")

    print("  situs ... ", end="", flush=True)
    situs = load_csv_dict(SITUS_CSV, "prop_id")
    print(f"{len(situs):,} rows")

    print("  imprv ... ", end="", flush=True)
    imprv = load_csv_dict(IMPRV_CSV, "prop_id")  # last imprv row per prop
    print(f"{len(imprv):,} rows")

    print("  roll_value_history ... ", end="", flush=True)
    roll_hist = load_csv_multidict(ROLL_HIST_CSV, "prop_id")
    print(f"{len(roll_hist):,} properties × history")

    print("  sales ... ", end="", flush=True)
    sales_rows = load_csv_multidict(SALES_CSV, "prop_id")
    print(f"{len(sales_rows):,} properties × sales")

    print(f"  CSVs loaded in {time.time()-t0:.1f}s")

    # Build geo_id → prop_id lookup from property_val
    # (geo_id in CSV may have trailing spaces; strip them)
    geo_to_prop: dict[str, str] = {}
    for prop_id, row in prop_val.items():
        gid = _s(row.get("geo_id", ""))
        if gid:
            geo_to_prop[gid] = prop_id

    return {
        "prop_val": prop_val,
        "situs": situs,
        "imprv": imprv,
        "roll_hist": roll_hist,
        "sales_rows": sales_rows,
        "geo_to_prop": geo_to_prop,
    }


# ── Phase 3: Build + upsert parcels ──────────────────────────────────────────

def seed_parcels(
    data: dict,
    county_id: str,
    centroids: dict[str, tuple[float, float]],
    dry_run: bool,
) -> dict[str, str]:
    """
    Upsert parcels. Returns {geo_id: parcel_uuid}.
    """
    print("\n── PHASE 3: Parcels ────────────────────────────────────────────────")

    prop_val = data["prop_val"]
    situs = data["situs"]
    imprv = data["imprv"]

    parcel_rows: list[dict] = []
    skipped = 0

    for prop_id, pv in prop_val.items():
        geo_id = _s(pv.get("geo_id", ""))
        if not geo_id:
            skipped += 1
            continue

        # Situs address
        s = situs.get(prop_id, {})
        addr_parts = [
            _s(s.get("situs_num", "")),
            _s(s.get("situs_street_prefx", "")),
            _s(s.get("situs_street", "")),
            _s(s.get("situs_street_sufix", "")),
        ]
        address = " ".join(p for p in addr_parts if p).strip() or _s(s.get("situs_display", "UNKNOWN"))
        city = _s(s.get("situs_city", ""))
        state_ = _s(s.get("situs_state", "WA")) or "WA"
        zip_code = _s(s.get("situs_zip", ""))

        # Improvement data (primary improvement)
        imp = imprv.get(prop_id, {})
        living_area = _f(imp.get("living_area", 0))
        year_built = _i(imp.get("actual_year_built", 0)) or None
        stories = _f(imp.get("stories", 0)) or None

        # Values
        land_val = _f(pv.get("land_hstd_val", 0)) + _f(pv.get("land_non_hstd_val", 0))
        imprv_val = _f(pv.get("imprv_hstd_val", 0)) + _f(pv.get("imprv_non_hstd_val", 0))
        assessed = _f(pv.get("assessed_val", 0))
        if assessed == 0:
            assessed = _f(pv.get("appraised_val", 0))

        # Neighborhood
        hood = _s(pv.get("hood_cd", ""))

        # Coordinates from GDB centroid (keyed by geo_id)
        lat, lng = None, None
        coord = centroids.get(geo_id)
        if coord:
            lat, lng = coord[0], coord[1]

        parcel_rows.append({
            "county_id": county_id,
            "parcel_number": geo_id,
            "address": address or "UNKNOWN",
            "city": city or "",
            "state": state_,
            "zip_code": zip_code or "",
            "property_class": _s(pv.get("prop_type_cd", "")),
            "land_area": None,   # will be enriched from land_detail if needed
            "building_area": living_area if living_area > 0 else None,
            "year_built": year_built,
            "assessed_value": assessed,
            "land_value": land_val,
            "improvement_value": imprv_val,
            "latitude": lat,
            "longitude": lng,
            "neighborhood_code": hood if hood else None,
        })

    print(f"  {len(parcel_rows):,} parcel rows prepared ({skipped} skipped — no geo_id)")

    returned = bulk_upsert("parcels", parcel_rows, "county_id,parcel_number", "parcels", dry_run)

    # Build geo_id → uuid map from returned rows
    geo_to_uuid: dict[str, str] = {}
    for r in returned:
        geo_to_uuid[_s(r.get("parcel_number", ""))] = r.get("id", "")

    if not dry_run and not geo_to_uuid:
        # Fetch back if upsert used return=minimal
        print("  Fetching parcel UUIDs for join mapping ...")
        page_size = 1000
        offset = 0
        while True:
            rows = _rest_get(
                "parcels",
                {
                    "county_id": f"eq.{county_id}",
                    "select": "id,parcel_number",
                    "limit": str(page_size),
                    "offset": str(offset),
                },
            )
            for r in rows:
                geo_to_uuid[_s(r.get("parcel_number", ""))] = r.get("id", "")
            if len(rows) < page_size:
                break
            offset += page_size
        print(f"  Mapped {len(geo_to_uuid):,} parcel UUIDs")

    return geo_to_uuid


# ── Phase 4: Assessments ──────────────────────────────────────────────────────

def seed_assessments(data: dict, geo_to_uuid: dict[str, str], dry_run: bool):
    print("\n── PHASE 4: Assessments ────────────────────────────────────────────")

    prop_val = data["prop_val"]
    roll_hist = data["roll_hist"]

    assessment_rows: list[dict] = []

    # Current year from property_val
    for prop_id, pv in prop_val.items():
        geo_id = _s(pv.get("geo_id", ""))
        parcel_id = geo_to_uuid.get(geo_id)
        if not parcel_id:
            continue
        land_val = _f(pv.get("land_hstd_val", 0)) + _f(pv.get("land_non_hstd_val", 0))
        imprv_val = _f(pv.get("imprv_hstd_val", 0)) + _f(pv.get("imprv_non_hstd_val", 0))
        assessment_rows.append({
            "parcel_id": parcel_id,
            "tax_year": CURRENT_TAX_YEAR,
            "land_value": land_val,
            "improvement_value": imprv_val,
            "certified": False,
            "assessment_reason": "pacs_seed",
        })

    print(f"  {len(assessment_rows):,} current-year ({CURRENT_TAX_YEAR}) assessment rows")
    bulk_upsert("assessments", assessment_rows, "parcel_id,tax_year", "assessments (current)", dry_run)

    # Historical assessments from roll_value_history
    hist_rows: list[dict] = []
    for prop_id, history in roll_hist.items():
        # Need to look up geo_id for this prop_id
        # Use a reverse lookup from prop_val
        pv = data["prop_val"].get(prop_id)
        if not pv:
            continue
        geo_id = _s(pv.get("geo_id", ""))
        parcel_id = geo_to_uuid.get(geo_id)
        if not parcel_id:
            continue
        for h in history:
            yr = _i(h.get("prop_val_yr", 0))
            if yr == 0 or yr == CURRENT_TAX_YEAR:
                continue
            hist_rows.append({
                "parcel_id": parcel_id,
                "tax_year": yr,
                "land_value": _f(h.get("land_market", 0)),
                "improvement_value": _f(h.get("improvements", 0)),
                "certified": True,
                "assessment_reason": "pacs_historical",
            })

    print(f"  {len(hist_rows):,} historical assessment rows")
    bulk_upsert("assessments", hist_rows, "parcel_id,tax_year", "assessments (history)", dry_run)


# ── Phase 5: Sales ────────────────────────────────────────────────────────────

def _insert_batch(table: str, rows: list) -> None:
    """Plain INSERT — no conflict resolution. Table must not have an auto-unique constraint for these."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    resp = requests.post(url, headers=_headers(return_repr=False), json=rows, timeout=120)
    if resp.status_code not in (200, 201):
        snippet = resp.text[:300].replace(SERVICE_KEY, "***")
        raise RuntimeError(f"insert {table} [{resp.status_code}]: {snippet}")


def bulk_insert(
    table: str,
    rows: list,
    label: str = "",
    dry_run: bool = False,
) -> None:
    if dry_run:
        print(f"  DRY-RUN {table}: {len(rows):,} rows (not written)")
        return
    total = len(rows)
    for i in range(0, total, BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        _insert_batch(table, batch)
        pct = min(100, int((i + len(batch)) / total * 100))
        print(f"  {label or table}: {pct}%  ({i+len(batch):,}/{total:,})", end="\r", flush=True)
        time.sleep(0.04)
    print()


def seed_sales(data: dict, geo_to_uuid: dict[str, str], dry_run: bool, force: bool = False):
    print("\n── PHASE 5: Sales ──────────────────────────────────────────────────")

    sales_rows_csv = data["sales_rows"]
    prop_val = data["prop_val"]

    sale_rows: list[dict] = []
    skipped_no_parcel = 0
    skipped_no_price = 0

    for prop_id, sales in sales_rows_csv.items():
        # Look up geo_id → uuid
        pv = prop_val.get(prop_id)
        if not pv:
            skipped_no_parcel += 1
            continue
        geo_id = _s(pv.get("geo_id", ""))
        parcel_id = geo_to_uuid.get(geo_id)
        if not parcel_id:
            skipped_no_parcel += 1
            continue

        for s in sales:
            price_str = _s(s.get("sl_price", ""))
            price = _f(price_str)
            if price <= 0:
                skipped_no_price += 1
                continue

            sale_date = _date(s.get("sl_dt", ""))
            if not sale_date:
                continue

            ratio_type = _s(s.get("sl_ratio_type_cd", ""))
            deed_type = _s(s.get("deed_type_cd", ""))

            # Qualify sale: disqualified if known unqualified codes present
            is_qualified = (
                ratio_type not in UNQUALIFIED_CODES
                and deed_type not in UNQUALIFIED_CODES
                and price > 1000
            )

            sale_rows.append({
                "parcel_id": parcel_id,
                "sale_date": sale_date,
                "sale_price": price,
                "sale_type": ratio_type or None,
                "is_qualified": is_qualified,
                "grantor": _s(s.get("grantor_cv", "")) or None,
                "grantee": _s(s.get("grantee", "")) or None,
                "deed_type": deed_type or None,
                "instrument_number": _s(s.get("excise_number", "")) or None,
            })

    print(f"  {len(sale_rows):,} sale rows (skipped: {skipped_no_parcel} no parcel, {skipped_no_price} no price)")
    qual = sum(1 for r in sale_rows if r["is_qualified"])
    print(f"  Qualified: {qual:,}  Unqualified: {len(sale_rows)-qual:,}")

    if not dry_run:
        # Check if sales already seeded for this county (no unique constraint — guard against duplicates)
        parcel_ids = list(geo_to_uuid.values())[:10]  # sample check
        existing_count = 0
        if parcel_ids:
            params = {"parcel_id": f"in.({','.join(parcel_ids)})", "select": "id"}
            rows = _rest_get("sales", params)
            existing_count = len(rows)

        if existing_count > 0 and not force:
            print(f"  SKIPPED: sales already exist ({existing_count}+ rows found for sampled parcels).")
            print(f"  Use --force-sales to delete existing Benton sales and re-insert.")
            return

        if force and existing_count > 0:
            print(f"  --force-sales: deleting existing sales for Benton parcels ...")
            # Delete in batches of parcel IDs
            all_ids = list(geo_to_uuid.values())
            for i in range(0, len(all_ids), 200):
                chunk = all_ids[i : i + 200]
                url = f"{SUPABASE_URL}/rest/v1/sales?parcel_id=in.({','.join(chunk)})"
                resp = requests.delete(url, headers=_headers(), timeout=60)
                if resp.status_code not in (200, 204):
                    print(f"  WARN: delete batch failed [{resp.status_code}]")
            print(f"  Existing sales deleted.")

    bulk_insert("sales", sale_rows, "sales", dry_run)


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(description="Seed Benton County PACS data into TerraFusion")
    parser.add_argument("--dry-run", action="store_true", help="Parse CSVs and report counts; do not write")
    parser.add_argument("--skip-gdb", action="store_true", help="Skip GDB centroid loading (faster, no lat/lng)")
    parser.add_argument("--skip-sales", action="store_true", help="Skip seeding the sales table")
    parser.add_argument("--skip-history", action="store_true", help="Skip historical assessment rows")
    parser.add_argument("--force-sales", action="store_true", help="Delete existing Benton sales and re-insert")
    args = parser.parse_args()

    print("=" * 60)
    print("TerraFusion OS — Benton County PACS Seeder")
    print(f"  Target:   {SUPABASE_URL}")
    print(f"  Exports:  {EXPORTS_DIR}")
    print(f"  GDB:      {GDB_PATH}")
    print(f"  Tax year: {CURRENT_TAX_YEAR}")
    if args.dry_run:
        print("  MODE:     DRY-RUN (no writes)")
    print("=" * 60)

    # Gate: service key required (not anon key)
    if not SERVICE_KEY:
        print("\nERROR: SUPABASE_SERVICE_ROLE_KEY is not set.")
        print("Get it from: https://supabase.com/dashboard/project/jzuculrmjuwrshramgye/settings/api")
        print("\nAdd to scripts/.env.seed (this file is NOT committed to git):")
        print("  SUPABASE_SERVICE_ROLE_KEY=eyJ...")
        return 1

    if SERVICE_KEY.startswith("eyJ") and "anon" in SERVICE_KEY:
        print("\nERROR: You provided the anon key. The seeder requires the service_role key.")
        print("The service_role key allows bypassing RLS for bulk inserts.")
        return 1

    t_start = time.time()

    # Phase 0: GDB centroids (slow — ~2min for 72k polygons)
    centroids: dict[str, tuple[float, float]] = {}
    if not args.skip_gdb:
        print("\n── PHASE 0: GDB Centroids ──────────────────────────────────────────")
        centroids = load_gdb_centroids(GDB_PATH)
        print(f"  {len(centroids):,} centroids loaded")
    else:
        print("\n── PHASE 0: GDB Centroids (SKIPPED) ───────────────────────────────")

    # Phase 1: County tenant
    county_id = ensure_county(args.dry_run)
    if not county_id:
        return 1

    # Phase 2: Load CSVs
    data = load_all_csvs()

    # Phase 3: Parcels
    geo_to_uuid = seed_parcels(data, county_id, centroids, args.dry_run)

    # Phase 4: Assessments
    seed_assessments(data, geo_to_uuid, args.dry_run)

    # Phase 5: Sales
    if not args.skip_sales:
        seed_sales(data, geo_to_uuid, args.dry_run, force=args.force_sales)
    else:
        print("\n── PHASE 5: Sales (SKIPPED) ────────────────────────────────────────")

    elapsed = time.time() - t_start
    print(f"\n{'='*60}")
    print(f"  SEED COMPLETE  ({elapsed:.1f}s)")
    print(f"  County:    {BENTON_NAME}  (id={county_id})")
    print(f"  Parcels:   {len(data['prop_val']):,}")
    print(f"  Sales:     {sum(len(v) for v in data['sales_rows'].values()):,} raw rows")
    print(f"  Next: seed GIS layers via  py -3.12 scripts/seed_benton_gis.py")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
