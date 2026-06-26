#!/usr/bin/env python3
"""
TerraFusion OS — Benton Centroid Backfill
==========================================
Copies centroid_lat/centroid_lng from the ArcGIS parcel layer (gis_features)
→ parcels.latitude_wgs84 / longitude_wgs84.

The DB trigger trg_sync_situs_point then auto-computes situs_point_wgs84,
which is required for assign_parcels_from_polygon_layer (spatial joins).

Primary mode: cursor-based RPC loop (backfill_centroids_cursor) — stays
within Supabase free-tier 8 s statement timeout.
Requires migration 20260322000016_centroids_cursor_rpc.sql.

Fallback mode (--no-rpc): per-row PATCH via 8 keep-alive workers.
Avoid the fallback for bulk runs; Supabase CDN blocks IPs after ~4k rapid PATCH
requests from the same address.

Usage:
  py -3.12 scripts/backfill_centroids.py            # cursor RPC mode (recommended)
  py -3.12 scripts/backfill_centroids.py --dry-run  # count only, no writes
  py -3.12 scripts/backfill_centroids.py --no-rpc   # per-row PATCH fallback
"""
from __future__ import annotations
import os, sys, time, argparse, math, threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
try:
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env.seed")
except ImportError as e:
    print(f"Missing: {e.name}  →  py -3.12 -m pip install requests python-dotenv")
    sys.exit(1)

URL  = os.environ["SUPABASE_URL"].rstrip("/")
KEY  = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

PARCEL_LAYER_NAME = "Benton Parcels (ArcGIS)"
PAGE_SIZE         = 1000
WORKERS           = 8      # for --no-rpc fallback only
NULL_UUID         = "00000000-0000-0000-0000-000000000000"
BATCH             = 200    # rows per cursor call

_local = threading.local()

def _get_session() -> requests.Session:
    """Per-thread keep-alive HTTPS session — avoids repeated TLS handshakes."""
    if not hasattr(_local, "session"):
        s = requests.Session()
        retry = Retry(
            total=4,
            backoff_factor=0.5,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["PATCH"],
            raise_on_status=False,
        )
        s.mount("https://", HTTPAdapter(
            max_retries=retry,
            pool_connections=1,
            pool_maxsize=1,
        ))
        _local.session = s
    return _local.session


def hdr() -> dict:
    return {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}


# ── Cursor RPC mode ──────────────────────────────────────────────────────────

def run_cursor_rpc(dry_run: bool) -> int:
    """
    Cursor-based centroid backfill using backfill_centroids_cursor() RPC.
    Each batch of BATCH rows completes well within the 8 s statement timeout.
    Returns number of parcels updated.
    Requires migration 20260322000016_centroids_cursor_rpc.sql.
    """
    if dry_run:
        print("  [dry-run] would call rpc/backfill_centroids_cursor loop")
        return 0

    cursor  = NULL_UUID
    call_n  = 0
    total   = 0
    t0      = time.time()

    print(f"  Cursor loop (batch={BATCH}) ...", flush=True)

    while True:
        r = requests.post(
            f"{URL}/rest/v1/rpc/backfill_centroids_cursor",
            headers=hdr(),
            json={"_cursor": cursor, "_limit": BATCH},
            timeout=30,
        )
        if r.status_code == 404:
            raise RuntimeError(
                "RPC not found -- push migration 20260322000016 first"
            )
        if r.status_code >= 400:
            raise RuntimeError(f"RPC failed HTTP {r.status_code}: {r.text[:300]}")

        result  = r.json()
        updated = result.get("updated", 0)
        done    = result.get("done", False)
        cursor  = result.get("next_cursor") or NULL_UUID
        call_n += 1
        total  += updated

        if updated or call_n % 50 == 0:
            elapsed = time.time() - t0
            rate = total / elapsed if elapsed > 0 else 0
            print(f"  [{call_n:4d}] +{updated:3d}  total={total:,}  {rate:.0f}/s", flush=True)

        if done:
            break

    return total


# ── Per-row PATCH fallback ────────────────────────────────────────────────────

def patch_parcel(row: dict, dry_run: bool) -> bool:
    if dry_run:
        return True
    try:
        r = _get_session().patch(
            f"{URL}/rest/v1/parcels",
            headers=hdr(),
            params={"id": f"eq.{row['parcel_id']}"},
            json={
                "latitude_wgs84":  row["centroid_lat"],
                "longitude_wgs84": row["centroid_lng"],
                "situs_source":    "arcgis_centroid",
            },
            timeout=20,
        )
        return r.status_code < 400
    except Exception:
        return False


def get_parcel_layer_id() -> str:
    r = requests.get(
        f"{URL}/rest/v1/gis_layers",
        headers=hdr(),
        params={"select": "id", "name": f"eq.{PARCEL_LAYER_NAME}"},
        timeout=15,
    )
    data = r.json()
    if not isinstance(data, list) or not data:
        raise RuntimeError(f"Layer '{PARCEL_LAYER_NAME}' not found")
    return data[0]["id"]


def fetch_features_page(layer_id: str, offset: int) -> list[dict]:
    r = requests.get(
        f"{URL}/rest/v1/gis_features",
        headers=hdr(),
        params={
            "select": "parcel_id,centroid_lat,centroid_lng",
            "layer_id": f"eq.{layer_id}",
            "parcel_id": "not.is.null",
            "centroid_lat": "not.is.null",
            "order": "parcel_id.asc",
            "limit": PAGE_SIZE,
            "offset": offset,
        },
        timeout=60,
    )
    data = r.json()
    if not isinstance(data, list):
        raise RuntimeError(f"fetch_features_page offset={offset} HTTP {r.status_code}: {data}")
    return data


def count_linked_features(layer_id: str) -> int:
    r = requests.get(
        f"{URL}/rest/v1/gis_features",
        headers={**hdr(), "Prefer": "count=planned"},
        params={"select": "id", "layer_id": f"eq.{layer_id}",
                "parcel_id": "not.is.null", "centroid_lat": "not.is.null", "limit": 1},
        timeout=15,
    )
    cr = r.headers.get("content-range", "*/70734")
    try:
        return int(cr.split("/")[-1])
    except (ValueError, IndexError):
        return 70734


def run_per_row_patch(layer_id: str, dry_run: bool) -> tuple[int, int]:
    """Returns (updated, errors)."""
    total = count_linked_features(layer_id)
    print(f"  Linked features: {total:,}  (per-row PATCH — consider RPC mode)")
    pages = math.ceil(total / PAGE_SIZE)
    updated = errors = 0
    t0 = time.time()

    for page in range(pages):
        offset = page * PAGE_SIZE
        try:
            features = fetch_features_page(layer_id, offset)
        except RuntimeError as e:
            print(f"\n  FETCH ERROR: {e}")
            break
        if not features:
            break

        with ThreadPoolExecutor(max_workers=WORKERS) as pool:
            futures = {pool.submit(patch_parcel, row, dry_run): row for row in features}
            for fut in as_completed(futures):
                if fut.result():
                    updated += 1
                else:
                    errors += 1

        elapsed = time.time() - t0
        rate = updated / elapsed if elapsed > 0 else 0
        pct = min((page + 1) * PAGE_SIZE, total) / total * 100
        print(f"  {updated:,}/{total:,} ({pct:.1f}%) @ {rate:.0f}/s  errors={errors}", flush=True)

    return updated, errors


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="No writes")
    ap.add_argument("--no-rpc", action="store_true",
                    help="Skip RPC, use per-row PATCH (rate-limit risk)")
    args = ap.parse_args()

    print("=" * 55)
    print("TerraFusion — Benton Centroid Backfill")
    if args.dry_run:
        print("  *** DRY RUN — no writes ***")
    print("=" * 55)

    t0 = time.time()

    if not args.no_rpc:
        # ── Cursor RPC path ──
        try:
            updated = run_cursor_rpc(args.dry_run)
            elapsed = time.time() - t0
            print()
            print(f"{'='*55}")
            print(f"  Updated:  {updated:,}")
            print(f"  Elapsed:  {elapsed:.1f}s")
            if updated > 0 and not args.dry_run:
                print()
                print("  situs_point_wgs84 populated via DB trigger.")
                print("  Ready: py -3.12 scripts/run_spatial_joins.py")
            return 0
        except RuntimeError as e:
            print(f"\n  RPC ERROR: {e}")
            print("\n  Falling back to per-row PATCH ...\n")

    # ── Fallback: per-row PATCH ──
    layer_id = get_parcel_layer_id()
    print(f"  Parcel layer: {layer_id}")
    updated, errors = run_per_row_patch(layer_id, args.dry_run)

    elapsed = time.time() - t0
    print()
    print(f"{'='*55}")
    print(f"  Updated:  {updated:,}")
    print(f"  Errors:   {errors:,}")
    print(f"  Elapsed:  {elapsed:.1f}s")
    if errors == 0 and not args.dry_run:
        print()
        print("  situs_point_wgs84 populated via DB trigger.")
        print("  Ready: py -3.12 scripts/run_spatial_joins.py")
    return 0 if errors == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
