import pandas as pd
import json
import os

os.makedirs('public/data', exist_ok=True)
df = pd.read_json('public/data/queue_raw.json')

if 'status' not in df.columns:
  active = df
else:
  active = df[df['status'].str.upper().isin(['ACTIVE','IN SERVICE','OPERATIONAL'])]

if 'state' not in df.columns or 'county' not in df.columns:
  print("Missing state/county columns — saving empty county summary")
  pd.DataFrame().to_json('public/data/county_summary.json', orient='records')
else:
  count_col = 'queue_id' if 'queue_id' in active.columns else 'capacity_mw'
  county_agg = active.groupby(['state','county']).agg(
    total_mw=('capacity_mw','sum'),
    project_count=(count_col,'count'),
  ).reset_index()

  if 'fuel_normalized' in active.columns:
    for fuel in ['solar','storage','wind','gas']:
      mask = active['fuel_normalized'] == fuel
      fuel_agg = active[mask].groupby(['state','county'])['capacity_mw'].sum().reset_index()
      fuel_agg = fuel_agg.rename(columns={'capacity_mw': fuel})
      county_agg = county_agg.merge(fuel_agg, on=['state','county'], how='left')
      county_agg[fuel] = county_agg[fuel].fillna(0)

  county_agg.to_json('public/data/county_summary.json', orient='records', indent=2)
  print(f"Saved {len(county_agg)} counties")

if 'iso' in active.columns:
  iso_agg = active.groupby('iso').agg(
    total_mw=('capacity_mw','sum'),
    project_count=('capacity_mw','count'),
  ).reset_index()
  iso_agg.to_json('public/data/iso_summary.json', orient='records', indent=2)
  print(f"Saved {len(iso_agg)} ISOs")
