"""Seed the 3 remaining GIS layers (jurisdictions, taxing-districts, neighborhoods).
Parcels already seeded (72,512). This avoids re-reading the parcel layer."""
from __future__ import annotations
import json, math, os, sys, time
from pathlib import Path

try:
    import pyogrio, requests, geopandas as gpd
    import shapely.geometry
except ImportError as e:
    print(f"Missing: {e.name}")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

FGDB = os.getenv("BENTON_FGDB_PATH", r"E:\Benton_County_Assessor.gdb")
URL = os.getenv("SUPABASE_URL", "https://udjoodlluygvlqccwade.supabase.co").rstrip("/")
KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkam9vZGxsdXlndmxxY2N3YWRlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDEyMTg5NywiZXhwIjoyMDg5Njk3ODk3fQ.VSpL5LPWlhw93x9CJQ2ISSzYbeTpU_3L-7BvBDFcCKc")

SOURCE_ID = "3f6a3c16-aa5e-462b-9922-df77d47a6998"  # existing data source
BATCH = 200

LAYERS = [
    {"label": "Benton Jurisdictions",     "candidates": ["CityLimits", "CommissionerDistrict"], "type": "boundary"},
    {"label": "Benton Taxing Districts",  "candidates": ["FireDistrict", "SchoolDistrict", "PortDistrict", "IrrigationDistrict", "PublicHospitalDistrict"], "type": "boundary"},
    {"label": "Benton Neighborhoods",     "candidates": ["RevalArea", "RevalArea_1"], "type": "polygon"},
]

def hdr():
    return {"apikey": KEY, "Authorization": f"Bearer {KEY}",
            "Content-Type": "application/json", "Prefer": "return=representation"}

def rest_post(table, payload):
    r = requests.post(f"{URL}/rest/v1/{table}", headers=hdr(), json=payload, timeout=120)
    if r.status_code >= 400:
        raise RuntimeError(f"{table} POST {r.status_code}: {r.text[:300]}")
    return r.json()

def simplify(coords, prec=6):
    if isinstance(coords, (int, float)):
        return round(coords, prec)
    if isinstance(coords, list):
        return [simplify(c, prec) for c in coords]
    return coords

def centroid(gt, coords):
    try:
        if gt == "Point": return coords[1], coords[0]
        ring = coords[0] if gt == "Polygon" else coords[0][0] if gt == "MultiPolygon" else None
        if ring:
            n = len(ring)
            return sum(c[1] for c in ring)/n, sum(c[0] for c in ring)/n
    except Exception:
        pass
    return None, None

def seed_layer(layer_name, label, layer_type):
    print(f"\n── {label} ({layer_name}) ──")
    t0 = time.time()
    gdf = pyogrio.read_dataframe(FGDB, layer=layer_name)
    if gdf.crs and gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs(epsg=4326)
    import warnings
    warnings.filterwarnings('ignore', 'GeoSeries.notna', UserWarning)
    gdf = gdf[gdf.geometry.notna() & ~gdf.geometry.is_empty]
    total = len(gdf)
    print(f"  {total} features read ({time.time()-t0:.1f}s)")

    minx, miny, maxx, maxy = gdf.total_bounds
    lr = rest_post("gis_layers", {
        "data_source_id": SOURCE_ID, "name": label,
        "layer_type": layer_type, "file_format": "gdb",
        "feature_count": total,
        "bounds": {"minLat": float(miny), "maxLat": float(maxy),
                   "minLng": float(minx), "maxLng": float(maxx)},
        "srid": 4326,
    })
    lid = lr[0]["id"] if isinstance(lr, list) else lr["id"]
    print(f"  Layer created: {lid}")

    gdf.columns = [str(c).lower().replace(" ","_").replace("-","_") for c in gdf.columns]
    inserted = errors = 0
    batch = []
    for _, row in gdf.iterrows():
        gj = shapely.geometry.mapping(row.geometry)
        gt = gj["type"]
        lat, lng = centroid(gt, gj["coordinates"])
        props = {}
        for col in gdf.columns:
            if col == "geometry": continue
            v = row[col]
            if v is None or (isinstance(v, float) and math.isnan(v)): continue
            if hasattr(v, "isoformat"): v = v.isoformat()
            props[col] = v
        batch.append({
            "layer_id": lid, "geometry_type": gt,
            "coordinates": simplify(gj["coordinates"]),
            "properties": props,
            "centroid_lat": round(lat, 6) if lat else None,
            "centroid_lng": round(lng, 6) if lng else None,
        })
        if len(batch) >= BATCH:
            try:
                rest_post("gis_features", batch)
                inserted += len(batch)
            except Exception as e:
                errors += len(batch)
                print(f"  [err@{inserted}] {e}")
            batch = []
            if inserted % 2000 == 0:
                el = time.time() - t0
                rate = inserted / el if el else 1
                print(f"  {inserted}/{total} ({rate:.0f}/s)", flush=True)
    if batch:
        try:
            rest_post("gis_features", batch)
            inserted += len(batch)
        except Exception as e:
            errors += len(batch)
    el = time.time() - t0
    print(f"  Done: {inserted}/{total} inserted, {errors} errors, {el:.1f}s")
    return inserted, errors

def main():
    print("=" * 50)
    print("Seed remaining GIS layers (3 of 4)")
    print("=" * 50)
    print(f"FGDB: {FGDB}")

    print("Scanning FGDB layers...", flush=True)
    available = {l[0] for l in pyogrio.list_layers(FGDB)}
    print(f"  {len(available)} layers in FGDB")

    total_ok = total_err = 0
    for ldef in LAYERS:
        found = None
        for c in ldef["candidates"]:
            if c in available:
                found = c
                break
        if not found:
            print(f"\n  SKIP {ldef['label']}: none of {ldef['candidates']} found")
            continue
        ins, err = seed_layer(found, ldef["label"], ldef["type"])
        total_ok += ins
        total_err += err

    print(f"\n{'='*50}")
    print(f"TOTAL: {total_ok} inserted, {total_err} errors")
    return 0

if __name__ == "__main__":
    sys.exit(main())
