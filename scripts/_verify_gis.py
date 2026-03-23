import os
import requests

url = os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1"
key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
h = {"apikey": key, "Authorization": "Bearer " + key}
hc = {**h, "Prefer": "count=exact", "Range": "0-0"}

r = requests.get(url + "/gis_features?select=id", headers=hc)
print("Total features:", r.headers.get("content-range", "?"))

r = requests.get(url + "/gis_layers?select=name,layer_type,feature_count", headers=h)
print("\nLayers:")
for l in r.json():
    print(f"  {l['name']:<30s} {l['layer_type']:<10s} {l['feature_count']} features")

r = requests.get(url + "/gis_data_sources?select=name,sync_status", headers=h)
print("\nSources:")
for s in r.json():
    print(f"  {s['name']} ({s['sync_status']})")
