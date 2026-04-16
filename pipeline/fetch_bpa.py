"""
Fetch BPA (Bonneville Power Administration) interconnection queue.
Direct Excel download — no authentication required.
Returns a list of project dicts matching the queue_raw.json schema.
"""

import requests
import pandas as pd
from io import BytesIO

BPA_URL = 'https://bpa.gov/-/media/Aep/transmission-media-documents/InterconnectionQueueOutput.xlsx'

BPA_FUEL_MAP = {
    'Solar': 'solar',
    'Wind Turbine': 'wind',
    'Battery': 'storage',
    'Natural Gas': 'gas',
    'Biofuel': 'other',
    'Water': 'hydro',
    'Geothermal': 'other',
    'Pumped-Storage Hydro': 'storage',
    'Nuclear': 'nuclear',
    'Other': 'other',
}


def normalize_date(val) -> str | None:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    try:
        return pd.to_datetime(val).strftime('%Y-%m-%d')
    except Exception:
        return None


def safe_str(val) -> str:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return ''
    s = str(val).strip()
    return '' if s in ('None', 'nan', 'NaT') else s


def fetch_bpa() -> list[dict]:
    print('Fetching BPA queue...')
    resp = requests.get(BPA_URL, timeout=60)
    resp.raise_for_status()

    df = pd.read_excel(BytesIO(resp.content), sheet_name='Sheet1', header=4)
    print(f'  BPA: {len(df)} rows downloaded')

    projects = []
    for _, row in df.iterrows():
        queue_id = safe_str(row.get('Request Number'))
        if not queue_id:
            continue

        connection_type = safe_str(row.get('Connection Type'))
        fuel_source = safe_str(row.get('Fuel Source\n1'))

        # Load connections override fuel type
        if connection_type == 'LL':
            fuel_normalized = 'load'
        else:
            fuel_normalized = BPA_FUEL_MAP.get(fuel_source, 'other')

        mw = row.get('MW Total')
        try:
            capacity_mw = float(mw) if pd.notna(mw) else 0.0
        except (ValueError, TypeError):
            capacity_mw = 0.0

        projects.append({
            'queue_id':        f'BPA-{queue_id}',
            'project_name':    safe_str(row.get('Project Name')),
            'iso':             'BPA',
            'fuel_normalized': fuel_normalized,
            'capacity_mw':     capacity_mw,
            'status':          safe_str(row.get('Status')),
            'poi_name':        safe_str(row.get('Point Of Interconnection')),
            'state':           safe_str(row.get('State')),
            'county':          safe_str(row.get('County')),
            'proposed_cod':    normalize_date(row.get('Requested In-Service Date')),
            'queue_date':      normalize_date(row.get('Request Date')),
        })

    print(f'  BPA: {len(projects)} projects normalized')
    return projects


if __name__ == '__main__':
    projects = fetch_bpa()
    mw = sum(p['capacity_mw'] for p in projects)
    print(f'Total BPA capacity: {mw/1000:.1f} GW across {len(projects)} projects')
