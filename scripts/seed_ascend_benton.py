#!/usr/bin/env python3
"""
TerraFusion OS — Benton County Ascend/Proval Data Seeder
=========================================================
Reads Benton County's pre-2015 Ascend/Proval data from Microsoft Access
.mdb files and seeds TerraFusion Supabase staging tables:

  • ascend_property     — master parcel/owner record (real_master)
  • ascend_improvements — building characteristics  (real_improv)
  • ascend_land         — lot details + utilities    (real_land)
  • ascend_sales        — transactions from real_land(sale1-3) + ascend_excise
  • ascend_values       — multi-year assessment history (ascend_values, 359K rows)
  • ascend_permits      — building permits           (permits)
  • parcels.lrsn        — backfills Ascend link on parcels table

Data Sources (Microsoft Access .mdb):
  Real_tables1.mdb:
    real_master   (72,838 rows) — master parcel + owner + 5-yr embedded values
    real_improv   (65,972 rows) — building characteristics
    real_land     (72,838 rows) — lot details + 3 embedded sales
  gis_manatron_2000.mdb:
    ascend_excise  (20,054 rows) — excise tax sale transactions
    ascend_values (359,733 rows) — multi-year assessment history (THE GOLDMINE)
    permits        (46,396 rows) — building permits

Requirements:
  py -3.12 -m pip install requests pyodbc python-dotenv

Configuration:
  Set SUPABASE_SERVICE_ROLE_KEY in environment OR scripts/.env.seed:
    SUPABASE_SERVICE_ROLE_KEY=eyJ...
    SUPABASE_URL=https://jzuculrmjuwrshramgye.supabase.co

Usage:
  py -3.12 scripts/seed_ascend_benton.py
  py -3.12 scripts/seed_ascend_benton.py --dry-run
  py -3.12 scripts/seed_ascend_benton.py --skip-values    (skip 359K history rows)
  py -3.12 scripts/seed_ascend_benton.py --table property  (single table)
  py -3.12 scripts/seed_ascend_benton.py --backfill-lrsn  (update parcels.lrsn)
"""

from __future__ import annotations

import os
import sys
import time
import argparse
from pathlib import Path
from datetime import date, datetime
from decimal import Decimal

# ── Dependency check ──────────────────────────────────────────────────────────

MISSING: list[str] = []
try:
    import requests
except ImportError:
    MISSING.append("requests")
try:
    import pyodbc
except ImportError:
    MISSING.append("pyodbc")
if MISSING:
    print(f"[seed_ascend] Missing: {', '.join(MISSING)}")
    print("  Install: py -3.12 -m pip install requests pyodbc python-dotenv")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    _seed_env = Path(__file__).parent / ".env.seed"
    if _seed_env.exists():
        load_dotenv(_seed_env)
    load_dotenv()
except ImportError:
    _seed_env = Path(__file__).parent / ".env.seed"
    if _seed_env.exists():
        for _line in _seed_env.read_text().splitlines():
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _, _v = _line.partition("=")
                os.environ.setdefault(_k.strip(), _v.strip())

# ── Configuration ─────────────────────────────────────────────────────────────

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://udjoodlluygvlqccwade.supabase.co").rstrip("/")
SERVICE_KEY  = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Ascend .mdb file paths (Benton County)
REAL_TABLES_MDB  = Path(os.getenv("ASCEND_REAL_MDB",
    r"e:\Files of SQL\Files of SQL\Asend and Proval\Real_tables1.mdb"))
GIS_MANATRON_MDB = Path(os.getenv("ASCEND_GIS_MDB",
    r"e:\Files of SQL\Files of SQL\Asend and Proval\gis_manatron_2000.mdb"))

# Benton County TerraFusion ID
BENTON_COUNTY_ID = os.getenv("BENTON_COUNTY_ID", "842a6c54-c7c0-4b2d-aa43-0e3ba63fa57d")

BATCH_SIZE = 250   # rows per REST upsert call
ACCESS_DRIVER = "Microsoft Access Driver (*.mdb, *.accdb)"

# ── HTTP helpers ──────────────────────────────────────────────────────────────

from urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter

_session = requests.Session()
_retry = Retry(total=5, backoff_factor=1.0, status_forcelist=[429, 502, 503, 504],
               allowed_methods=["POST", "GET"])
_session.mount("https://", HTTPAdapter(max_retries=_retry))


def _headers(return_repr: bool = False) -> dict[str, str]:
    return {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": ("return=representation" if return_repr else "return=minimal")
                  + ",resolution=merge-duplicates",
    }


def _upsert_batch(table: str, rows: list, on_conflict: str) -> None:
    if not rows:
        return
    url = f"{SUPABASE_URL}/rest/v1/{table}?on_conflict={on_conflict}"
    resp = _session.post(url, headers=_headers(), json=rows, timeout=120)
    if resp.status_code not in (200, 201):
        snippet = resp.text[:400].replace(SERVICE_KEY, "***")
        raise RuntimeError(f"upsert {table} [{resp.status_code}]: {snippet}")


def bulk_upsert(table: str, rows: list, on_conflict: str, label: str = "",
                dry_run: bool = False) -> None:
    if dry_run:
        print(f"  DRY-RUN {label or table}: {len(rows):,} rows (not written)")
        return
    total = len(rows)
    sent  = 0
    t0    = time.time()
    for i in range(0, total, BATCH_SIZE):
        chunk = rows[i: i + BATCH_SIZE]
        _upsert_batch(table, chunk, on_conflict)
        sent += len(chunk)
        pct = sent / total * 100
        elapsed = time.time() - t0
        print(f"  {label or table}: {sent:,}/{total:,} ({pct:.0f}%) — {elapsed:.1f}s", end="\r")
    print(f"  {label or table}: {total:,} rows written in {time.time() - t0:.1f}s    ")

# ── Access / pyodbc helpers ───────────────────────────────────────────────────

def _access_conn(mdb_path: Path) -> "pyodbc.Connection":
    """Open a read-only pyodbc connection to an Access .mdb file."""
    if not mdb_path.exists():
        raise FileNotFoundError(f"MDB not found: {mdb_path}")
    conn_str = (
        f"Driver={{{ACCESS_DRIVER}}};"
        f"DBQ={mdb_path};"
        "ReadOnly=True;"
    )
    return pyodbc.connect(conn_str, autocommit=True)


def _safe_str(val) -> str | None:
    if val is None:
        return None
    s = str(val).strip()
    return s if s else None


def _safe_int(val) -> int | None:
    if val is None:
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


def _safe_float(val) -> float | None:
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _safe_date(val) -> str | None:
    if val is None:
        return None
    if isinstance(val, (date, datetime)):
        return val.strftime("%Y-%m-%d")
    try:
        return str(val)[:10] if str(val).strip() else None
    except Exception:
        return None


def _safe_numeric(val) -> float | None:
    if val is None:
        return None
    if isinstance(val, Decimal):
        return float(val)
    try:
        return float(val)
    except (ValueError, TypeError):
        return None

# ── Table seeders ─────────────────────────────────────────────────────────────

def seed_property(dry_run: bool = False) -> None:
    print("\n[1/6] ascend_property (real_master → Real_tables1.mdb)")
    conn = _access_conn(REAL_TABLES_MDB)
    cur  = conn.cursor()
    cur.execute("SELECT * FROM real_master")
    cols = [d[0].lower() for d in cur.description]
    rows_out = []
    for raw in cur.fetchall():
        r = dict(zip(cols, raw))
        row = {
            "county_id":     BENTON_COUNTY_ID,
            "lrsn":          _safe_int(r.get("lrsn")),
            "pin":           _safe_str(r.get("pin")),
            "owner1":        _safe_str(r.get("owner1")),
            "owner2":        _safe_str(r.get("owner2")),
            "mail_addr":     _safe_str(r.get("mailaddr")),
            "mail_city":     _safe_str(r.get("mailcity")),
            "mail_state":    _safe_str(r.get("mailstat")),
            "mail_zip":      _safe_str(r.get("mailzip")),
            "loc_addr":      _safe_str(r.get("locaddr")),
            "loc_city":      _safe_str(r.get("loccity")),
            "loc_state":     _safe_str(r.get("locstate")),
            "loc_zip":       _safe_str(r.get("loczip")),
            "prop_class":    _safe_str(r.get("propclas")),
            "nei_desc":      _safe_str(r.get("neidesc")),
            "zoning":        _safe_str(r.get("zoning")),
            "zone_desc":     _safe_str(r.get("zonedesc")),
            "legal_ac":      _safe_float(r.get("legalac")),
            "legal1":        _safe_str(r.get("legal1")),
            "legal2":        _safe_str(r.get("legal2")),
            "legal3":        _safe_str(r.get("legal3")),
            "exempt1":       _safe_str(r.get("exempt1")), "exempt1_desc": _safe_str(r.get("exempt1d")),
            "exempt2":       _safe_str(r.get("exempt2")), "exempt2_desc": _safe_str(r.get("exempt2d")),
            "exempt3":       _safe_str(r.get("exempt3")), "exempt3_desc": _safe_str(r.get("exempt3d")),
            "exempt4":       _safe_str(r.get("exempt4")), "exempt4_desc": _safe_str(r.get("exempt4d")),
            "exempt5":       _safe_str(r.get("exempt5")), "exempt5_desc": _safe_str(r.get("exempt5d")),
            "assmnt1_date":  _safe_date(r.get("assmnt1d")), "chg_code1": _safe_str(r.get("chgcode1")), "chg_desc1": _safe_str(r.get("chgdesc1")),
            "assmnt2_date":  _safe_date(r.get("assmnt2d")), "chg_code2": _safe_str(r.get("chgcode2")), "chg_desc2": _safe_str(r.get("chgdesc2")),
            "assmnt3_date":  _safe_date(r.get("assmnt3d")), "chg_code3": _safe_str(r.get("chgcode3")), "chg_desc3": _safe_str(r.get("chgdesc3")),
            "assmnt4_date":  _safe_date(r.get("assmnt4d")), "chg_code4": _safe_str(r.get("chgcode4")), "chg_desc4": _safe_str(r.get("chgdesc4")),
            "assmnt5_date":  _safe_date(r.get("assmnt5d")), "chg_code5": _safe_str(r.get("chgcode5")), "chg_desc5": _safe_str(r.get("chgdesc5")),
            "land_val1": _safe_int(r.get("landval1")), "land_val2": _safe_int(r.get("landval2")), "land_val3": _safe_int(r.get("landval3")),
            "land_val4": _safe_int(r.get("landval4")), "land_val5": _safe_int(r.get("landval5")),
            "dwlg_val1": _safe_int(r.get("dwlgval1")), "dwlg_val2": _safe_int(r.get("dwlgval2")), "dwlg_val3": _safe_int(r.get("dwlgval3")),
            "dwlg_val4": _safe_int(r.get("dwlgval4")), "dwlg_val5": _safe_int(r.get("dwlgval5")),
            "oth_val1":  _safe_int(r.get("othval1")),  "oth_val2": _safe_int(r.get("othval2")),   "oth_val3": _safe_int(r.get("othval3")),
            "oth_val4":  _safe_int(r.get("othval4")),  "oth_val5": _safe_int(r.get("othval5")),
            "tot_val1":  _safe_int(r.get("totval1")),  "tot_val2": _safe_int(r.get("totval2")),   "tot_val3": _safe_int(r.get("totval3")),
            "tot_val4":  _safe_int(r.get("totval4")),  "tot_val5": _safe_int(r.get("totval5")),
            "taxland1":  _safe_int(r.get("taxland1")), "taxland2": _safe_int(r.get("taxland2")),  "taxland3": _safe_int(r.get("taxland3")),
            "taxland4":  _safe_int(r.get("taxland4")), "taxland5": _safe_int(r.get("taxland5")),
            "taxdwlg1":  _safe_int(r.get("taxdwlg1")), "taxdwlg2": _safe_int(r.get("taxdwlg2")), "taxdwlg3": _safe_int(r.get("taxdwlg3")),
            "taxdwlg4":  _safe_int(r.get("taxdwlg4")), "taxdwlg5": _safe_int(r.get("taxdwlg5")),
            "taxoth1":   _safe_int(r.get("taxoth1")),  "taxoth2":  _safe_int(r.get("taxoth2")),   "taxoth3":  _safe_int(r.get("taxoth3")),
            "taxoth4":   _safe_int(r.get("taxoth4")),  "taxoth5":  _safe_int(r.get("taxoth5")),
            "taxtot1":   _safe_int(r.get("taxtot1")),  "taxtot2":  _safe_int(r.get("taxtot2")),   "taxtot3":  _safe_int(r.get("taxtot3")),
            "taxtot4":   _safe_int(r.get("taxtot4")),  "taxtot5":  _safe_int(r.get("taxtot5")),
        }
        if row["lrsn"] is not None:
            rows_out.append(row)
    conn.close()
    bulk_upsert("ascend_property", rows_out, "county_id,lrsn", dry_run=dry_run)


def seed_improvements(dry_run: bool = False) -> None:
    print("\n[2/6] ascend_improvements (real_improv → Real_tables1.mdb)")
    conn = _access_conn(REAL_TABLES_MDB)
    cur  = conn.cursor()
    cur.execute("SELECT * FROM real_improv")
    cols = [d[0].lower() for d in cur.description]
    rows_out = []
    for raw in cur.fetchall():
        r = dict(zip(cols, raw))
        row = {
            "county_id":   BENTON_COUNTY_ID,
            "lrsn":        _safe_int(r.get("lrsn")),
            "pin":         _safe_str(r.get("pin")),
            "impr_type":   _safe_str(r.get("imprtype")),
            "use_code":    _safe_str(r.get("usecode")),
            "use_desc":    _safe_str(r.get("usedesc")),
            "yr_built":    _safe_int(r.get("yrbuilt")),
            "fin_size":    _safe_int(r.get("finsize")),
            "stories":     _safe_str(r.get("stories")),
            "cond_code":   _safe_str(r.get("condcode")),
            "cond_desc":   _safe_str(r.get("conddesc")),
            "const_frame": _safe_str(r.get("constfr")),
            "foundation":  _safe_str(r.get("foundat")),
            "roof_type":   _safe_str(r.get("rooftype")),
            "roof_mat":    _safe_str(r.get("roofmatc")),
            "num_rooms":   _safe_int(r.get("numrms")),
            "num_bedrooms":_safe_int(r.get("numbdrms")),
            "num_baths_2": _safe_str(r.get("num2baths")),
            "num_baths_3": _safe_str(r.get("num3baths")),
            "num_baths_4": _safe_str(r.get("num4baths")),
            "heat_fuel":   _safe_str(r.get("heatfuel")),
            "heat_type":   _safe_str(r.get("heattype")),
            "heat_desc":   _safe_str(r.get("heatdesc")),
            "central_ac":  _safe_str(r.get("centrlac")),
            "attic":       _safe_str(r.get("attic")),
            "attic_fin":   _safe_str(r.get("atticfin")),
            "bsmt_area":   _safe_str(r.get("bsmtarea")),
            "bsmt_fin":    _safe_str(r.get("bsmtfin")),
            "att_gar_sf":  _safe_str(r.get("attgarsf")),
            "det_gar_sf":  _safe_str(r.get("detgarsf")),
            "deck_sf":     _safe_str(r.get("decksf")),
            "lower_area":  _safe_str(r.get("lowerarea")),
            "lower_fin":   _safe_str(r.get("lowerfin")),
            "sketch":      _safe_str(r.get("sketch")),
            "photo":       _safe_str(r.get("photo")),
            "imp_stat":    _safe_str(r.get("impstat")),
            "last_upd_date": _safe_date(r.get("lastupdd")),
        }
        # impr_type defaults to 'PRIMARY' when blank so the UNIQUE constraint works
        if row["impr_type"] is None:
            row["impr_type"] = "PRIMARY"
        if row["lrsn"] is not None:
            rows_out.append(row)
    conn.close()
    bulk_upsert("ascend_improvements", rows_out, "county_id,lrsn,impr_type", dry_run=dry_run)


def seed_land(dry_run: bool = False) -> None:
    print("\n[3/6] ascend_land (real_land → Real_tables1.mdb)")
    conn = _access_conn(REAL_TABLES_MDB)
    cur  = conn.cursor()
    cur.execute("SELECT * FROM real_land")
    cols = [d[0].lower() for d in cur.description]
    rows_out = []
    for raw in cur.fetchall():
        r = dict(zip(cols, raw))
        row = {
            "county_id":    BENTON_COUNTY_ID,
            "lrsn":         _safe_int(r.get("lrsn")),
            "pin":          _safe_str(r.get("pin")),
            "acres":        _safe_float(r.get("acres")),
            "sqft":         _safe_str(r.get("sqft")),
            "shape":        _safe_str(r.get("shape")),
            "front_siz":    _safe_str(r.get("frontsiz")),
            "rear_siz":     _safe_str(r.get("rearsiz")),
            "lien_date":    _safe_str(r.get("liendate")),
            "num_dwlg":     _safe_int(r.get("numdwlg")),
            "num_oth":      _safe_int(r.get("numoth")),
            "num_impr":     _safe_int(r.get("numimp")),
            "lien_owner":   _safe_str(r.get("lienown")),
            "topo_cod1": _safe_str(r.get("topocod1")), "topo_des1": _safe_str(r.get("topodes1")),
            "topo_cod2": _safe_str(r.get("topocod2")), "topo_des2": _safe_str(r.get("topodes2")),
            "topo_cod3": _safe_str(r.get("topocod3")), "topo_des3": _safe_str(r.get("topodes3")),
            "elec": _safe_str(r.get("elec")), "gas":    _safe_str(r.get("gas")),
            "water":_safe_str(r.get("water")), "sewer": _safe_str(r.get("sewer")),
            "cable":_safe_str(r.get("cable")), "well":  _safe_str(r.get("well")),
            "septic":_safe_str(r.get("septic")),
            "land_typ1": _safe_str(r.get("landtyp1")), "land_des1": _safe_str(r.get("landdes1")),
            "land_typ2": _safe_str(r.get("landtyp2")), "land_des2": _safe_str(r.get("landdes2")),
            "land_typ3": _safe_str(r.get("landtyp3")), "land_des3": _safe_str(r.get("landdes3")),
            "land_typ4": _safe_str(r.get("landtyp4")), "land_des4": _safe_str(r.get("landdes4")),
            "land_typ5": _safe_str(r.get("landtyp5")), "land_des5": _safe_str(r.get("landdes5")),
            "impervious_sf": _safe_str(r.get("impervsf")),
            "gis_upd_date":  _safe_str(r.get("gisupdd")),
            "adm_upd_date":  _safe_str(r.get("admupdd")),
        }
        if row["lrsn"] is not None:
            rows_out.append(row)
    conn.close()
    bulk_upsert("ascend_land", rows_out, "county_id,lrsn", dry_run=dry_run)


def seed_sales(dry_run: bool = False) -> None:
    print("\n[4/6] ascend_sales")
    rows_out: list[dict] = []

    # ── Source A: 3 embedded sales in real_land ───────────────────────────────
    print("       reading real_land embedded sales...")
    conn = _access_conn(REAL_TABLES_MDB)
    cur  = conn.cursor()
    cur.execute("SELECT lrsn, pin, sale1d, sale1amt, grantor1, doc1ref, doc1type, "
                "sale2d, sale2amt, grantor2, doc2ref, doc2type, "
                "sale3d, sale3amt, grantor3, doc3ref, doc3type FROM real_land")
    for row in cur.fetchall():
        (lrsn, pin,
         s1d, s1a, g1, d1r, d1t,
         s2d, s2a, g2, d2r, d2t,
         s3d, s3a, g3, d3r, d3t) = row
        lrsn_int = _safe_int(lrsn)
        if lrsn_int is None:
            continue
        for sale_date, sale_amt, grantor, doc_ref, doc_type in [
            (s1d, s1a, g1, d1r, d1t),
            (s2d, s2a, g2, d2r, d2t),
            (s3d, s3a, g3, d3r, d3t),
        ]:
            if sale_date is None and sale_amt in (None, 0):
                continue
            rows_out.append({
                "county_id":  BENTON_COUNTY_ID,
                "lrsn":       lrsn_int,
                "pin":        _safe_str(pin),
                "sale_date":  _safe_date(sale_date),
                "sale_price": _safe_int(sale_amt),
                "grantor":    _safe_str(grantor),
                "doc_ref":    _safe_str(doc_ref),
                "doc_type":   _safe_str(doc_type),
                "source":     "land_record",
            })
    conn.close()

    # ── Source B: ascend_excise (formal excise transactions) ──────────────────
    print("       reading ascend_excise...")
    conn = _access_conn(GIS_MANATRON_MDB)
    cur  = conn.cursor()
    cur.execute("SELECT lrsn, pin, excise_number, portion_ind, grantor_name, "
                "gross_sale_price, mod_sales_price, document_date, received_date, "
                "remarks, rcrdg_number, excise_id FROM ascend_excise")
    for row in cur.fetchall():
        (lrsn, pin, excise_num, portion, grantor,
         gross, mod, doc_date, recv_date,
         remarks, rcrdg, excise_id) = row
        lrsn_int = _safe_int(lrsn)
        if lrsn_int is None:
            continue
        rows_out.append({
            "county_id":       BENTON_COUNTY_ID,
            "lrsn":            lrsn_int,
            "pin":             _safe_str(pin),
            "sale_date":       _safe_date(doc_date),
            "sale_price":      _safe_numeric(gross),
            "grantor":         _safe_str(grantor),
            "excise_number":   _safe_str(excise_num),
            "gross_sale_price":_safe_numeric(gross),
            "mod_sale_price":  _safe_numeric(mod),
            "portion_ind":     _safe_str(portion),
            "remarks":         _safe_str(remarks),
            "recording_number":_safe_str(rcrdg),
            "excise_id":       _safe_int(excise_id),
            "source":          "excise",
        })
    conn.close()

    print(f"       land_record + excise total: {len(rows_out):,} sale rows")
    bulk_upsert("ascend_sales", rows_out, "county_id,lrsn,sale_date,source", dry_run=dry_run)


def seed_values(dry_run: bool = False) -> None:
    print("\n[5/6] ascend_values (359,733 rows — multi-year assessment history)")
    conn = _access_conn(GIS_MANATRON_MDB)
    cur  = conn.cursor()
    cur.execute("SELECT lrsn, pin, tax_year, MKLND, MKIMP, MKTTL, "
                "CULND, CUIMP, CUTTL, TRV, AVR FROM ascend_values")
    rows_out = []
    for raw in cur.fetchall():
        lrsn, pin, tax_year, mklnd, mkimp, mkttl, culnd, cuimp, cuttl, trv, avr = raw
        lrsn_int = _safe_int(lrsn)
        if lrsn_int is None:
            continue
        rows_out.append({
            "county_id": BENTON_COUNTY_ID,
            "lrsn":      lrsn_int,
            "pin":       _safe_str(pin),
            "tax_year":  _safe_str(tax_year),
            "mklnd":     _safe_float(mklnd),
            "mkimp":     _safe_float(mkimp),
            "mkttl":     _safe_float(mkttl),
            "culnd":     _safe_float(culnd),
            "cuimp":     _safe_float(cuimp),
            "cuttl":     _safe_float(cuttl),
            "trv":       _safe_float(trv),
            "avr":       _safe_float(avr),
        })
    conn.close()
    bulk_upsert("ascend_values", rows_out, "county_id,lrsn,tax_year", dry_run=dry_run)


def seed_permits(dry_run: bool = False) -> None:
    print("\n[6/6] ascend_permits (gis_manatron.permits)")
    conn = _access_conn(GIS_MANATRON_MDB)
    cur  = conn.cursor()
    cur.execute("SELECT lrsn, permit_ref, status, field_number, cost_estimate, "
                "sq_ft, filing_date, callback, inactivedate, last_update, "
                "cert_for_occ, permit_desc, permit_type, permit_source FROM permits")
    rows_out = []
    for raw in cur.fetchall():
        (lrsn, permit_ref, status, field_num, cost_est,
         sq_ft, filing, callback, inactive, last_upd,
         cert, desc_, ptype, psource) = raw
        rows_out.append({
            "county_id":    BENTON_COUNTY_ID,
            "lrsn":         _safe_str(lrsn),
            "permit_ref":   _safe_str(permit_ref),
            "permit_type":  _safe_str(ptype),
            "permit_desc":  _safe_str(desc_),
            "status":       _safe_str(status),
            "cost_estimate":_safe_int(cost_est),
            "sq_ft":        _safe_int(sq_ft),
            "filing_date":  _safe_date(filing),
            "callback":     _safe_date(callback),
            "inactive_date":_safe_date(inactive),
            "last_update":  _safe_date(last_upd),
            "cert_for_occ": _safe_date(cert),
            "permit_source":_safe_str(psource),
        })
    conn.close()
    bulk_upsert("ascend_permits", rows_out, "county_id,lrsn,permit_ref", dry_run=dry_run)


def backfill_parcels_lrsn(dry_run: bool = False) -> None:
    """
    Fetches all ascend_property rows that have both lrsn and pin,
    then PATCHes parcels.lrsn via REST for matching parcel_number.
    """
    print("\n[bonus] Backfilling parcels.lrsn from ascend_property.pin...")
    # Fetch mapping from Supabase
    url = (f"{SUPABASE_URL}/rest/v1/ascend_property"
           f"?county_id=eq.{BENTON_COUNTY_ID}&select=lrsn,pin&pin=not.is.null")
    resp = _session.get(url, headers=_headers(), timeout=60)
    resp.raise_for_status()
    mapping = {row["pin"]: row["lrsn"] for row in resp.json() if row.get("lrsn")}
    print(f"  {len(mapping):,} pin→lrsn mappings loaded")

    if dry_run:
        print(f"  DRY-RUN: would PATCH {len(mapping):,} parcel rows")
        return

    updated = 0
    for pin, lrsn in mapping.items():
        patch_url = (f"{SUPABASE_URL}/rest/v1/parcels"
                     f"?parcel_number=eq.{pin}&lrsn=is.null")
        r = _session.patch(patch_url,
                           headers={**_headers(), "Prefer": "return=minimal"},
                           json={"lrsn": lrsn}, timeout=30)
        if r.status_code in (200, 204):
            updated += 1
        elif r.status_code != 404:
            print(f"  WARN patch parcel {pin}: {r.status_code}")
    print(f"  {updated:,} parcel rows updated with lrsn")

# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed Benton County Ascend/Proval data into TerraFusion Supabase")
    parser.add_argument("--dry-run",       action="store_true",
                        help="Parse & print row counts but do NOT write to Supabase")
    parser.add_argument("--skip-values",   action="store_true",
                        help="Skip the large ascend_values table (359K rows)")
    parser.add_argument("--table",         type=str, default=None,
                        choices=["property", "improvements", "land",
                                 "sales", "values", "permits"],
                        help="Run only a single table seeder")
    parser.add_argument("--backfill-lrsn", action="store_true",
                        help="Only backfill parcels.lrsn (no table seeds)")
    args = parser.parse_args()

    if not SERVICE_KEY and not args.dry_run:
        print("[seed_ascend] ERROR: SUPABASE_SERVICE_ROLE_KEY not set.")
        print("  Set it in environment or scripts/.env.seed")
        sys.exit(1)

    if args.backfill_lrsn:
        backfill_parcels_lrsn(dry_run=args.dry_run)
        return

    t_start = time.time()

    if args.table == "property" or args.table is None:
        seed_property(dry_run=args.dry_run)
    if args.table == "improvements" or args.table is None:
        seed_improvements(dry_run=args.dry_run)
    if args.table == "land" or args.table is None:
        seed_land(dry_run=args.dry_run)
    if args.table == "sales" or args.table is None:
        seed_sales(dry_run=args.dry_run)
    if (args.table == "values" or args.table is None) and not args.skip_values:
        seed_values(dry_run=args.dry_run)
    elif args.skip_values:
        print("\n[5/6] ascend_values — SKIPPED (--skip-values)")
    if args.table == "permits" or args.table is None:
        seed_permits(dry_run=args.dry_run)

    if args.table is None and not args.dry_run:
        backfill_parcels_lrsn(dry_run=args.dry_run)

    elapsed = time.time() - t_start
    print(f"\n✓ Ascend seeder complete in {elapsed:.1f}s")


if __name__ == "__main__":
    main()
