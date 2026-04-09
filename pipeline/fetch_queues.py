import gridstatus
import pandas as pd
import json
import os

os.makedirs('public/data', exist_ok=True)

ISOS = {
  'caiso': gridstatus.CAISO(),
  'pjm':   gridstatus.PJM(),
  'miso':  gridstatus.MISO(),
  'isone': gridstatus.ISONE(),
  'nyiso': gridstatus.NYISO(),
  'ercot': gridstatus.Ercot(),
  'spp':   gridstatus.SPP(),
}

all_projects = []
for iso_name, iso in ISOS.items():
  try:
    print(f"Fetching {iso_name}...")
    queue = iso.get_interconnection_queue()
    queue['iso'] = iso_name.upper()
    all_projects.append(queue)
    print(f"  {iso_name}: {len(queue)} projects")
  except Exception as e:
    print(f"  FAILED {iso_name}: {e}")

if not all_projects:
  print("ERROR: No data fetched from any ISO")
  exit(1)

df = pd.concat(all_projects, ignore_index=True)

COL_MAP = {
  'Capacity (MW)': 'capacity_mw',
  'Project Name': 'project_name',
  'Fuel': 'fuel_type',
  'Status': 'status',
  'Point of Interconnection': 'poi_name',
  'State': 'state',
  'County': 'county',
  'Proposed COD': 'proposed_cod',
  'Queue Date': 'queue_date',
  'Queue ID': 'queue_id',
}
df = df.rename(columns={k:v for k,v in COL_MAP.items() if k in df.columns})

FUEL_MAP = {
  'Solar':'solar','SOLAR':'solar','SUN':'solar',
  'Wind':'wind','WIND':'wind',
  'Battery':'storage','Storage':'storage','ES':'storage',
  'BESS':'storage','Battery Storage':'storage',
  'Gas':'gas','Natural Gas':'gas','NG':'gas',
  'Nuclear':'nuclear','Hydro':'hydro',
  'Offshore Wind':'offshore_wind',
}
if 'fuel_type' in df.columns:
  df['fuel_normalized'] = df['fuel_type'].map(FUEL_MAP).fillna('other')
else:
  df['fuel_normalized'] = 'other'

keep_cols = [c for c in [
  'queue_id','project_name','iso','fuel_normalized','capacity_mw',
  'status','poi_name','state','county','proposed_cod','queue_date'
] if c in df.columns]
df[keep_cols].to_json('public/data/queue_raw.json', orient='records', indent=2)
print(f"Saved {len(df)} projects to public/data/queue_raw.json")
