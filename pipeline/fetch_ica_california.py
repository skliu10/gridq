import json
import os

os.makedirs('public/data', exist_ok=True)

def process_ica_geojson(path, utility):
  with open(path) as f:
    data = json.load(f)
  features = []
  for feat in data['features']:
    p = feat['properties']
    gross = float(p.get('ICA_VALUE_KW', p.get('ica_value_kw', 0)) or 0) / 1000
    queued = float(p.get('QUEUED_MW', p.get('queued_mw', 0)) or 0)
    net = max(0, gross - queued)
    features.append({
      'type':'Feature',
      'geometry':feat['geometry'],
      'properties':{
        'utility':utility,
        'circuit_id':str(p.get('CIRCUIT_ID', p.get('circuit_id',''))),
        'substation':str(p.get('SUBSTATION', p.get('substation',''))),
        'voltage_kv':float(p.get('VOLTAGE_KV', p.get('voltage_kv',12)) or 12),
        'gross_mw':round(gross,2),
        'queued_mw':round(queued,2),
        'net_mw':round(net,2),
        'has_queue_data': utility == 'SCE',
      }
    })
  return features

SOURCES = [
  ('pipeline/sce_ica_export.geojson', 'SCE'),
  ('pipeline/pge_ica_export.geojson', 'PGE'),
  ('pipeline/sdge_ica_export.geojson', 'SDGE'),
]

all_features = []
for path, utility in SOURCES:
  if os.path.exists(path):
    feats = process_ica_geojson(path, utility)
    all_features.extend(feats)
    print(f"Loaded {utility}: {len(feats)} circuits")
  else:
    print(f"Skipping {utility} — {path} not found (download manually, see README)")

out = {'type':'FeatureCollection','features':all_features}
with open('public/data/ica_circuits.geojson','w') as f:
  json.dump(out, f)
print(f"Saved {len(all_features)} circuit features to public/data/ica_circuits.geojson")
if not all_features:
  print("NOTE: No ICA files loaded. App will show sample data until you download ICA exports.")
