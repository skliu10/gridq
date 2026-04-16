import subprocess
import json
import os
import sys
from datetime import datetime, timezone

os.makedirs('public/data', exist_ok=True)

# ── 1. ISO queues (gridstatus) ────────────────────────────────────────────────
print(f"\n{'='*50}\nFetching ISO queues\n{'='*50}")
result = subprocess.run(['python3', 'pipeline/fetch_queues.py'], capture_output=False, text=True)
iso_ok = result.returncode == 0
if not iso_ok:
    print('WARNING: ISO fetch failed — continuing with existing queue_raw.json data')
# Geocoding and county summary run regardless so non-ISO data still gets processed

# ── 2. Non-ISO queues ─────────────────────────────────────────────────────────
print(f"\n{'='*50}\nFetching non-ISO queues\n{'='*50}")
_pipeline_dir = os.path.dirname(os.path.abspath(__file__))
if _pipeline_dir not in sys.path:
    sys.path.insert(0, _pipeline_dir)
from fetch_bpa import fetch_bpa
from fetch_pse import fetch_pse
from merge_non_iso import merge_into_queue

non_iso_projects = []
for name, fetcher in [('BPA', fetch_bpa), ('PSE', fetch_pse)]:
    try:
        projects = fetcher()
        if not projects:
            print(f'WARNING: {name} returned 0 projects — stale data (if any) will be preserved')
        non_iso_projects.extend(projects)
    except Exception as e:
        print(f'WARNING: {name} fetch failed — {e}')

if non_iso_projects:
    merge_into_queue(non_iso_projects)
else:
    print('WARNING: No non-ISO projects fetched')

# ── 3. Geocode ────────────────────────────────────────────────────────────────
print(f"\n{'='*50}\nGeocoding substations\n{'='*50}")
result = subprocess.run(['python3', 'pipeline/geocode_substations.py'], capture_output=False, text=True)
geo_ok = result.returncode == 0

# ── 4. County summary ─────────────────────────────────────────────────────────
print(f"\n{'='*50}\nBuilding county summary\n{'='*50}")
result = subprocess.run(['python3', 'pipeline/build_county_summary.py'], capture_output=False, text=True)
county_ok = result.returncode == 0


def safe_count(path, key='features'):
    try:
        with open(path) as f:
            data = json.load(f)
        return len(data) if isinstance(data, list) else len(data.get(key, []))
    except Exception:
        return 0


q = safe_count('public/data/queue_raw.json')
g = safe_count('public/data/queue_projects.geojson')

meta = {
    'queue_fetched_at': datetime.now(timezone.utc).isoformat(),
    'queue_project_count': q,
    'geocoded_count': g,
    'geocoded_pct': round(100 * g / q) if q else 0,
    'pipeline_results': {
        'iso_fetch': iso_ok,
        'geocode': geo_ok,
        'county_summary': county_ok,
    },
}
with open('public/data/meta.json', 'w') as f:
    json.dump(meta, f, indent=2)

print(f"\n{'='*50}\nPipeline complete")
print(f"Queue projects: {q}")
print(f"Geocoded: {g} ({meta['geocoded_pct']}%)")
