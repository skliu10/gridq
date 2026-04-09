import pandas as pd
import json
from rapidfuzz import process, fuzz
import os

os.makedirs('public/data', exist_ok=True)

HIFLD_PATH = 'pipeline/hifld_substations.geojson'
if not os.path.exists(HIFLD_PATH):
  print(f"ERROR: {HIFLD_PATH} not found.")
  print("Download from: https://hifld-geoplatform.opendata.arcgis.com/datasets/electric-substations")
  print("Save as pipeline/hifld_substations.geojson")
  exit(1)

print("Loading HIFLD substations...")
with open(HIFLD_PATH) as f:
  hifld = json.load(f)

sub_lookup = {}
for feat in hifld['features']:
  name = feat['properties'].get('NAME','').strip().upper()
  coords = feat['geometry']['coordinates'] if feat.get('geometry') else None
  state = feat['properties'].get('STATE','')
  if name and coords:
    sub_lookup[name] = {'lat':coords[1],'lng':coords[0],'state':state,'source':'hifld'}

print(f"Loaded {len(sub_lookup)} substations from HIFLD")
df = pd.read_json('public/data/queue_raw.json')

def geocode_poi(poi_name, state=None):
  if pd.isna(poi_name) or not str(poi_name).strip():
    return None
  query = str(poi_name).strip().upper()
  if query in sub_lookup:
    r = sub_lookup[query].copy()
    r['match_score'] = 100
    return r
  candidates = {k:v for k,v in sub_lookup.items()
                if not state or v['state']==state}
  if not candidates:
    candidates = sub_lookup
  cand_names = list(candidates.keys())
  match, score, _ = process.extractOne(query, cand_names, scorer=fuzz.token_sort_ratio)
  if score >= 75:
    r = candidates[match].copy()
    r['match_score'] = score
    r['matched_name'] = match
    return r
  return None

results = []
for _, row in df.iterrows():
  geo = geocode_poi(row.get('poi_name'), row.get('state'))
  results.append({
    **row.to_dict(),
    'lat': geo['lat'] if geo else None,
    'lng': geo['lng'] if geo else None,
    'geo_source': geo.get('source','unmatched') if geo else 'unmatched',
    'geo_score': geo.get('match_score',0) if geo else 0,
  })

out = pd.DataFrame(results)
matched = out[out['lat'].notna()]
total = len(out)
pct = 100*len(matched)//total if total else 0
print(f"Geocoded {len(matched)}/{total} projects ({pct}%)")

features = []
for _, row in matched.iterrows():
  features.append({
    'type':'Feature',
    'geometry':{'type':'Point','coordinates':[float(row['lng']),float(row['lat'])]},
    'properties':{
      'id':str(row.get('queue_id','')),
      'name':str(row.get('project_name','')),
      'iso':str(row.get('iso','')),
      'fuel':str(row.get('fuel_normalized','other')),
      'mw':float(row['capacity_mw']) if pd.notna(row.get('capacity_mw')) else 0,
      'status':str(row.get('status','')),
      'state':str(row.get('state','')),
      'poi':str(row.get('poi_name','')),
      'cod':str(row.get('proposed_cod','')),
      'geo_score':int(row.get('geo_score',0)),
    }
  })

geojson = {'type':'FeatureCollection','features':features}
with open('public/data/queue_projects.geojson','w') as f:
  json.dump(geojson, f, indent=2)
print(f"Saved {len(features)} projects to public/data/queue_projects.geojson")
