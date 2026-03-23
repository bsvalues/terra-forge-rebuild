"""Show everything in the GIS tables."""
import os
import requests
import json

url = os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1"
key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
h = {"apikey": key, "Authorization": f"Bearer {key}"}
hc = {**h, "Prefer": "count=exact"}

# 1. Data Sources
print("=" * 60)
print("gis_data_sources")
print("=" * 60)
r = requests.get(f"{url}/gis_data_sources?select=*", headers=h)
for ds in r.json():
    print(json.dumps(ds, indent=2))

# 2. Layers
print("\n" + "=" * 60)
print("gis_layers")
print("=" * 60)
r = requests.get(f"{url}/gis_layers?select=*&order=name", headers=h)
layers = r.json()
for layer in layers:
    print(json.dumps(layer, indent=2))

# 3. Features summary + sample per layer
print("\n" + "=" * 60)
print("gis_features (summary + 1 sample per layer)")
print("=" * 60)

# Total count
r_total = requests.get(f"{url}/gis_features?select=id", headers={**hc, "Range": "0-0"})
total = r_total.headers.get("content-range", "?")
print(f"Total features across all layers: {total}")

for layer in layers:
    lid = layer["id"]
    lname = layer["name"]
    
    # Count for this layer
    rc = requests.get(f"{url}/gis_features?layer_id=eq.{lid}&select=id", headers={**hc, "Range": "0-0"})
    count = rc.headers.get("content-range", "?")
    print(f"\n--- {lname} ({count}) ---")
    
    # Sample 1 feature
    r2 = requests.get(f"{url}/gis_features?layer_id=eq.{lid}&limit=1", headers=h)
    feats = r2.json()
    if feats:
        f = feats[0]
        coords_str = json.dumps(f.get("coordinates", ""))
        if len(coords_str) > 200:
            coords_str = coords_str[:200] + "..."
        props = f.get("properties", {})
        prop_keys = list(props.keys()) if props else []
        
        print(f"  id: {f['id']}")
        print(f"  geometry_type: {f['geometry_type']}")
        print(f"  parcel_id: {f['parcel_id']}")
        print(f"  centroid: ({f['centroid_lat']}, {f['centroid_lng']})")
        print(f"  property keys ({len(prop_keys)}): {prop_keys}")
        print(f"  coordinates preview: {coords_str}")
        
        # Show actual property values
        if props:
            print(f"  properties sample:")
            for k, v in list(props.items())[:8]:
                print(f"    {k}: {v}")
