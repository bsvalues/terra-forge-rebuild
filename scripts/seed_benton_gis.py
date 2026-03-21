"""
TerraFusion OS — Benton GIS FGDB Seed Script
═══════════════════════════════════════════════════════════
Exports Benton FGDB layers → GeoJSON → Supabase Storage
then triggers the gis-parse edge function for each dataset.

Prerequisites:
  pip install pyogrio requests python-dotenv

Run this from the repo root:
  python scripts/seed_benton_gis.py

Environment variables (from .env or set in shell):
  SUPABASE_URL=https://<project>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

Optional overrides (all have defaults pointing to E: drive):
  BENTON_FGDB_PATH=E:\\Benton_County_Assessor.gdb
═══════════════════════════════════════════════════════════
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
import time
from pathlib import Path
from typing import Any

# ── Dependency guard ──────────────────────────────────────
missing: list[str] = []
try:
    import pyogrio
except ImportError:
    missing.append("pyogrio")
try:
    import requests
except ImportError:
    missing.append("requests")

if missing:
    print(f"[seed_benton_gis] Missing required packages: {', '.join(missing)}")
    print("  Install with:  pip install " + " ".join(missing))
    sys.exit(1)

try:
    from dotenv import load_dotenv
    # Try scripts/.env.seed first (has service role key), then repo root .env
    _seed_env = Path(__file__).parent / ".env.seed"
    if _seed_env.exists():
        load_dotenv(_seed_env)
    load_dotenv()  # repo root .env (won't overwrite already-set vars)
except ImportError:
    pass  # python-dotenv is optional; env vars can come from shell

# ── Configuration ─────────────────────────────────────────

FGDB_PATH = os.getenv("BENTON_FGDB_PATH", r"E:\Benton_County_Assessor.gdb")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
STORAGE_BUCKET = "gis-files"

# Canonical seed order: parcel geometry first so joins can resolve
SEED_LAYERS: list[dict[str, Any]] = [
    {
        "datasetId": "parcel-layer",
        "label": "Benton Parcels",
        "layerName": "Parcel",
        "fallbacks": ["ParcelsAndAssess"],
        "storagePrefix": "benton/parcel-layer",
    },
    {
        "datasetId": "jurisdictions",
        "label": "Benton Jurisdictions",
        "layerName": "CityLimits",
        "fallbacks": ["CommissionerDistrict"],
        "storagePrefix": "benton/jurisdictions",
    },
    {
        "datasetId": "taxing-districts",
        "label": "Benton Taxing Districts",
        "layerName": "FireDistrict",
        "fallbacks": ["SchoolDistrict", "PortDistrict", "IrrigationDistrict", "PublicHospitalDistrict"],
        "storagePrefix": "benton/taxing-districts",
    },
    {
        "datasetId": "neighborhoods",
        "label": "Benton Neighborhoods",
        "layerName": "RevalArea",
        "fallbacks": ["RevalArea_1"],
        "storagePrefix": "benton/neighborhoods",
    },
]


# ── Helpers ───────────────────────────────────────────────

def _supabase_headers(*, admin: bool = False) -> dict[str, str]:
    """Build Supabase auth headers. Service role is used for storage writes and edge calls."""
    if not SUPABASE_URL or not SERVICE_ROLE_KEY:
        raise EnvironmentError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set "
            "(via .env file or environment variables)."
        )
    return {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }


def _check_layer_exists(fgdb: str, layer_name: str) -> bool:
    try:
        layers = {row[0] for row in pyogrio.list_layers(fgdb)}
        return layer_name in layers
    except Exception:
        return False


def _resolve_layer(fgdb: str, primary: str, fallbacks: list[str]) -> str | None:
    """Return the first layer name that exists in fgdb, or None."""
    for candidate in [primary, *fallbacks]:
        if _check_layer_exists(fgdb, candidate):
            return candidate
    return None


def _export_to_geojson(fgdb: str, layer_name: str, output_path: str, max_features: int = 0) -> int:
    """
    Read a layer from FGDB and write as GeoJSON.
    Returns the feature count.
    Uses read_dataframe (geopandas), falling back to read_df (older pyogrio API).
    max_features=0 means read all.
    """
    try:
        gdf = pyogrio.read_dataframe(fgdb, layer=layer_name, max_features=max_features or None)
    except Exception:
        # pyogrio < 0.7 used read_df
        gdf = pyogrio.read_dataframe(fgdb, layer=layer_name)  # type: ignore[call-arg]

    # Re-project to WGS-84 (EPSG:4326) for GeoJSON compatibility
    if gdf.crs is not None and gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs(epsg=4326)

    # Drop rows with null geometry
    before = len(gdf)
    gdf = gdf[gdf.geometry.notna()]
    dropped = before - len(gdf)
    if dropped > 0:
        print(f"    Dropped {dropped} null-geometry row(s).")

    # Simplify column names: lowercase, replace spaces and special chars
    gdf.columns = [str(c).lower().replace(" ", "_").replace("-", "_") for c in gdf.columns]

    gdf.to_file(output_path, driver="GeoJSON")
    return len(gdf)


def _upload_to_storage(local_path: str, storage_path: str) -> str:
    """Upload a GeoJSON file to Supabase Storage. Returns the storage path."""
    url = f"{SUPABASE_URL}/storage/v1/object/{STORAGE_BUCKET}/{storage_path}"
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/geo+json",
        "x-upsert": "true",  # overwrite if exists (idempotent)
    }

    with open(local_path, "rb") as f:
        resp = requests.put(url, headers=headers, data=f, timeout=120)

    if resp.status_code not in (200, 201):
        raise RuntimeError(
            f"Storage upload failed ({resp.status_code}): {resp.text[:200]}"
        )

    return storage_path


def _invoke_gis_parse(file_name: str, layer_label: str) -> dict[str, Any]:
    """Call the gis-parse edge function to load a file into the DB."""
    url = f"{SUPABASE_URL}/functions/v1/gis-parse"
    resp = requests.post(
        url,
        headers=_supabase_headers(admin=True),
        json={"fileName": file_name, "layerName": layer_label},
        timeout=300,  # large GeoJSON can take a while
    )
    if resp.status_code != 200:
        raise RuntimeError(
            f"gis-parse call failed ({resp.status_code}): {resp.text[:400]}"
        )
    return resp.json()


# ── Seed runner ───────────────────────────────────────────

def seed_layer(layer_def: dict[str, Any], tmp_dir: str) -> dict[str, Any]:
    """Seed one Benton GIS layer. Returns a result dict."""
    label = layer_def["label"]
    primary = layer_def["layerName"]
    fallbacks = layer_def["fallbacks"]
    storage_prefix = layer_def["storagePrefix"]

    print(f"\n── {label.upper()} ──────────────────────────────────")
    t0 = time.time()

    resolved = _resolve_layer(FGDB_PATH, primary, fallbacks)
    if not resolved:
        print(f"  SKIP: none of {[primary, *fallbacks]} found in FGDB.")
        return {
            "datasetId": layer_def["datasetId"],
            "label": label,
            "status": "skipped",
            "reason": f"layer not found in FGDB (tried: {primary}, {', '.join(fallbacks)})",
        }

    print(f"  Source layer: {resolved}")

    # Export to temp GeoJSON
    geojson_filename = f"{layer_def['datasetId']}.geojson"
    local_path = os.path.join(tmp_dir, geojson_filename)
    print(f"  Exporting to GeoJSON ... ", end="", flush=True)
    feature_count = _export_to_geojson(FGDB_PATH, resolved, local_path)
    print(f"{feature_count} features")

    # Upload to Supabase Storage
    storage_path = f"{storage_prefix}/{geojson_filename}"
    print(f"  Uploading to Storage: {storage_path} ... ", end="", flush=True)
    _upload_to_storage(local_path, storage_path)
    print("done")

    # Trigger gis-parse
    print(f"  Calling gis-parse ... ", end="", flush=True)
    parse_result = _invoke_gis_parse(storage_path, label)
    features_stored: int = parse_result.get("features_stored", parse_result.get("featureCount", 0))
    print(f"{features_stored} features stored")

    return {
        "datasetId": layer_def["datasetId"],
        "label": label,
        "status": "success",
        "resolvedLayer": resolved,
        "featureCount": feature_count,
        "storageKey": storage_path,
        "featuresStored": features_stored,
        "durationMs": round((time.time() - t0) * 1000),
    }


def main() -> int:
    print("=" * 60)
    print("TerraFusion OS — Benton GIS FGDB Seed Script")
    print("=" * 60)

    # Validate prerequisites
    if not os.path.exists(FGDB_PATH):
        print(f"\n[ERROR] FGDB not found: {FGDB_PATH}")
        print("  Set BENTON_FGDB_PATH environment variable to the correct path.")
        return 1

    if not SUPABASE_URL or not SERVICE_ROLE_KEY:
        print("\n[ERROR] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")
        print("  Create a .env file in the repo root or export these variables.")
        return 1

    print(f"\nFGDB:      {FGDB_PATH}")
    print(f"Supabase:  {SUPABASE_URL}")
    print(f"Bucket:    {STORAGE_BUCKET}")
    print(f"Datasets:  {len(SEED_LAYERS)}")

    results: list[dict[str, Any]] = []

    with tempfile.TemporaryDirectory(prefix="tf_benton_gis_") as tmp_dir:
        for layer_def in SEED_LAYERS:
            try:
                result = seed_layer(layer_def, tmp_dir)
            except KeyboardInterrupt:
                print("\n\n[INTERRUPTED] Seed aborted by user.")
                break
            except Exception as exc:
                print(f"\n  [FAILED] {exc}")
                result = {
                    "datasetId": layer_def["datasetId"],
                    "label": layer_def["label"],
                    "status": "failed",
                    "error": str(exc),
                }
            results.append(result)

    # Summary
    print("\n" + "=" * 60)
    print("BENTON GIS SEED SUMMARY")
    print("=" * 60)
    total_features = 0
    for r in results:
        icon = {"success": "✓", "skipped": "–", "failed": "✗"}.get(r["status"], "?")
        detail = ""
        if r["status"] == "success":
            detail = f"  {r.get('featuresStored', 0)} features stored ({r.get('durationMs', 0)} ms)"
        elif r["status"] == "skipped":
            detail = f"  {r.get('reason', '')}"
        elif r["status"] == "failed":
            detail = f"  ERROR: {r.get('error', '')}"
        print(f"  {icon}  {r['label']}{detail}")
        total_features += r.get("featuresStored") or r.get("featureCount") or 0

    succeeded = sum(1 for r in results if r["status"] == "success")
    failed = sum(1 for r in results if r["status"] == "failed")
    skipped = sum(1 for r in results if r["status"] == "skipped")
    print()
    print(f"  Succeeded : {succeeded}")
    print(f"  Failed    : {failed}")
    print(f"  Skipped   : {skipped}")
    print(f"  Total GIS features stored: {total_features}")
    print()

    if failed > 0:
        print("[PARTIAL] Some datasets failed. Re-run after fixing errors above.")
        return 2

    if succeeded == 0:
        print("[WARN] No datasets were seeded. Check FGDB path and layer names.")
        return 3

    print("[SUCCESS] Benton GIS seed complete. Run bootstrap preflight to verify.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
