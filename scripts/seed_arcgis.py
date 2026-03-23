"""
TerraFusion OS — Benton County ArcGIS REST API GIS Seeder
══════════════════════════════════════════════════════════
Pulls GIS layers from Benton County's ArcGIS Online REST API
and inserts into gis_data_sources / gis_layers / gis_features
via Supabase REST API (service role bypasses RLS).

ArcGIS base:
  https://services7.arcgis.com/NURlY7V8UHl6XumF/arcgis/rest/services

Usage:
  py -3.12 scripts/seed_arcgis.py                  # seed all layers
  py -3.12 scripts/seed_arcgis.py --layer parcels   # seed one layer
  py -3.12 scripts/seed_arcgis.py --skip-parcels    # skip parcels (large)
"""

from __future__ import annotations
import argparse, json, math, os, sys, time, uuid
from typing import Any

import requests

# ── Config ────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
REST = f"{SUPABASE_URL}/rest/v1"
HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}
HEADERS_REP = {**HEADERS, "Prefer": "return=representation"}

ARCGIS_BASE = "https://services7.arcgis.com/NURlY7V8UHl6XumF/arcgis/rest/services"

# Page size for ArcGIS queries (max 2000 per AGOL)
ARCGIS_PAGE = 2000
# Batch size for Supabase REST inserts
SB_BATCH = 200

# ── Layer definitions ─────────────────────────────────────────────────
LAYERS = [
    {
        "key": "parcels",
        "label": "Benton Parcels (ArcGIS)",
        "service": "Parcels_and_Assess",
        "layer_id": 0,
        "layer_type": "parcel",
        "id_field": "Prop_ID",
        "geom_type_expected": "Polygon",
    },
    {
        "key": "reval",
        "label": "Benton Reval Areas",
        "service": "RevalAreas",
        "layer_id": 0,
        "layer_type": "polygon",
        "id_field": None,
        "geom_type_expected": "Polygon",
    },
    {
        "key": "school",
        "label": "Benton School Districts",
        "service": "SchoolDistrict",
        "layer_id": 0,
        "layer_type": "boundary",
        "id_field": None,
        "geom_type_expected": "Polygon",
    },
    {
        "key": "irrigation",
        "label": "Benton Irrigation Districts",
        "service": "IrrigationDistrict",
        "layer_id": 0,
        "layer_type": "boundary",
        "id_field": None,
        "geom_type_expected": "Polygon",
    },
    {
        "key": "hospital",
        "label": "Benton Hospital Districts",
        "service": "HospitalDistrict",
        "layer_id": 0,
        "layer_type": "boundary",
        "id_field": None,
        "geom_type_expected": "Polygon",
    },
    {
        "key": "sales",
        "label": "Benton Sales History (Spatial)",
        "service": "SalesHistory",
        "layer_id": 0,
        "layer_type": "point",
        "id_field": "prop_id",
        "geom_type_expected": "Point",
    },
]


# ── Helpers ───────────────────────────────────────────────────────────
def sb_get(table: str, params: dict | None = None) -> list[dict]:
    """GET from Supabase REST."""
    r = requests.get(f"{REST}/{table}", headers=HEADERS, params=params or {}, timeout=30)
    r.raise_for_status()
    return r.json()


def sb_post(table: str, rows: list[dict]) -> requests.Response:
    """POST rows to Supabase REST (with retry for timeouts)."""
    for attempt in range(3):
        try:
            r = requests.post(f"{REST}/{table}", headers=HEADERS, json=rows, timeout=60)
            if r.status_code >= 400:
                print(f"  ERROR POST {table}: {r.status_code} {r.text[:300]}")
            return r
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            wait = 10 * (attempt + 1)
            print(f"  POST timeout/error: {e}, retrying in {wait}s (attempt {attempt+1}/3)...")
            time.sleep(wait)
    # Last attempt without catching
    return requests.post(f"{REST}/{table}", headers=HEADERS, json=rows, timeout=90)


def sb_delete(table: str, filter_str: str) -> int:
    """DELETE from Supabase with filter, return count."""
    h = {**HEADERS, "Prefer": "return=representation"}
    r = requests.delete(f"{REST}/{table}?{filter_str}", headers=h, timeout=60)
    if r.status_code >= 400:
        print(f"  ERROR DELETE {table}: {r.status_code} {r.text[:300]}")
        return 0
    try:
        return len(r.json())
    except Exception:
        return 0


def sb_delete_batched(table: str, filter_field: str, filter_value: str, batch_size: int = 50) -> int:
    """DELETE large number of rows in batches by querying IDs first."""
    total = 0
    while True:
        h_q = {**HEADERS, "Prefer": "return=representation"}
        r = requests.get(
            f"{REST}/{table}?{filter_field}=eq.{filter_value}&select=id&limit={batch_size}",
            headers=h_q, timeout=30,
        )
        if r.status_code not in (200, 206):
            break
        rows = r.json()
        if not rows:
            break
        ids_csv = ",".join(row["id"] for row in rows)
        h_d = {**HEADERS, "Prefer": "return=representation"}
        rd = requests.delete(f"{REST}/{table}?id=in.({ids_csv})", headers=h_d, timeout=60)
        if rd.status_code >= 400:
            print(f"  ERROR batch DELETE {table}: {rd.status_code} {rd.text[:200]}")
            break
        deleted = len(rd.json()) if rd.status_code in (200, 204) else 0
        total += deleted
        if total % 500 == 0:
            print(f"    Batch-deleted {total:,} rows from {table}...")
        time.sleep(0.1)
    return total


def arcgis_query_geojson(service: str, layer_id: int, offset: int = 0) -> dict:
    """Query ArcGIS FeatureServer for GeoJSON page with retry."""
    url = f"{ARCGIS_BASE}/{service}/FeatureServer/{layer_id}/query"
    params = {
        "where": "1=1",
        "outFields": "*",
        "outSR": "4326",
        "f": "geojson",
        "resultOffset": offset,
        "resultRecordCount": ARCGIS_PAGE,
    }
    for attempt in range(5):
        try:
            r = requests.get(url, params=params, timeout=120)
            if r.status_code == 503 or r.status_code == 429:
                wait = 10 * (attempt + 1)
                print(f"    ArcGIS {r.status_code}, retrying in {wait}s (attempt {attempt+1}/5)...")
                time.sleep(wait)
                continue
            r.raise_for_status()
            return r.json()
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            wait = 15 * (attempt + 1)
            print(f"    Connection error: {e}, retrying in {wait}s (attempt {attempt+1}/5)...")
            time.sleep(wait)
            continue
    r.raise_for_status()
    return r.json()


def arcgis_count(service: str, layer_id: int) -> int:
    """Get feature count from ArcGIS."""
    url = f"{ARCGIS_BASE}/{service}/FeatureServer/{layer_id}/query"
    r = requests.get(url, params={"where": "1=1", "returnCountOnly": "true", "f": "json"}, timeout=30)
    r.raise_for_status()
    return r.json().get("count", 0)


def geojson_to_sb_rows(
    features: list[dict], layer_uuid: str, geom_type: str, parcel_lookup: dict | None
) -> list[dict]:
    """Convert GeoJSON features to gis_features rows."""
    rows = []
    for f in features:
        geom = f.get("geometry")
        if not geom:
            continue
        props = f.get("properties", {})
        # Clean None values from props
        props = {k: v for k, v in props.items() if v is not None}

        coords = geom.get("coordinates", [])
        gtype = geom.get("type", geom_type)

        # Centroid
        clat, clng = None, None
        if gtype == "Point" and coords and len(coords) >= 2:
            clng, clat = coords[0], coords[1]
        elif gtype in ("Polygon", "MultiPolygon"):
            clat, clng = _centroid_from_coords(gtype, coords)

        # Parcel linkage via geo_id -> parcel_number
        parcel_uuid = None
        if parcel_lookup:
            gid = (props.get("geo_id") or props.get("Parcel_ID") or "").strip()
            if gid:
                parcel_uuid = parcel_lookup.get(gid)
            if not parcel_uuid:
                pid = str(props.get("prop_id") or props.get("Prop_ID") or props.get("prop_id_1") or "")
                if pid:
                    parcel_uuid = parcel_lookup.get(pid)

        row = {
            "layer_id": layer_uuid,
            "parcel_id": parcel_uuid,  # None if no match — all rows have same keys
            "geometry_type": gtype if gtype in ("Point", "LineString", "Polygon", "MultiPolygon") else geom_type,
            "coordinates": json.dumps(coords),
            "properties": json.dumps(props),
            "centroid_lat": float(clat) if clat is not None else None,
            "centroid_lng": float(clng) if clng is not None else None,
        }

        rows.append(row)
    return rows


def _centroid_from_coords(gtype: str, coords: Any) -> tuple:
    """Rough centroid from polygon coordinates."""
    try:
        if gtype == "Polygon" and coords:
            ring = coords[0]
        elif gtype == "MultiPolygon" and coords:
            ring = coords[0][0]
        else:
            return None, None
        if not ring:
            return None, None
        lats = [p[1] for p in ring]
        lngs = [p[0] for p in ring]
        return sum(lats) / len(lats), sum(lngs) / len(lngs)
    except Exception:
        return None, None


def load_parcel_lookup() -> dict:
    """Load parcel_number (geo_id) -> parcels.id lookup from Supabase."""
    print("Loading parcel lookup (parcel_number -> uuid)...")
    lookup = {}
    offset = 0
    page = 1000
    while True:
        h = {**HEADERS, "Range": f"{offset}-{offset + page - 1}"}
        r = requests.get(
            f"{REST}/parcels?select=id,parcel_number",
            headers=h,
            timeout=30,
        )
        if r.status_code == 416:  # Range not satisfiable = no more rows
            break
        rows = r.json() if r.status_code in (200, 206) else []
        if not rows:
            break
        for row in rows:
            pn = row.get("parcel_number", "").strip()
            if pn:
                lookup[pn] = row["id"]
        offset += len(rows)
        if len(rows) < page:
            break
    print(f"  Loaded {len(lookup)} parcel mappings")
    return lookup


# ── Main seeding logic ────────────────────────────────────────────────
def ensure_data_source() -> str:
    """Ensure ArcGIS data source exists, return its UUID."""
    existing = sb_get("gis_data_sources", {"source_type": "eq.arcgis"})
    if existing:
        ds_id = existing[0]["id"]
        print(f"Using existing ArcGIS data source: {ds_id}")
        return ds_id

    ds_id = str(uuid.uuid4())
    sb_post("gis_data_sources", [{
        "id": ds_id,
        "name": "Benton County ArcGIS Online",
        "source_type": "arcgis",
        "connection_url": ARCGIS_BASE,
        "sync_status": "syncing",
        "metadata": json.dumps({
            "org_id": "NURlY7V8UHl6XumF",
            "services_url": ARCGIS_BASE,
        }),
    }])
    print(f"Created ArcGIS data source: {ds_id}")
    return ds_id


def seed_layer(layer_def: dict, ds_id: str, parcel_lookup: dict | None,
               resume_offset: int = 0, resume_layer_uuid: str | None = None) -> int:
    """Seed one layer from ArcGIS into Supabase. Returns feature count."""
    key = layer_def["key"]
    label = layer_def["label"]
    service = layer_def["service"]
    lid = layer_def["layer_id"]
    ltype = layer_def["layer_type"]
    geom_type = layer_def["geom_type_expected"]

    print(f"\n{'='*60}")
    print(f"SEEDING: {label} ({service}/{lid})")
    print(f"{'='*60}")

    # Get count
    total = arcgis_count(service, lid)
    print(f"  ArcGIS feature count: {total:,}")
    if total == 0:
        print("  Skipping — no features")
        return 0

    if resume_offset > 0 and resume_layer_uuid:
        # Resume mode: skip delete/create, use existing layer UUID
        layer_uuid = resume_layer_uuid
        inserted = resume_offset  # approximate already-inserted count
        offset = resume_offset
        page_num = resume_offset // ARCGIS_PAGE
        print(f"  RESUMING from offset {resume_offset} into layer {layer_uuid}")
    else:
        # Delete existing layer data for this label
        existing_layers = sb_get("gis_layers", {
            "select": "id",
            "name": f"eq.{label}",
            "data_source_id": f"eq.{ds_id}",
        })
        for el in existing_layers:
            n = sb_delete_batched("gis_features", "layer_id", el['id'])
            print(f"  Deleted {n} old features from layer {el['id']}")
            sb_delete("gis_layers", f"id=eq.{el['id']}")
            print(f"  Deleted old layer {el['id']}")

        # Create layer
        layer_uuid = str(uuid.uuid4())
        sb_post("gis_layers", [{
            "id": layer_uuid,
            "data_source_id": ds_id,
            "name": label,
            "layer_type": ltype,
            "file_format": "geojson",
            "feature_count": 0,
            "srid": 4326,
            "properties_schema": json.dumps({
                "source": "arcgis",
                "service": service,
                "layer_id": lid,
            }),
        }])
        print(f"  Created layer: {layer_uuid}")
        inserted = 0
        offset = 0
        page_num = 0
    while offset < total:
        page_num += 1
        t0 = time.time()
        try:
            geojson = arcgis_query_geojson(service, lid, offset)
        except Exception as e:
            print(f"  ERROR fetching page {page_num} (offset {offset}): {e}")
            break

        features = geojson.get("features", [])
        if not features:
            break

        rows = geojson_to_sb_rows(
            features, layer_uuid, geom_type,
            parcel_lookup if layer_def.get("id_field") else None
        )

        # Insert in sub-batches
        for i in range(0, len(rows), SB_BATCH):
            batch = rows[i : i + SB_BATCH]
            r = sb_post("gis_features", batch)
            if r.status_code < 400:
                inserted += len(batch)

        elapsed = time.time() - t0
        pct = min(100, (offset + len(features)) / total * 100)
        linked = sum(1 for r in rows if r.get("parcel_id"))
        print(
            f"  Page {page_num}: {len(features)} features "
            f"({inserted:,}/{total:,} = {pct:.0f}%) "
            f"linked={linked} "
            f"[{elapsed:.1f}s]"
        )

        offset += len(features)
        # Safety: if we got fewer than expected, we're done
        if len(features) < ARCGIS_PAGE:
            break

    # Update layer feature_count
    requests.patch(
        f"{REST}/gis_layers?id=eq.{layer_uuid}",
        headers=HEADERS,
        json={"feature_count": inserted},
        timeout=30,
    )
    print(f"  DONE: {inserted:,} features inserted for {label}")
    return inserted


def main():
    parser = argparse.ArgumentParser(description="Seed Benton County GIS from ArcGIS REST API")
    parser.add_argument("--layer", help="Only seed this layer key (e.g. parcels, reval, school)")
    parser.add_argument("--skip-parcels", action="store_true", help="Skip the large parcels layer")
    parser.add_argument("--resume-offset", type=int, default=0, help="Resume from this ArcGIS offset (skip delete/create layer)")
    parser.add_argument("--resume-layer-uuid", help="Layer UUID to resume into (required with --resume-offset)")
    args = parser.parse_args()

    print("TerraFusion — Benton County ArcGIS GIS Seeder")
    print(f"ArcGIS base: {ARCGIS_BASE}")
    print(f"Supabase:    {SUPABASE_URL}")
    print()

    # Ensure data source
    ds_id = ensure_data_source()

    # Build parcel lookup for linking
    parcel_lookup = load_parcel_lookup()

    # Filter layers
    layers_to_seed = LAYERS
    if args.layer:
        layers_to_seed = [l for l in LAYERS if l["key"] == args.layer]
        if not layers_to_seed:
            print(f"Unknown layer key: {args.layer}")
            print(f"Available: {[l['key'] for l in LAYERS]}")
            sys.exit(1)
    elif args.skip_parcels:
        layers_to_seed = [l for l in LAYERS if l["key"] != "parcels"]

    grand_total = 0
    for layer_def in layers_to_seed:
        count = seed_layer(
            layer_def, ds_id, parcel_lookup,
            resume_offset=args.resume_offset,
            resume_layer_uuid=args.resume_layer_uuid,
        )
        grand_total += count

    # Update data source status
    requests.patch(
        f"{REST}/gis_data_sources?id=eq.{ds_id}",
        headers=HEADERS,
        json={
            "sync_status": "success",
            "last_sync_at": "now()",
        },
        timeout=30,
    )

    print(f"\n{'='*60}")
    print(f"COMPLETE: {grand_total:,} total features seeded from ArcGIS")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
