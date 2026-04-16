"""
Geocode queue projects to lat/lng.

Priority order:
  1. Coordinates already present in gridstatus queue data (some ISOs provide them)
  2. HIFLD substation fuzzy match (if pipeline/hifld_substations.geojson exists)
  3. Nominatim (OpenStreetMap) county centroid — free, 1 req/sec rate limit

Nominatim results are persisted in pipeline/nominatim_cache.json so subsequent
runs reuse existing lookups without hitting the API again. The output GeoJSON is
built by merging new results into any existing file, so partial runs are safe.
"""

import pandas as pd
import json
import os
import re
import random
from rapidfuzz import process, fuzz

os.makedirs('public/data', exist_ok=True)

# ── 1. Load queue data ────────────────────────────────────────────────────────
df = pd.read_json('public/data/queue_raw.json')
print(f"Loaded {len(df)} projects from queue_raw.json")

# ── 2. Load existing geocoded projects (merge mode) ───────────────────────────
GEOJSON_PATH = 'public/data/queue_projects.geojson'
existing_features: dict = {}  # queue_id -> feature
if os.path.exists(GEOJSON_PATH):
    with open(GEOJSON_PATH) as f:
        existing_geojson = json.load(f)
    for feat in existing_geojson.get('features', []):
        qid = feat['properties'].get('id', '')
        if qid:
            existing_features[qid] = feat
    print(f"Loaded {len(existing_features)} already-geocoded projects")

# ── 3. HIFLD substation lookup (optional) ─────────────────────────────────────
HIFLD_PATH = 'pipeline/hifld_substations.geojson'
sub_lookup: dict = {}
if os.path.exists(HIFLD_PATH):
    print("Loading HIFLD substations...")
    with open(HIFLD_PATH) as f:
        hifld = json.load(f)
    for feat in hifld['features']:
        name = feat['properties'].get('NAME', '').strip().upper()
        coords = feat['geometry']['coordinates'] if feat.get('geometry') else None
        state = feat['properties'].get('STATE', '')
        if name and coords:
            sub_lookup[name] = {'lat': coords[1], 'lng': coords[0], 'state': state, 'source': 'hifld'}
    print(f"Loaded {len(sub_lookup)} substations from HIFLD")
else:
    print("HIFLD file not found — will use Nominatim fallback")

# ── 4. County centroid lookup (US Census Gazetteer — offline, no rate limits) ─
CENTROIDS_PATH = 'pipeline/county_centroids.json'
if os.path.exists(CENTROIDS_PATH):
    with open(CENTROIDS_PATH) as f:
        _county_centroids: dict = json.load(f)
    print(f"Loaded {len(_county_centroids)} county centroids from Census Gazetteer")
else:
    _county_centroids = {}
    print("WARNING: pipeline/county_centroids.json not found — county geocoding disabled")

def save_cache():
    pass  # No-op: static dataset needs no saving

STATE_NAME_TO_ABBR = {
    'alabama':'AL','alaska':'AK','arizona':'AZ','arkansas':'AR','california':'CA',
    'colorado':'CO','connecticut':'CT','delaware':'DE','florida':'FL','georgia':'GA',
    'hawaii':'HI','idaho':'ID','illinois':'IL','indiana':'IN','iowa':'IA',
    'kansas':'KS','kentucky':'KY','louisiana':'LA','maine':'ME','maryland':'MD',
    'massachusetts':'MA','michigan':'MI','minnesota':'MN','mississippi':'MS',
    'missouri':'MO','montana':'MT','nebraska':'NE','nevada':'NV','new hampshire':'NH',
    'new jersey':'NJ','new mexico':'NM','new york':'NY','north carolina':'NC',
    'north dakota':'ND','ohio':'OH','oklahoma':'OK','oregon':'OR','pennsylvania':'PA',
    'rhode island':'RI','south carolina':'SC','south dakota':'SD','tennessee':'TN',
    'texas':'TX','utah':'UT','vermont':'VT','virginia':'VA','washington':'WA',
    'west virginia':'WV','wisconsin':'WI','wyoming':'WY',
    'district of columbia':'DC',
}

def lookup_county(county: str, state: str) -> dict | None:
    """Look up a county centroid from the static Census Gazetteer dataset."""
    # Normalize state: full name → abbreviation
    state_norm = state.strip()
    state_lower = state_norm.lower()
    if state_lower in STATE_NAME_TO_ABBR:
        state_norm = STATE_NAME_TO_ABBR[state_lower]
    state_key = state_norm.lower()

    # Strip trailing "County" / "Parish" / "Borough" suffix some ISOs include
    county_clean = re.sub(r'\s+(County|Parish|Borough|Census Area)$', '', county.strip(), flags=re.IGNORECASE)
    county_lower = county_clean.lower()

    # Try several key formats (all lowercased)
    for key in [
        f'{county_lower} county,{state_key}',
        f'{county_lower},{state_key}',
        f'{county.strip().lower()},{state_key}',
    ]:
        if key in _county_centroids:
            c = _county_centroids[key]
            return {
                'lat': c['lat'] + random.uniform(-0.15, 0.15),
                'lng': c['lng'] + random.uniform(-0.15, 0.15),
                'source': 'county_centroid',
                'match_score': 50,
            }
    return None

# ── 5. Geocode each project ───────────────────────────────────────────────────
def geocode_row(row) -> dict | None:
    # Priority 1: native coordinates from gridstatus
    for lat_col in ('latitude', 'lat', 'Latitude', 'Lat'):
        for lng_col in ('longitude', 'lng', 'Longitude', 'Lon', 'Long'):
            lat = row.get(lat_col)
            lng = row.get(lng_col)
            if lat and lng:
                try:
                    return {'lat': float(lat), 'lng': float(lng), 'source': 'native', 'match_score': 100}
                except (ValueError, TypeError):
                    pass

    poi = str(row.get('poi_name', '') or '').strip()
    state = str(row.get('state', '') or '').strip()

    if not poi and not row.get('county'):
        return None

    # Priority 2: HIFLD fuzzy match
    if sub_lookup and poi:
        query = poi.upper()
        if query in sub_lookup:
            r = sub_lookup[query].copy()
            r['match_score'] = 100
            return r
        candidates = {k: v for k, v in sub_lookup.items() if not state or v['state'] == state} or sub_lookup
        match, score, _ = process.extractOne(query, list(candidates.keys()), scorer=fuzz.token_sort_ratio)
        if score >= 75:
            r = candidates[match].copy()
            r['match_score'] = score
            return r

    # Priority 3: county centroid (Census Gazetteer — offline, instant)
    county = str(row.get('county', '') or '').strip()
    if county and state:
        return lookup_county(county, state)

FUEL_LABELS = {
    'solar': 'Solar', 'wind': 'Wind', 'storage': 'Storage', 'gas': 'Gas',
    'offshore_wind': 'Offshore Wind', 'nuclear': 'Nuclear', 'hydro': 'Hydro',
    'load': 'Large Load',
}

def safe_str(val) -> str:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return ''
    s = str(val).strip()
    return '' if s in ('None', 'nan', 'NaT') else s

new_count = 0
skip_count = 0
total = len(df)

for i, (_, row) in enumerate(df.iterrows()):
    if i % 200 == 0:
        print(f"  Processing {i}/{total} (new: {new_count})...")

    qid = safe_str(row.get('queue_id'))

    # Skip projects already in the output geojson
    if qid and qid in existing_features:
        # Still update fuel/name in case mapping improved
        p = existing_features[qid]['properties']
        new_fuel = safe_str(row.get('fuel_normalized')) or 'other'
        if p.get('fuel') != new_fuel:
            p['fuel'] = new_fuel
        # Update name if it was a fallback
        name = safe_str(row.get('project_name'))
        if not name:
            fuel_label = FUEL_LABELS.get(safe_str(row.get('fuel_normalized')), 'Energy')
            poi = safe_str(row.get('poi_name'))
            iso = safe_str(row.get('iso'))
            name = f"{fuel_label} Project – {poi}" if poi else f"{iso} {qid}"
        p['name'] = name
        p['status'] = safe_str(row.get('status'))
        p['cod'] = safe_str(row.get('proposed_cod'))
        skip_count += 1
        continue

    geo = geocode_row(row)
    if not geo:
        continue

    name = safe_str(row.get('project_name'))
    if not name:
        fuel_label = FUEL_LABELS.get(safe_str(row.get('fuel_normalized')), 'Energy')
        poi = safe_str(row.get('poi_name'))
        iso = safe_str(row.get('iso'))
        name = f"{fuel_label} Project – {poi}" if poi else f"{iso} {qid}"

    feat = {
        'type': 'Feature',
        'geometry': {'type': 'Point', 'coordinates': [float(geo['lng']), float(geo['lat'])]},
        'properties': {
            'id':       qid,
            'name':     name,
            'iso':      safe_str(row.get('iso')),
            'fuel':     safe_str(row.get('fuel_normalized')) or 'other',
            'mw':       float(row['capacity_mw']) if pd.notna(row.get('capacity_mw')) else 0,
            'status':   safe_str(row.get('status')),
            'state':    safe_str(row.get('state')),
            'poi':      safe_str(row.get('poi_name')),
            'cod':      safe_str(row.get('proposed_cod')),
            'geo_score': int(geo.get('match_score', 50)),
        }
    }
    existing_features[qid] = feat
    new_count += 1

# Save cache after all Nominatim calls
save_cache()

# ── 6. Write merged GeoJSON ───────────────────────────────────────────────────
features = list(existing_features.values())
total_out = len(features)
pct = round(100 * total_out / total) if total else 0
print(f"Geocoded {total_out}/{total} projects ({pct}%) — {new_count} new, {skip_count} updated from cache")

geojson = {'type': 'FeatureCollection', 'features': features}
with open(GEOJSON_PATH, 'w') as f:
    json.dump(geojson, f)
print(f"Saved {total_out} projects to {GEOJSON_PATH}")
