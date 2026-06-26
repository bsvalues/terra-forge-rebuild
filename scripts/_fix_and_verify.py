"""Fix mislabeled RevalArea layer and verify hood_cd status."""
import os
import requests
import json

url = os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1"
key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
h = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json", "Prefer": "return=representation"}

# 1. Fix mislabel: "Benton Neighborhoods" → "Benton Inspection Areas"
layer_id = "3ea2836d-7e36-42fc-9ce3-cf4d65870866"
r = requests.patch(
    f"{url}/gis_layers?id=eq.{layer_id}",
    headers=h,
    json={"name": "Benton Inspection Areas"}
)
print(f"Rename result: {r.status_code}")
if r.text.strip():
    data = r.json()
    if data:
        print(f"  Updated layer: {data[0]['name']}")

# 2. Verify all layers
print("\nCurrent GIS layers:")
r2 = requests.get(f"{url}/gis_layers?select=id,name,layer_type,feature_count&order=name", headers=h)
for layer in r2.json():
    print(f"  {layer['name']}: {layer['feature_count']} features ({layer['layer_type']})")

# 3. hood_cd status in parcels
h_count = {"apikey": key, "Authorization": f"Bearer {key}", "Prefer": "count=exact"}
r3 = requests.get(f"{url}/parcels?neighborhood_code=not.is.null&select=id", headers={**h_count, "Range": "0-0"})
total_hood = r3.headers.get("content-range", "?")
r4 = requests.get(f"{url}/parcels?select=id", headers={**h_count, "Range": "0-0"})
total_parcels = r4.headers.get("content-range", "?")
print(f"\nhood_cd (neighborhood_code) status:")
print(f"  Parcels with neighborhood_code: {total_hood}")
print(f"  Total parcels: {total_parcels}")

# 4. Sample some neighborhood codes with their counts
r5 = requests.get(
    f"{url}/parcels?neighborhood_code=not.is.null&select=neighborhood_code&order=neighborhood_code&limit=5000",
    headers=h
)
codes = {}
for p in r5.json():
    c = p["neighborhood_code"]
    codes[c] = codes.get(c, 0) + 1
print(f"  Distinct codes (first 5000 rows): {len(codes)}")
print(f"  Top 10 by parcel count:")
top = sorted(codes.items(), key=lambda x: -x[1])[:10]
for code, count in top:
    print(f"    {code}: {count} parcels")
