#!/usr/bin/env python3
"""
TerraFusion OS — Benton Parcel Attribute Backfill (from ArcGIS features)
=========================================================================
Copies per-parcel attributes from gis_features.properties → parcels table.

Attributes handled here:
  year_built  ← properties.year_blt  (fill-in if parcels.year_built NULL)
  address     ← properties.situs_address  (fill-in if parcels.address NULL)
               address was fully populated from PACS; this is a safe no-op.

Uses cursor-based pagination (backfill_year_built_cursor RPC) to stay
within Supabase's ~10 s API statement timeout.
Requires migrations 20260322000010 through 20260322000014.

Run AFTER backfill_centroids.py (situs_point_wgs84 must be populated first).

Usage:
  py -3.12 scripts/backfill_parcel_attributes.py
  py -3.12 scripts/backfill_parcel_attributes.py --dry-run
"""
from __future__ import annotations
import os, sys, time, argparse
from pathlib import Path
try:
    import requests
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env.seed")
except ImportError as e:
    print(f"Missing: {e.name}  →  py -3.12 -m pip install requests python-dotenv")
    sys.exit(1)

URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

NULL_UUID = "00000000-0000-0000-0000-000000000000"
BATCH     = 500   # rows per cursor call — stays well under 10 s timeout


def hdr() -> dict:
    return {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="No writes")
    args = ap.parse_args()

    print("=" * 60)
    print("TerraFusion — Benton Parcel Attribute Backfill (ArcGIS)")
    if args.dry_run:
        print("  *** DRY RUN — no writes ***")
    print("=" * 60)

    if args.dry_run:
        print("  [dry-run] would call rpc/backfill_year_built_cursor (cursor loop)")
        return 0

    # ── year_built cursor loop ────────────────────────────────────────────────
    t0         = time.time()
    total_yr   = 0
    cursor     = NULL_UUID
    call_n     = 0

    print(f"  Backfilling year_built via cursor loop (batch={BATCH}) …", flush=True)

    while True:
        r = requests.post(
            f"{URL}/rest/v1/rpc/backfill_year_built_cursor",
            headers=hdr(),
            json={"_cursor": cursor, "_limit": BATCH},
            timeout=30,
        )
        if r.status_code == 404:
            print("\n  RPC not found — push migration 20260322000014 first")
            return 1
        if r.status_code >= 400:
            print(f"\n  Call {call_n+1} FAILED HTTP {r.status_code}: {r.text[:300]}")
            return 1

        result  = r.json()
        updated = result.get("updated", 0)
        done    = result.get("done", False)
        cursor  = result.get("next_cursor") or NULL_UUID
        call_n += 1
        total_yr += updated

        if updated or call_n % 20 == 0:
            print(f"  [{call_n:3d}] updated={updated:3d}  total={total_yr:,}  done={done}", flush=True)

        if done:
            break

    elapsed = time.time() - t0
    print()
    print(f"{'='*60}")
    print(f"  year_built filled: {total_yr:,}")
    print(f"  RPC calls made:    {call_n}")
    print(f"  Elapsed:           {elapsed:.1f}s")
    print()
    print("  Attributes written. Next: py -3.12 scripts/run_spatial_joins.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
