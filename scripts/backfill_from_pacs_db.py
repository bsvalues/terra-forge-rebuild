#!/usr/bin/env python3
"""
TerraFusion OS — PACS Direct-DB Enrichment
============================================
Extracts neighborhood_code (hood_cd) and tax_code_area (tax_area_number)
from the live tf-mssql PACS container (pacs_oltp) and bulk-updates
Supabase parcels via the backfill_parcels_from_pacs RPC.

PACS queries:
  property JOIN property_val        → hood_cd (neighborhood_code)
  property JOIN property_tax_area
            JOIN tax_area           → tax_area_number (tax_code_area)

Requires:
  - tf-mssql container running: docker ps | grep tf-mssql
  - Supabase migration 20260322000009 applied (backfill_from_pacs RPC)
  - Supabase migration 20260322000008 applied (tax_code_area column)
  - pyodbc installed: py -3.12 -m pip install pyodbc
  - ODBC Driver: "SQL Server" (built-in on Windows)

Usage:
  py -3.12 scripts/backfill_from_pacs_db.py
  py -3.12 scripts/backfill_from_pacs_db.py --dry-run
  py -3.12 scripts/backfill_from_pacs_db.py --batch-size 2000
"""
from __future__ import annotations
import os, sys, time, argparse, json
from pathlib import Path
from decimal import Decimal

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

# ── PACS connection ────────────────────────────────────────────────────────────
PACS_CONN = os.getenv(
    "PACS_ODBC_CONN",
    "DRIVER={SQL Server};SERVER=tcp:127.0.0.1,1433;UID=sa;PWD=TF_Pacs2026!;DATABASE=pacs_oltp;"
)

# ── Supabase settings ─────────────────────────────────────────────────────────
URL = os.getenv("SUPABASE_URL", "https://udjoodlluygvlqccwade.supabase.co").rstrip("/")
KEY = os.getenv(
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkam9vZGxsdXlndmxxY2N3YWRlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDEyMTg5NywiZXhwIjoyMDg5Njk3ODk3fQ.VSpL5LPWlhw93x9CJQ2ISSzYbeTpU_3L-7BvBDFcCKg"
)

DEFAULT_BATCH_SIZE = 5000


def hdr() -> dict:
    return {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}


def extract_pacs_data(appr_yr: int) -> list[dict]:
    """
    Pull geo_id → {hood_cd, tax_area_number} for all real-property records.
    Joins property_val and property_tax_area in a single pass.
    """
    conn = pyodbc.connect(PACS_CONN, timeout=30)
    cur = conn.cursor()

    sql = """
    SELECT
        RTRIM(p.geo_id)         AS parcel_number,
        RTRIM(pv.hood_cd)       AS neighborhood_code,
        RTRIM(ta.tax_area_number) AS tax_code_area
    FROM dbo.property p
    JOIN dbo.property_val pv
        ON  p.prop_id              = pv.prop_id
        AND pv.prop_val_yr         = ?
        AND pv.prop_inactive_dt    IS NULL
    LEFT JOIN dbo.property_tax_area pta
        ON  p.prop_id              = pta.prop_id
        AND pta.year               = ?
    LEFT JOIN dbo.tax_area ta
        ON  pta.tax_area_id        = ta.tax_area_id
    WHERE p.prop_type_cd = ?
    ORDER BY p.prop_id
    """

    cur.execute(sql, (appr_yr, appr_yr, "R"))

    rows = []
    for row in cur.fetchall():
        parcel_number = row[0].strip() if row[0] else None
        hood = row[1].strip() if row[1] else None
        tax = row[2].strip() if row[2] else None

        if not parcel_number:
            continue
        # Skip hood_cd "0" which means "not set" in PACS
        if hood == "0":
            hood = None

        rows.append({
            "parcel_number":     parcel_number,
            "neighborhood_code": hood,
            "tax_code_area":     tax,
        })

    conn.close()
    return rows


def call_rpc(batch: list[dict]) -> dict:
    r = requests.post(
        f"{URL}/rest/v1/rpc/backfill_parcels_from_pacs",
        headers=hdr(),
        json={"p_data": batch},
        timeout=120,
    )
    if r.status_code == 404:
        raise RuntimeError(
            "RPC not found — push migration 20260322000009 first:\n"
            "  npx supabase db push  OR  run SQL in Supabase Studio"
        )
    if r.status_code >= 400:
        raise RuntimeError(f"RPC failed HTTP {r.status_code}: {r.text[:400]}")
    return r.json()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run",    action="store_true", help="Extract from PACS but skip Supabase writes")
    ap.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE, metavar="N",
                    help=f"Rows per RPC call (default: {DEFAULT_BATCH_SIZE})")
    args = ap.parse_args()

    print("=" * 60)
    print("TerraFusion — PACS Direct-DB Enrichment")
    if args.dry_run:
        print("  *** DRY RUN — no Supabase writes ***")
    print("=" * 60)

    # ── 1. Connect to PACS and get appraisal year ──────────────────────────────
    print("\nConnecting to PACS (tf-mssql)…", flush=True)
    try:
        conn_test = pyodbc.connect(PACS_CONN, timeout=10)
        cur = conn_test.cursor()
        cur.execute("SELECT appr_yr FROM pacs_system")
        appr_yr = int(cur.fetchone()[0])
        conn_test.close()
        print(f"  Connected. appr_yr = {appr_yr}")
    except Exception as e:
        print(f"  ERROR connecting to PACS: {e}")
        print("  Is tf-mssql running?  docker ps | grep tf-mssql")
        return 1

    # ── 2. Extract ─────────────────────────────────────────────────────────────
    print(f"\nExtracting R-property records for {appr_yr}…", flush=True)
    t0 = time.time()
    rows = extract_pacs_data(appr_yr)
    elapsed = time.time() - t0

    hood_count = sum(1 for r in rows if r["neighborhood_code"])
    tax_count  = sum(1 for r in rows if r["tax_code_area"])
    print(f"  {len(rows):,} records  ({elapsed:.1f}s)")
    print(f"  With neighborhood_code: {hood_count:,}")
    print(f"  With tax_code_area:     {tax_count:,}")

    if not rows:
        print("  Nothing to push.")
        return 0

    if args.dry_run:
        print(f"\n  [dry-run] Would push {len(rows):,} rows to backfill_parcels_from_pacs RPC")
        print("  Sample (first 3):")
        for r in rows[:3]:
            print(f"    {r}")
        return 0

    # ── 3. Push in batches ─────────────────────────────────────────────────────
    print(f"\nPushing to Supabase in batches of {args.batch_size:,}…", flush=True)
    total_hood = 0
    total_tax  = 0
    batches    = [rows[i:i+args.batch_size] for i in range(0, len(rows), args.batch_size)]
    t1 = time.time()

    for i, batch in enumerate(batches, 1):
        tb = time.time()
        try:
            result = call_rpc(batch)
            total_hood += result.get("neighborhood_code", 0)
            total_tax  += result.get("tax_code_area", 0)
            elapsed_b   = time.time() - tb
            print(f"  Batch {i}/{len(batches)}: {len(batch):,} rows  "
                  f"hood={result.get('neighborhood_code',0):,}  "
                  f"tax={result.get('tax_code_area',0):,}  "
                  f"({elapsed_b:.1f}s)")
        except Exception as e:
            print(f"  Batch {i}/{len(batches)} FAILED: {e}")
            return 1

    total_elapsed = time.time() - t1
    print()
    print("=" * 60)
    print(f"  neighborhood_code updated: {total_hood:,}")
    print(f"  tax_code_area updated:     {total_tax:,}")
    print(f"  Elapsed:                   {total_elapsed:.1f}s")
    print()
    print("  Done. Next: py -3.12 scripts/run_spatial_joins.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
