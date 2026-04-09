import subprocess
import json
import os
from datetime import datetime, timezone

os.makedirs('public/data', exist_ok=True)

steps = [
  ('Fetching ISO queues',     ['python', 'pipeline/fetch_queues.py']),
  ('Geocoding substations',   ['python', 'pipeline/geocode_substations.py']),
  ('Building county summary', ['python', 'pipeline/build_county_summary.py']),
  ('Processing CA ICA',       ['python', 'pipeline/fetch_ica_california.py']),
]

results = {}
for label, cmd in steps:
  print(f"\n{'='*50}\n{label}\n{'='*50}")
  result = subprocess.run(cmd, capture_output=False, text=True)
  results[label] = result.returncode == 0
  if result.returncode != 0:
    print(f"WARNING: {label} failed with code {result.returncode}")

def safe_count(path, key='features'):
  try:
    with open(path) as f:
      data = json.load(f)
    return len(data) if isinstance(data, list) else len(data.get(key,[]))
  except:
    return 0

q = safe_count('public/data/queue_raw.json')
g = safe_count('public/data/queue_projects.geojson')
c = safe_count('public/data/ica_circuits.geojson')

meta = {
  'queue_fetched_at': datetime.now(timezone.utc).isoformat(),
  'ica_fetched_at': datetime.now(timezone.utc).isoformat(),
  'queue_project_count': q,
  'geocoded_count': g,
  'geocoded_pct': round(100*g/q) if q else 0,
  'circuit_count': c,
  'pipeline_results': results,
}
with open('public/data/meta.json','w') as f:
  json.dump(meta, f, indent=2)

print(f"\n{'='*50}\nPipeline complete")
print(f"Queue projects: {q}")
print(f"Geocoded: {g} ({meta['geocoded_pct']}%)")
print(f"Circuits: {c}")
