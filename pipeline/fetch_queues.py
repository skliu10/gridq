import gridstatus
import pandas as pd
import json
import os

os.makedirs('public/data', exist_ok=True)

ISO_CONSTRUCTORS = {
  'caiso': gridstatus.CAISO,
  'pjm':   gridstatus.PJM,
  'miso':  gridstatus.MISO,
  'isone': gridstatus.ISONE,
  'nyiso': gridstatus.NYISO,
  'ercot': gridstatus.Ercot,
  'spp':   gridstatus.SPP,
}

all_projects = []
for iso_name, constructor in ISO_CONSTRUCTORS.items():
  try:
    iso = constructor()
  except Exception as e:
    print(f"  SKIP {iso_name} (init failed — likely missing API key): {e}")
    continue
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
  'Queue ID':                 'queue_id',
  'Project Name':             'project_name',
  'Capacity (MW)':            'capacity_mw',
  'Generation Type':          'fuel_type',
  'Fuel':                     'fuel_type',        # ERCOT uses 'Fuel'
  'Status':                   'status',
  'Interconnection Location': 'poi_name',
  'State':                    'state',
  'County':                   'county',
  'Proposed Completion Date': 'proposed_cod',
  'Commercial Operation Date':'proposed_cod',     # SPP alternate
  'inService':                'proposed_cod_miso', # MISO — merged below
  'Queue Date':               'queue_date',
}
df = df.rename(columns={k:v for k,v in COL_MAP.items() if k in df.columns})
# Drop duplicate columns produced when multiple source cols map to the same target
df = df.loc[:, ~df.columns.duplicated(keep='first')]
# MISO: fill missing proposed_cod from inService column
if 'proposed_cod_miso' in df.columns:
  if 'proposed_cod' not in df.columns:
    df['proposed_cod'] = df['proposed_cod_miso']
  else:
    df['proposed_cod'] = df['proposed_cod'].fillna(df['proposed_cod_miso'])
  df = df.drop(columns=['proposed_cod_miso'])

# Normalize COD to YYYY-MM-DD strings
def normalize_date(val):
  if val is None or (isinstance(val, float) and pd.isna(val)):
    return None
  s = str(val).strip()
  if s in ('', 'None', 'NaT', 'nan'):
    return None
  # Unix milliseconds (CAISO, NYISO, ERCOT return these)
  if s.isdigit() and len(s) >= 10:
    try:
      return pd.to_datetime(int(s), unit='ms').strftime('%Y-%m-%d')
    except Exception:
      pass
  # Everything else: let pandas parse it
  try:
    parsed = pd.to_datetime(s, utc=True)
    return parsed.strftime('%Y-%m-%d')
  except Exception:
    return None

if 'proposed_cod' in df.columns:
  df['proposed_cod'] = df['proposed_cod'].apply(normalize_date)

FUEL_MAP = {
  # Solar
  'Solar':'solar','SOLAR':'solar','SUN':'solar','Solar PV':'solar',
  'Photovoltaic':'solar','Photovoltaic Solar':'solar',
  'Solar - Photovoltaic Solar':'solar','Solar - Photovoltaic':'solar',
  # Wind
  'Wind':'wind','WIND':'wind','Onshore Wind':'wind','Wind Turbine':'wind',
  'WND':'wind','Wind - Wind Turbine':'wind','Wind - Wind':'wind',
  # Storage / Battery
  'Battery':'storage','Storage':'storage','ES':'storage',
  'BESS':'storage','Battery Storage':'storage','Energy Storage':'storage',
  'BAT':'storage','Battery/Storage':'storage','Battery/Storage - Battery':'storage',
  'Compressed Air Storage':'storage',
  'Other - Battery Energy Storage':'storage',   # ERCOT
  'Pumped-Storage hydro':'storage',
  # Solar+Storage hybrids → storage (dominant asset for interconnection purposes)
  'Photovoltaic + Storage':'solar','Storage + Photovoltaic':'solar',
  'Hybrid - Solar/Storage':'solar','Hybrid - Solar':'solar',
  'Solar/Battery':'solar',
  # Wind+Storage hybrids
  'Wind Turbine + Storage':'wind','Storage + Wind Turbine':'wind',
  'Hybrid - Wind/Storage':'wind','Wind/Battery':'wind',
  # Gas / Thermal
  'Gas':'gas','Natural Gas':'gas','NG':'gas','Combined Cycle':'gas',
  'Gas Turbine':'gas','Steam':'gas','Thermal':'gas',
  'Combustion Turbine':'gas','Combustion (gas) Turbine, but not part of a Combined-Cycle':'gas',
  'DFO NG':'gas','DFO':'gas','NG WO':'gas','KER NG':'gas','DFO KER NG':'gas',
  'Thermal - Gas':'gas','Thermal - CT':'gas','Thermal - Coal':'gas',
  'Thermal - Combined Cycle':'gas','Thermal - Gas Turbine':'gas',
  'Thermal - Steam':'gas','Thermal - CTG':'gas',
  'Thermal - Combustion Turbine':'gas','Thermal - Reciprocating Engine':'gas',
  'Gas - Combustion (gas) Turbine, but not part of a Combined-Cycle':'gas',
  'Gas - Combined-Cycle':'gas','Gas - Internal Combustion Engine, eg. Reciprocating':'gas',
  'Gas - Steam Turbine other than Combined-Cycle':'gas',
  'Reciprocating Engine':'gas','Internal Combustion Engine, eg. Reciprocating':'gas',
  'Steam Turbine':'gas',
  # Nuclear
  'Nuclear':'nuclear','NUC':'nuclear',
  # Hydro
  'Hydro':'hydro','Hydroelectric':'hydro','WAT':'hydro','WAT BAT':'hydro',
  'Water':'hydro','Water - Other':'hydro',
  # Offshore Wind
  'Offshore Wind':'offshore_wind',
  # Large load (demand-side interconnection)
  'Load':'load','Demand':'load','Large Load':'load',
  # ISONE biomass / waste — map to other
  'WDS':'other','LFG':'other','BIT':'other','BLQ WDS':'other','MSW':'other',
  'FC':'other','Biofuel':'other','Geothermal':'other','Gravity via Rail':'other',
  # Transmission (not generation or load — skip by mapping to other)
  'AC Transmission':'other','DC Transmission':'other','High Voltage DC':'other',
}
if 'fuel_type' in df.columns:
  df['fuel_normalized'] = df['fuel_type'].apply(lambda x: FUEL_MAP.get(str(x).strip(), 'other') if pd.notna(x) else 'other')
else:
  df['fuel_normalized'] = 'other'

# Keep known columns plus any native lat/lng the ISO data includes
base_cols = ['queue_id','project_name','iso','fuel_normalized','capacity_mw',
             'status','poi_name','state','county','proposed_cod','queue_date']
lat_lng_cols = [c for c in df.columns if c.lower() in ('latitude','longitude','lat','lng','lon','long')]
keep_cols = [c for c in base_cols + lat_lng_cols if c in df.columns]
df[keep_cols].to_json('public/data/queue_raw.json', orient='records', indent=2)
print(f"Saved {len(df)} projects to public/data/queue_raw.json")
