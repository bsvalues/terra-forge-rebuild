"""
TerraFusion OS — Benton GIS Direct DB Seed
═══════════════════════════════════════════
Reads Benton FGDB layers and inserts directly into the
gis_data_sources / gis_layers / gis_features tables
via Supabase REST API (service role = bypass RLS).

This avoids the Storage upload bottleneck for large files.

Prerequisites:
  pip install pyogrio geopandas requests python-dotenv

Run:
  python scripts/seed_benton_gis_direct.py
"""

from __future__ import annotations
import json, math, os, sys, time
from pathlib import Path
from typing import Any

# ── deps ──────────────────────────────────────────
try:
    import pyogrio, requests
except ImportError as e:
    print(f"Missing package: {e.name}.  pip install pyogrio geopandas requests")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    _seed_env = Path(__file__).parent / ".env.seed"
    if _seed_env.exists():
        load_dotenv(_seed_env)
    load_dotenv()
except ImportError:
    pass

# ── config ────────────────────────────────────────
FGDB_PATH = os.getenv("BENTON_FGDB_PATH", r"E:\Benton_County_Assessor.gdb")
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

SEED_LAYERS = [
    {"datasetId": "parcel-layer",     "label": "Benton Parcels",        "layerName": "Parcel",       "fallbacks": ["ParcelsAndAssess"], "layerType": "parcel"},
    {"datasetId": "jurisdictions",    "label": "Benton Jurisdictions",  "layerName": "CityLimits",   "fallbacks": ["CommissionerDistrict"], "layerType": "boundary"},
    {"datasetId": "taxing-districts", "label": "Benton Taxing Districts","layerName": "FireDistrict", "fallbacks": ["SchoolDistrict","PortDistrict","IrrigationDistrict","PublicHospitalDistrict"], "layerType": "boundary"},
    {"datasetId": "neighborhoods",    "label": "Benton Neighborhoods",  "layerName": "RevalArea",    "fallbacks": ["RevalArea_1"], "layerType": "polygon"},
]

BATCH_SIZE = 200  # rows per REST insert

# ── helpers ───────────────────────────────────────
def headers():
    return {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

def rest(method: str, table: str, payload=None, params: str = ""):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    if params:
        url += f"?{params}"
    r = getattr(requests, method)(url, headers=headers(),
                                  json=payload, timeout=120)
    if r.status_code >= 400:
        raise RuntimeError(f"REST {method.upper()} {table} → {r.status_code}: {r.text[:300]}")
    if r.text.strip():
        return r.json()
    return None


def resolve_layer(fgdb: str, primary: str, fallbacks: list[str]) -> str | None:
    layers = {row[0] for row in pyogrio.list_layers(fgdb)}
    for c in [primary, *fallbacks]:
        if c in layers:
            return c
    return None


def centroid(geom_type: str, coords):
    """Quick centroid from coordinates."""
    try:
        if geom_type == "Point":
            return coords[1], coords[0]
        elif geom_type == "Polygon" and coords:
            ring = coords[0]
            n = len(ring)
            if n == 0:
                return None, None
            sx = sum(c[0] for c in ring)
            sy = sum(c[1] for c in ring)
            return sy / n, sx / n
        elif geom_type == "MultiPolygon" and coords:
            ring = coords[0][0]
            n = len(ring)
            if n == 0:
                return None, None
            sx = sum(c[0] for c in ring)
            sy = sum(c[1] for c in ring)
            return sy / n, sx / n
        elif geom_type == "LineString" and coords:
            mid = coords[len(coords) // 2]
            return mid[1], mid[0]
    except Exception:
        pass
    return None, None


def simplify_coords(coords, geom_type: str, precision: int = 6):
    """Round coordinates to save space."""
    if isinstance(coords, (int, float)):
        return round(coords, precision)
    if isinstance(coords, list):
        return [simplify_coords(c, geom_type, precision) for c in coords]
    return coords


# ── seed one layer ────────────────────────────────
def seed_layer(layer_def: dict, source_id: str) -> dict:
    label = layer_def["label"]
    primary = layer_def["layerName"]
    fallbacks = layer_def["fallbacks"]
    layer_type = layer_def["layerType"]

    print(f"\n── {label.upper()} ──────────────────────────────")
    t0 = time.time()

    resolved = resolve_layer(FGDB_PATH, primary, fallbacks)
    if not resolved:
        print(f"  SKIP: none of {[primary, *fallbacks]} found in FGDB.")
        return {"label": label, "status": "skipped"}

    print(f"  Source layer: {resolved}")
    print(f"  Reading FGDB ...", end=" ", flush=True)
    import geopandas as gpd
    gdf = pyogrio.read_dataframe(FGDB_PATH, layer=resolved)
    if gdf.crs is not None and gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs(epsg=4326)
    # Drop null/empty geometry
    gdf = gdf[gdf.geometry.notna() & ~gdf.geometry.is_empty]
    total = len(gdf)
    print(f"{total} features")

    # Compute bounds
    minx, miny, maxx, maxy = gdf.total_bounds
    bounds = {"minLat": float(miny), "maxLat": float(maxy),
              "minLng": float(minx), "maxLng": float(maxx)}

    # Create gis_layers entry
    layer_row = rest("post", "gis_layers", {
        "data_source_id": source_id,
        "name": label,
        "layer_type": layer_type,
        "file_format": "gdb",
        "feature_count": total,
        "bounds": bounds,
        "srid": 4326,
    })
    layer_id = layer_row[0]["id"] if isinstance(layer_row, list) else layer_row["id"]
    print(f"  Created layer: {layer_id}")

    # Normalize column names
    gdf.columns = [str(c).lower().replace(" ", "_").replace("-", "_") for c in gdf.columns]

    # Batch insert features
    inserted = 0
    errors = 0
    batch = []

    for idx, row in gdf.iterrows():
        geom = row.geometry
        geom_type = geom.geom_type  # Point, Polygon, MultiPolygon, etc.
        # Map GeoJSON geometry
        import shapely.geometry
        geom_json = shapely.geometry.mapping(geom)
        coords = simplify_coords(geom_json["coordinates"], geom_type)
        lat, lng = centroid(geom_type, geom_json["coordinates"])

        # Collect non-geometry properties
        props = {}
        for col in gdf.columns:
            if col == "geometry":
                continue
            val = row[col]
            if val is None or (isinstance(val, float) and math.isnan(val)):
                continue
            # Convert non-serializable types
            if hasattr(val, "isoformat"):
                val = val.isoformat()
            props[col] = val

        batch.append({
            "layer_id": layer_id,
            "geometry_type": geom_type,
            "coordinates": coords,
            "properties": props,
            "centroid_lat": round(lat, 6) if lat is not None else None,
            "centroid_lng": round(lng, 6) if lng is not None else None,
        })

        if len(batch) >= BATCH_SIZE:
            try:
                rest("post", "gis_features", batch, "")
                inserted += len(batch)
            except Exception as e:
                errors += len(batch)
                print(f"\n  [batch error at {inserted}] {e}")
            batch = []
            if inserted % 5000 == 0:
                elapsed = time.time() - t0
                rate = inserted / elapsed if elapsed > 0 else 0
                eta = (total - inserted) / rate if rate > 0 else 0
                print(f"  {inserted}/{total} inserted ({rate:.0f}/s, ETA {eta:.0f}s)", flush=True)

    # Final batch
    if batch:
        try:
            rest("post", "gis_features", batch, "")
            inserted += len(batch)
        except Exception as e:
            errors += len(batch)
            print(f"\n  [final batch error] {e}")

    elapsed = time.time() - t0
    print(f"  Done: {inserted} inserted, {errors} errors, {elapsed:.1f}s")
    return {"label": label, "status": "success", "features": inserted, "errors": errors, "seconds": round(elapsed, 1)}


# ── main ──────────────────────────────────────────
def main() -> int:
    print("=" * 60)
    print("TerraFusion — Benton GIS Direct DB Seed")
    print("=" * 60)

    if not os.path.exists(FGDB_PATH):
        print(f"[ERROR] FGDB not found: {FGDB_PATH}")
        return 1
    if not SUPABASE_URL or not SERVICE_KEY:
        print("[ERROR] Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
        return 1

    print(f"FGDB:     {FGDB_PATH}")
    print(f"Supabase: {SUPABASE_URL}")

    # Ensure data source exists
    existing = rest("get", "gis_data_sources", params="source_type=eq.file_upload&limit=1")
    if existing and len(existing) > 0:
        source_id = existing[0]["id"]
        print(f"Using existing data source: {source_id}")
    else:
        src = rest("post", "gis_data_sources", {
            "name": "Benton County FGDB",
            "source_type": "file_upload",
            "sync_status": "success",
        })
        source_id = src[0]["id"] if isinstance(src, list) else src["id"]
        print(f"Created data source: {source_id}")

    results = []
    for layer_def in SEED_LAYERS:
        try:
            r = seed_layer(layer_def, source_id)
            results.append(r)
        except KeyboardInterrupt:
            print("\n[INTERRUPTED]")
            break
        except Exception as e:
            print(f"\n  [FAILED] {e}")
            results.append({"label": layer_def["label"], "status": "failed", "error": str(e)})

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    for r in results:
        status = r.get("status", "unknown")
        label = r.get("label", "?")
        if status == "success":
            print(f"  ✓ {label}: {r.get('features',0)} features ({r.get('seconds',0)}s)")
        elif status == "skipped":
            print(f"  − {label}: skipped")
        else:
            print(f"  ✗ {label}: {r.get('error','failed')}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
