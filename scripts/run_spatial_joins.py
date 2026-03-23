#!/usr/bin/env python3
"""
TerraFusion OS — Benton Spatial Join Runner
============================================
Calls spatial_join_cursor RPC in a loop for each boundary layer.
Each RPC call processes BATCH parcels, keeping each round-trip within
the Supabase 8s statement timeout.

Requires:
  1. parcels.situs_point_wgs84 populated (run backfill_centroids.py first)
  2. Boundary layers seeded in gis_features with .geom PostGIS geometry
  3. Migration 20260322000022_spatial_join_cursor_rpc.sql pushed

Current layers and joins:
  Benton Reval Areas     -> RevalNum    -> reval_zone         (cycle area)
  Benton School Dists    -> DistrictNum -> school_district    (school district)

Usage:
  py -3.12 scripts/run_spatial_joins.py
  py -3.12 scripts/run_spatial_joins.py --dry-run
"""
from __future__ import annotations
import os, sys, time, argparse, json
from pathlib import Path
try:
    import requests
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env.seed")
except ImportError as e:
    print(f"Missing: {e.name}  ->  py -3.12 -m pip install requests python-dotenv")
    sys.exit(1)

URL  = os.environ["SUPABASE_URL"].rstrip("/")
KEY  = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

BENTON_COUNTY_ID = "842a6c54-c7c0-4b2d-aa43-0e3ba63fa57d"
NULL_UUID         = "00000000-0000-0000-0000-000000000000"
BATCH             = 1000  # parcels per cursor call (< 8s each)

# Each join: (layer_name_in_gis_layers, property_key_in_features, target_column_on_parcels)
# Layer IDs are resolved at runtime by name — no hardcoded UUIDs.
# target_column must exist on parcels (migration 20260322000008 adds reval_zone,
# school_district, fire_district, tax_code_area).
JOINS = [
    # Reval cycle zones 1-7 -> reval_zone
    ("Benton Reval Areas", "RevalNum", "reval_zone"),

    # School district -> school_district
    ("Benton School Districts", "DistrictNum", "school_district"),
]

def hdr():
    return {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

def check_situs_point_coverage() -> tuple[int, int]:
    """Returns (populated, total) situs_point_wgs84 counts."""
    r_total = requests.get(f"{URL}/rest/v1/parcels",
        headers={**hdr(), "Prefer": "count=planned"},
        params={"select": "id", "county_id": f"eq.{BENTON_COUNTY_ID}", "limit": 1},
        timeout=15)
    r_pop = requests.get(f"{URL}/rest/v1/parcels",
        headers={**hdr(), "Prefer": "count=planned"},
        params={"select": "id", "county_id": f"eq.{BENTON_COUNTY_ID}", "situs_point_wgs84": "not.is.null", "limit": 1},
        timeout=15)
    total = int(r_total.headers.get("content-range", "*/0").split("/")[-1])
    populated = int(r_pop.headers.get("content-range", "*/0").split("/")[-1])
    return populated, total

def run_spatial_join(layer_id: str, prop_key: str, target_col: str, dry_run: bool) -> dict:
    """Cursor-based spatial join: calls spatial_join_cursor in a loop so each
    round-trip stays within the Supabase 8s statement timeout."""
    if dry_run:
        print(f"  [DRY RUN] Would call spatial_join_cursor in a loop:")
        print(f"    layer_id={layer_id}  property_key={prop_key}  target_col={target_col}")
        return {"updated": 0, "dry_run": True}

    cursor  = NULL_UUID
    updated = 0
    batch_n = 0

    while True:
        r = requests.post(f"{URL}/rest/v1/rpc/spatial_join_cursor",
            headers=hdr(),
            json={
                "p_county_id":          BENTON_COUNTY_ID,
                "p_layer_id":           layer_id,
                "p_layer_property_key": prop_key,
                "p_target_column":      target_col,
                "p_cursor":             cursor,
                "p_batch":              BATCH,
            },
            timeout=30)

        if r.status_code >= 400:
            raise RuntimeError(f"RPC failed {r.status_code}: {r.text[:300]}")

        data     = r.json()
        updated += data.get("updated", 0)
        cursor   = data.get("next_cursor") or NULL_UUID
        done     = data.get("done", True)
        batch_n += 1

        if batch_n % 10 == 0:
            print(f"  ... batch {batch_n}  updated so far: {updated:,}", flush=True)

        if done:
            break

    return {"updated": updated}

def resolve_layer_id(layer_name: str) -> str:
    """Resolve a layer name to its UUID from gis_layers."""
    r = requests.get(f"{URL}/rest/v1/gis_layers",
        headers=hdr(),
        params={"select": "id", "name": f"eq.{layer_name}"},
        timeout=10)
    data = r.json()
    if not data:
        raise RuntimeError(f"Layer not found in gis_layers: {layer_name!r}")
    return data[0]["id"]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    print("=" * 60)
    print("TerraFusion — Benton Spatial Join Runner")
    if args.dry_run:
        print("  *** DRY RUN ***")
    print("=" * 60)

    # Preflight: check situs_point_wgs84 coverage
    print("\nPreflight: situs_point_wgs84 coverage...")
    populated, total = check_situs_point_coverage()
    pct = populated / total * 100 if total else 0
    print(f"  {populated:,} / {total:,} parcels have situs_point ({pct:.1f}%)")
    if pct < 50:
        print()
        print("  WARNING: Less than 50% of parcels have situs_point_wgs84.")
        print("  Run backfill_centroids.py first, then re-run this script.")
        if not args.dry_run:
            return 1

    if not JOINS:
        print()
        print("  No joins configured for existing parcels columns.")
        print()
        print("  To enable spatial joins, add columns via migration then uncomment in JOINS:")
        print("    - reval_zone     (Benton Reval Areas -> RevalNum)")
        print("    - school_district (Benton School Districts -> DistrictNum)")
        print()
        print("  Spatial join RPC is ready and working — columns are the only missing piece.")
        return 0

    errors = 0
    for layer_name, prop_key, target_col in JOINS:
        print(f"\n-- {layer_name}")
        print(f"   property_key={prop_key!r} -> parcels.{target_col}")
        t0 = time.time()
        try:
            layer_id = resolve_layer_id(layer_name)
            result = run_spatial_join(layer_id, prop_key, target_col, args.dry_run)
            elapsed = time.time() - t0
            print(f"   updated={result.get('updated',0):,}  ({elapsed:.1f}s)")
        except Exception as e:
            print(f"   ERROR: {e}")
            errors += 1

    print()
    print(f"{'='*60}")
    print(f"  Joins run: {len(JOINS) - errors}/{len(JOINS)}")
    return 0 if errors == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
