#!/usr/bin/env python3
"""
TerraFusion OS — PACS Domain Tables Seeder
============================================
Seeds the 7 PACS domain tables on Supabase:
  • pacs_owners         — from Docker PACS (dbo.owner + dbo.account)
  • pacs_sales          — from E:\ CSV (ftp_dl_sales_chg_of_owner.csv)
  • pacs_land_details   — from Docker PACS (dbo.land_detail)
  • pacs_improvements   — from E:\ CSV (ftp_dl_imprv.csv)
  • pacs_improvement_details — from E:\ CSV (ftp_dl_imprv_detail.csv)
  • pacs_assessment_roll — from Docker PACS (dbo.property_val + dbo.owner + dbo.property)
  • pacs_property_profiles — from Docker PACS (dbo.property_profile)

Strategy:
  Docker PACS (tf-mssql): used for tables with 1000+ rows in pacs_oltp
  E:\ CSV exports: used for tables that are empty in Docker but have CSV data
    (imprv, imprv_detail, sales/chg_of_owner)

Requirements:
  py -3.12 -m pip install pyodbc requests python-dotenv --quiet

Usage:
  py -3.12 scripts/seed_pacs_domain_tables.py
  py -3.12 scripts/seed_pacs_domain_tables.py --dry-run
  py -3.12 scripts/seed_pacs_domain_tables.py --table owners
  py -3.12 scripts/seed_pacs_domain_tables.py --table sales,improvements
"""
from __future__ import annotations
import csv, json, os, sys, time, argparse
from pathlib import Path
from decimal import Decimal

# ── Dependencies ──────────────────────────────────────────────────────────────
try:
    import pyodbc
except ImportError:
    print("Missing: pyodbc  →  py -3.12 -m pip install pyodbc")
    sys.exit(1)
try:
    import requests
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env.seed")
except ImportError as e:
    print(f"Missing: {e.name}  →  py -3.12 -m pip install requests python-dotenv")
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────────
PACS_CONN = os.getenv(
    "PACS_ODBC_CONN",
    "DRIVER={SQL Server};SERVER=tcp:127.0.0.1,1433;UID=sa;PWD=TF_Pacs2026!;DATABASE=pacs_oltp;"
)
URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
EXPORTS_DIR = Path(os.getenv("BENTON_EXPORTS", r"E:\Exports\Exports\dataextract"))
BATCH_SIZE = 200
BENTON_FIPS = "53005"

# ── HTTP helpers ──────────────────────────────────────────────────────────────
from urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter

_session = requests.Session()
_retry = Retry(total=5, backoff_factor=1.0, status_forcelist=[429, 502, 503, 504],
               allowed_methods=["POST", "GET"])
_session.mount("https://", HTTPAdapter(max_retries=_retry))


def _hdr(repr_mode: bool = False) -> dict:
    pref = ("return=representation" if repr_mode else "return=minimal") + ",resolution=merge-duplicates"
    return {
        "apikey": KEY, "Authorization": f"Bearer {KEY}",
        "Content-Type": "application/json", "Prefer": pref,
    }


def _rest_get(path: str, params: dict | None = None) -> list:
    r = _session.get(f"{URL}/rest/v1/{path}", headers=_hdr(), params=params, timeout=60)
    r.raise_for_status()
    return r.json()


def bulk_upsert(table: str, rows: list, on_conflict: str, label: str = "", dry_run: bool = False) -> int:
    if dry_run:
        print(f"  DRY-RUN {table}: {len(rows):,} rows (not written)")
        return len(rows)
    total = len(rows)
    written = 0
    for i in range(0, total, BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        url = f"{URL}/rest/v1/{table}?on_conflict={on_conflict}"
        resp = _session.post(url, headers=_hdr(False), json=batch, timeout=120)
        if resp.status_code not in (200, 201):
            snippet = resp.text[:300].replace(KEY, "***")
            print(f"\n  ERROR {table} [{resp.status_code}]: {snippet}")
            continue
        written += len(batch)
        pct = min(100, int(written / total * 100))
        print(f"  {label or table}: {pct}%  ({written:,}/{total:,})", end="\r", flush=True)
        time.sleep(0.15)
    print()
    return written


# ── Value helpers ─────────────────────────────────────────────────────────────
def _s(v) -> str:
    return str(v).strip() if v is not None else ""

def _i(v, default=None):
    try:
        val = str(v).strip()
        return int(float(val)) if val else default
    except (ValueError, TypeError):
        return default

def _f(v, default=None):
    try:
        if isinstance(v, Decimal):
            return float(v)
        val = str(v).strip()
        return float(val) if val else default
    except (ValueError, TypeError):
        return default

def _date(v) -> str | None:
    val = _s(v)
    if not val: return None
    return val[:10]


# ── Get Benton county_id ─────────────────────────────────────────────────────
def get_county_id() -> str:
    rows = _rest_get("counties", {"fips_code": f"eq.{BENTON_FIPS}", "select": "id"})
    if not rows:
        raise RuntimeError("Benton County not found — run seed_benton_pacs.py first")
    return rows[0]["id"]


# ── PACS Docker SQL helpers ──────────────────────────────────────────────────
def pacs_query(sql: str) -> list[dict]:
    conn = pyodbc.connect(PACS_CONN, timeout=30)
    cur = conn.cursor()
    cur.execute(sql)
    cols = [c[0] for c in cur.description]
    rows = [dict(zip(cols, row)) for row in cur.fetchall()]
    conn.close()
    return rows


# ── CSV helpers ───────────────────────────────────────────────────────────────
def load_csv(path: Path) -> list[dict]:
    if not path.exists():
        print(f"  WARN: {path} not found — skipping")
        return []
    with open(path, newline="", encoding="utf-8", errors="replace") as f:
        return list(csv.DictReader(f))


def load_csv_dict(path: Path, key_col: str) -> dict[str, dict]:
    rows = load_csv(path)
    return {_s(r.get(key_col, "")): r for r in rows if _s(r.get(key_col, ""))}


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE SEEDERS
# ═══════════════════════════════════════════════════════════════════════════════

def seed_owners(county_id: str, dry_run: bool) -> int:
    """From Docker PACS: dbo.owner + dbo.account (3.5M + 203K rows)."""
    print("\n── pacs_owners (Docker PACS) ─────────────────────────────────────")
    sql = """
    WITH substantive_year AS (
      SELECT TOP 1 owner_tax_yr
      FROM dbo.owner GROUP BY owner_tax_yr HAVING COUNT(*) >= 1000
      ORDER BY owner_tax_yr DESC
    )
    SELECT TOP 50000
      o.prop_id, o.owner_id, a.file_as_name AS owner_name,
      o.pct_ownership, o.owner_tax_yr, o.sup_num
    FROM dbo.owner o
    JOIN dbo.account a ON a.acct_id = o.owner_id
    CROSS JOIN substantive_year sy
    WHERE o.owner_tax_yr = sy.owner_tax_yr
    """
    print("  Querying PACS ... ", end="", flush=True)
    rows = pacs_query(sql)
    print(f"{len(rows):,} rows")

    if not rows:
        print("  WARN: No owner data returned from PACS")
        return 0

    records = [{
        "county_id": county_id,
        "prop_id": int(r["prop_id"]),
        "owner_id": int(r["owner_id"]),
        "owner_name": _s(r.get("owner_name")),
        "pct_ownership": _f(r.get("pct_ownership")),
        "owner_tax_yr": _i(r.get("owner_tax_yr")),
        "sup_num": _i(r.get("sup_num"), 0),
    } for r in rows]

    return bulk_upsert("pacs_owners", records,
                       "county_id,prop_id,owner_id,owner_tax_yr,sup_num",
                       "owners", dry_run)


def seed_sales(county_id: str, dry_run: bool) -> int:
    """From E:\ CSV: ftp_dl_sales_chg_of_owner.csv (no chg_of_owner_id — generate hash)."""
    print("\n── pacs_sales (CSV) ─────────────────────────────────────────────")
    csv_path = EXPORTS_DIR / "ftp_dl_sales_chg_of_owner.csv"
    raw = load_csv(csv_path)
    print(f"  Loaded: {len(raw):,} rows from CSV")

    if not raw:
        return 0

    records = []
    for idx, r in enumerate(raw):
        prop_id = _i(r.get("prop_id"))
        sl_price = _f(r.get("sl_price"))
        sl_dt = _date(r.get("sl_dt"))
        if not prop_id:
            continue
        records.append({
            "county_id": county_id,
            "chg_of_owner_id": idx + 1,  # surrogate since CSV lacks this
            "prop_id": prop_id,
            "sale_price": sl_price,
            "sale_date": sl_dt,
            "sale_type_cd": _s(r.get("deed_type_cd")),
            "ratio_type_cd": _s(r.get("sl_ratio_type_cd")) or None,
            "hood_cd": None,  # not in CSV
        })

    return bulk_upsert("pacs_sales", records,
                       "county_id,chg_of_owner_id,prop_id",
                       "sales", dry_run)


def seed_land_details(county_id: str, dry_run: bool) -> int:
    """From Docker PACS: dbo.land_detail (619K rows)."""
    print("\n── pacs_land_details (Docker PACS) ───────────────────────────────")
    sql = """
    WITH substantive_year AS (
      SELECT TOP 1 prop_val_yr FROM dbo.land_detail
      GROUP BY prop_val_yr HAVING COUNT(*) >= 1000
      ORDER BY prop_val_yr DESC
    )
    SELECT TOP 50000
      ld.prop_id, ld.prop_val_yr, ld.sup_num,
      ld.land_seg_id, ld.land_type_cd, ld.land_class_code,
      ld.land_soil_code, ld.size_acres AS land_acres, ld.size_square_feet AS land_sqft,
      ld.land_adj_factor, ld.num_lots,
      ld.mkt_unit_price AS land_unit_price, ld.land_seg_mkt_val AS land_val,
      ld.ag_val
    FROM dbo.land_detail ld
    CROSS JOIN substantive_year sy
    WHERE ld.prop_val_yr = sy.prop_val_yr
      AND (ld.sale_id = 0 OR ld.sale_id IS NULL)
    """
    print("  Querying PACS ... ", end="", flush=True)
    rows = pacs_query(sql)
    print(f"{len(rows):,} rows")

    if not rows:
        print("  WARN: No land detail data returned from PACS")
        return 0

    records = [{
        "county_id": county_id,
        "prop_id": int(r["prop_id"]),
        "prop_val_yr": int(r["prop_val_yr"]),
        "sup_num": _i(r.get("sup_num"), 0),
        "land_seg_id": _i(r.get("land_seg_id"), 1),
        "land_type_cd": _s(r.get("land_type_cd")) or None,
        "land_class_code": _s(r.get("land_class_code")) or None,
        "land_soil_code": _s(r.get("land_soil_code")) or None,
        "land_acres": _f(r.get("land_acres")),
        "land_sqft": _f(r.get("land_sqft")),
        "land_adj_factor": _f(r.get("land_adj_factor")),
        "num_lots": _i(r.get("num_lots"), 1),
        "land_unit_price": _f(r.get("land_unit_price")),
        "land_val": _f(r.get("land_val")),
        "ag_val": _f(r.get("ag_val")),

    } for r in rows]

    return bulk_upsert("pacs_land_details", records,
                       "county_id,prop_id,prop_val_yr,sup_num,land_seg_id",
                       "land_details", dry_run)


def seed_improvements(county_id: str, dry_run: bool) -> int:
    """From E:\ CSV: ftp_dl_imprv.csv (Docker imprv table is empty)."""
    print("\n── pacs_improvements (CSV) ──────────────────────────────────────")
    csv_path = EXPORTS_DIR / "ftp_dl_imprv.csv"
    raw = load_csv(csv_path)
    print(f"  Loaded: {len(raw):,} rows from CSV")

    if not raw:
        return 0

    seen: dict[str, dict] = {}  # dedup by (prop_id, imprv_id) — last row wins
    for r in raw:
        prop_id = _i(r.get("prop_id"))
        imprv_id = _i(r.get("imprv_id"))
        if not prop_id or not imprv_id:
            continue
        key = f"{prop_id}_{imprv_id}"
        seen[key] = {
            "county_id": county_id,
            "prop_id": prop_id,
            "prop_val_yr": 2026,  # current tax year
            "sup_num": 0,
            "imprv_id": imprv_id,
            "imprv_type_cd": _s(r.get("primary_use_cd")) or None,
            "imprv_desc": _s(r.get("imprv_desc")) or None,
            "imprv_val": _f(r.get("imprv_val")),
        }
    records = list(seen.values())
    print(f"  After dedup: {len(records):,} unique (prop_id, imprv_id)")

    return bulk_upsert("pacs_improvements", records,
                       "county_id,prop_id,prop_val_yr,sup_num,imprv_id",
                       "improvements", dry_run)


def seed_improvement_details(county_id: str, dry_run: bool) -> int:
    """From E:\ CSV: ftp_dl_imprv_detail.csv (Docker imprv_detail table is empty)."""
    print("\n── pacs_improvement_details (CSV) ───────────────────────────────")
    csv_path = EXPORTS_DIR / "ftp_dl_imprv_detail.csv"
    raw = load_csv(csv_path)
    print(f"  Loaded: {len(raw):,} rows from CSV")

    if not raw:
        return 0

    # Group by (prop_id, imprv_id) and assign sequential imprv_det_id, then dedup
    from collections import defaultdict
    counters: dict[str, int] = defaultdict(int)
    seen: dict[str, dict] = {}  # dedup by full key

    for r in raw:
        prop_id = _i(r.get("prop_id"))
        imprv_id = _i(r.get("imprv_id"))
        if not prop_id or not imprv_id:
            continue
        group_key = f"{prop_id}_{imprv_id}"
        counters[group_key] += 1
        det_id = counters[group_key]
        dedup_key = f"{prop_id}_{imprv_id}_{det_id}"
        seen[dedup_key] = {
            "county_id": county_id,
            "prop_id": prop_id,
            "prop_val_yr": 2026,
            "sup_num": 0,
            "imprv_id": imprv_id,
            "imprv_det_id": det_id,
            "imprv_det_type_cd": _s(r.get("imprv_det_type_cd")) or None,
            "imprv_det_class_cd": _s(r.get("imprv_det_class_cd")) or None,
            "imprv_det_area": _f(r.get("imprv_det_area")),
            "actual_year_built": _i(r.get("yr_built")),
            "condition_cd": _s(r.get("condition_cd")) or None,
            "living_area": _f(r.get("living_area")),
        }
    records = list(seen.values())
    print(f"  After dedup: {len(records):,} unique detail rows")

    return bulk_upsert("pacs_improvement_details", records,
                       "county_id,prop_id,prop_val_yr,sup_num,imprv_id,imprv_det_id",
                       "imprv_details", dry_run)


def seed_assessment_roll(county_id: str, dry_run: bool) -> int:
    """From Docker PACS: property_val + owner + property (simplified — no wash_ tables)."""
    print("\n── pacs_assessment_roll (Docker PACS) ───────────────────────────")
    sql = """
    WITH substantive_year AS (
      SELECT TOP 1 prop_val_yr FROM dbo.property_val
      GROUP BY prop_val_yr HAVING COUNT(*) >= 1000
      ORDER BY prop_val_yr DESC
    )
    SELECT TOP 50000
      pv.prop_id, p.geo_id,
      o.owner_id, a.file_as_name AS owner_name,
      pv.land_hstd_val,
      pv.imprv_hstd_val,
      pv.appraised_val AS appraised_non_classified,
      s.situs_display,
      pv.prop_val_yr AS roll_year
    FROM dbo.property_val pv
    JOIN dbo.property p ON p.prop_id = pv.prop_id
    JOIN dbo.prop_supp_assoc psa ON psa.prop_id = pv.prop_id
      AND psa.owner_tax_yr = pv.prop_val_yr AND psa.sup_num = pv.sup_num
    JOIN dbo.owner o ON o.prop_id = pv.prop_id
      AND o.owner_tax_yr = pv.prop_val_yr AND o.sup_num = pv.sup_num
    JOIN dbo.account a ON a.acct_id = o.owner_id
    CROSS JOIN substantive_year sy
    LEFT JOIN dbo.situs s ON s.prop_id = pv.prop_id AND s.primary_situs = 'Y'
    WHERE pv.prop_val_yr = sy.prop_val_yr
      AND pv.prop_inactive_dt IS NULL
      AND p.prop_type_cd IN ('R','MH')
    """
    print("  Querying PACS ... ", end="", flush=True)
    rows = pacs_query(sql)
    print(f"{len(rows):,} rows")

    if not rows:
        print("  WARN: No assessment roll data returned from PACS")
        return 0

    # Dedup by (prop_id, roll_year) — keep first owner when multiple co-owners exist
    seen: dict[str, dict] = {}
    for r in rows:
        prop_id = int(r["prop_id"])
        roll_year = _i(r.get("roll_year"))
        key = f"{prop_id}_{roll_year}"
        if key in seen:
            continue  # keep first owner
        seen[key] = {
            "county_id": county_id,
            "prop_id": prop_id,
            "geo_id": _s(r.get("geo_id")) or None,
            "owner_id": _i(r.get("owner_id")),
            "owner_name": _s(r.get("owner_name")),
            "land_hstd_val": _f(r.get("land_hstd_val")),
            "imprv_hstd_val": _f(r.get("imprv_hstd_val")),
            "appraised_non_classified": _f(r.get("appraised_non_classified")),
            "situs_display": _s(r.get("situs_display")) or None,
            "roll_year": roll_year,
        }
    records = list(seen.values())
    print(f"  After dedup: {len(records):,} unique (prop_id, roll_year)")

    return bulk_upsert("pacs_assessment_roll", records,
                       "county_id,prop_id,roll_year",
                       "assessment_roll", dry_run)


def seed_property_profiles(county_id: str, dry_run: bool) -> int:
    """From Docker PACS: property_profile view (classification, building, land, site, mobile home)."""
    print("\n── pacs_property_profiles (Docker PACS) ─────────────────────────")
    sql = """
    WITH substantive_year AS (
      SELECT TOP 1 prop_val_yr FROM dbo.property_val
      GROUP BY prop_val_yr HAVING COUNT(*) >= 1
      ORDER BY prop_val_yr DESC
    )
    SELECT TOP 50000
      pp.prop_id, pp.prop_val_yr, pp.sup_num,
      pp.class_cd, pp.state_cd, pp.property_use_cd,
      pp.imprv_type_cd, pp.imprv_det_sub_class_cd, pp.num_imprv,
      pp.yr_blt, pp.actual_year_built, pp.eff_yr_blt, pp.actual_age,
      pp.living_area, pp.condition_cd, pp.percent_complete,
      pp.heat_ac_code,
      pp.class_cd_highvalueimprov AS class_cd_hv,
      pp.living_area_highvalueimprov AS living_area_hv,
      pp.imprv_unit_price, pp.imprv_add_val, pp.appraised_val,
      pp.land_type_cd, pp.land_sqft, pp.land_acres,
      pp.land_total_acres, pp.land_useable_acres, pp.land_useable_sqft,
      pp.land_front_feet, pp.land_depth, pp.land_num_lots, pp.land_total_sqft,
      pp.land_unit_price, pp.main_land_unit_price, pp.main_land_total_adj,
      pp.land_appr_method, pp.ls_table, pp.size_adj_pct,
      pp.neighborhood, pp.region, pp.abs_subdv, pp.subset AS subset_cd,
      pp.map_id, pp.sub_market_cd,
      pp.zoning, pp.characteristic_zoning1, pp.characteristic_zoning2,
      pp.characteristic_view, pp.visibility_access_cd,
      pp.road_access, pp.utilities, pp.topography,
      pp.school_id, pp.city_id, pp.last_appraisal_dt,
      pp.mbl_hm_make, pp.mbl_hm_model, pp.mbl_hm_sn,
      pp.mbl_hm_hud_num, pp.mbl_hm_title_num
    FROM dbo.property_profile pp
    CROSS JOIN substantive_year sy
    WHERE pp.prop_val_yr = sy.prop_val_yr
    ORDER BY pp.prop_id
    """
    print("  Querying PACS ... ", end="", flush=True)
    rows = pacs_query(sql)
    print(f"{len(rows):,} rows")

    if not rows:
        print("  WARN: No property profiles returned from PACS")
        return 0

    # Dedup by (prop_id, prop_val_yr, sup_num)
    seen: dict[str, dict] = {}
    for r in rows:
        prop_id = int(r["prop_id"])
        yr = _i(r.get("prop_val_yr"))
        sup = _i(r.get("sup_num"), 0)
        key = f"{prop_id}_{yr}_{sup}"
        if key in seen:
            continue
        seen[key] = {
            "county_id": county_id,
            "prop_id": prop_id,
            "prop_val_yr": yr,
            "sup_num": sup,
            "class_cd": _s(r.get("class_cd")) or None,
            "state_cd": _s(r.get("state_cd")) or None,
            "property_use_cd": _s(r.get("property_use_cd")) or None,
            "imprv_type_cd": _s(r.get("imprv_type_cd")) or None,
            "imprv_det_sub_class_cd": _s(r.get("imprv_det_sub_class_cd")) or None,
            "num_imprv": _i(r.get("num_imprv")),
            "yr_blt": _i(r.get("yr_blt")),
            "actual_year_built": _i(r.get("actual_year_built")),
            "eff_yr_blt": _i(r.get("eff_yr_blt")),
            "actual_age": _i(r.get("actual_age")),
            "living_area": _f(r.get("living_area")),
            "condition_cd": _s(r.get("condition_cd")) or None,
            "percent_complete": _f(r.get("percent_complete")),
            "heat_ac_code": _s(r.get("heat_ac_code")) or None,
            "class_cd_highvalue_imprv": _s(r.get("class_cd_hv")) or None,
            "living_area_highvalue_imprv": _f(r.get("living_area_hv")),
            "imprv_unit_price": _f(r.get("imprv_unit_price")),
            "imprv_add_val": _f(r.get("imprv_add_val")),
            "appraised_val": _f(r.get("appraised_val")),
            "land_type_cd": _s(r.get("land_type_cd")) or None,
            "land_sqft": _f(r.get("land_sqft")),
            "land_acres": _f(r.get("land_acres")),
            "land_total_acres": _f(r.get("land_total_acres")),
            "land_useable_acres": _f(r.get("land_useable_acres")),
            "land_useable_sqft": _f(r.get("land_useable_sqft")),
            "land_front_feet": _f(r.get("land_front_feet")),
            "land_depth": _f(r.get("land_depth")),
            "land_num_lots": _i(r.get("land_num_lots")),
            "land_total_sqft": _f(r.get("land_total_sqft")),
            "land_unit_price": _f(r.get("land_unit_price")),
            "main_land_unit_price": _f(r.get("main_land_unit_price")),
            "main_land_total_adj": _f(r.get("main_land_total_adj")),
            "land_appr_method": _s(r.get("land_appr_method")) or None,
            "ls_table": _s(r.get("ls_table")) or None,
            "size_adj_pct": _f(r.get("size_adj_pct")),
            "neighborhood": _s(r.get("neighborhood")) or None,
            "region": _s(r.get("region")) or None,
            "abs_subdv": _s(r.get("abs_subdv")) or None,
            "subset_cd": _s(r.get("subset_cd")) or None,
            "map_id": _s(r.get("map_id")) or None,
            "sub_market_cd": _s(r.get("sub_market_cd")) or None,
            "zoning": _s(r.get("zoning")) or None,
            "characteristic_zoning1": _s(r.get("characteristic_zoning1")) or None,
            "characteristic_zoning2": _s(r.get("characteristic_zoning2")) or None,
            "characteristic_view": _s(r.get("characteristic_view")) or None,
            "visibility_access_cd": _s(r.get("visibility_access_cd")) or None,
            "road_access": _s(r.get("road_access")) or None,
            "utilities": _s(r.get("utilities")) or None,
            "topography": _s(r.get("topography")) or None,
            "school_id": _s(r.get("school_id")) or None,
            "city_id": _s(r.get("city_id")) or None,
            "last_appraisal_dt": _date(r.get("last_appraisal_dt")),
            "mbl_hm_make": _s(r.get("mbl_hm_make")) or None,
            "mbl_hm_model": _s(r.get("mbl_hm_model")) or None,
            "mbl_hm_sn": _s(r.get("mbl_hm_sn")) or None,
            "mbl_hm_hud_num": _s(r.get("mbl_hm_hud_num")) or None,
            "mbl_hm_title_num": _s(r.get("mbl_hm_title_num")) or None,
        }
    records = list(seen.values())
    print(f"  After dedup: {len(records):,} unique (prop_id, yr, sup)")

    return bulk_upsert("pacs_property_profiles", records,
                       "county_id,prop_id,prop_val_yr,sup_num",
                       "property_profiles", dry_run)


# ═══════════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════════

SEEDERS = {
    "owners": seed_owners,
    "sales": seed_sales,
    "land_details": seed_land_details,
    "improvements": seed_improvements,
    "improvement_details": seed_improvement_details,
    "assessment_roll": seed_assessment_roll,
    "property_profiles": seed_property_profiles,
}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed PACS domain tables into Supabase")
    parser.add_argument("--dry-run", action="store_true", help="Parse data but don't write")
    parser.add_argument("--table", help="Comma-separated tables to seed (default: all)")
    args = parser.parse_args()

    if not KEY:
        print("ERROR: SUPABASE_SERVICE_ROLE_KEY not set (check scripts/.env.seed)")
        sys.exit(1)

    print("TerraFusion — PACS Domain Tables Seeder")
    print(f"  Supabase: {URL}")
    print(f"  PACS:     {PACS_CONN.split('SERVER=')[1].split(';')[0] if 'SERVER=' in PACS_CONN else '?'}")
    print(f"  CSV dir:  {EXPORTS_DIR}")
    if args.dry_run:
        print("  MODE:     DRY-RUN (no writes)")

    county_id = get_county_id()
    print(f"  County:   Benton ({county_id})")

    tables = list(SEEDERS.keys())
    if args.table:
        tables = [t.strip() for t in args.table.split(",")]
        unknown = [t for t in tables if t not in SEEDERS]
        if unknown:
            print(f"  ERROR: Unknown tables: {unknown}")
            print(f"  Valid: {list(SEEDERS.keys())}")
            sys.exit(1)

    total = 0
    t0 = time.time()
    for name in tables:
        try:
            total += SEEDERS[name](county_id, args.dry_run)
        except Exception as e:
            print(f"\n  ERROR seeding {name}: {e}")
            continue

    elapsed = time.time() - t0
    print(f"\n{'DRY-RUN ' if args.dry_run else ''}DONE — {total:,} records across {len(tables)} tables in {elapsed:.1f}s")
