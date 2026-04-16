"""
Fetch BPA (Bonneville Power Administration) interconnection queue.
Direct Excel download — no authentication required.
Returns a list of project dicts matching the queue_raw.json schema.
"""

import requests
import pandas as pd
from io import BytesIO
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

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
        return pd.to_datetime(val, dayfirst=False).strftime('%Y-%m-%d')
    except Exception:
        print(f'  WARNING: could not parse date: {val!r}')
        return None


def safe_str(val) -> str:
    if val is None:
        return ''
    try:
        if pd.isna(val):
            return ''
    except (TypeError, ValueError):
        pass
    s = str(val).strip()
    return '' if s in ('None', 'nan', 'NaT', '<NA>') else s


def fetch_bpa() -> list[dict]:
    print('Fetching BPA queue...')
    session = requests.Session()
    retry = Retry(total=3, backoff_factor=2, status_forcelist=[500, 502, 503, 504])
    session.mount('https://', HTTPAdapter(max_retries=retry))
    resp = session.get(BPA_URL, timeout=60)
    resp.raise_for_status()

    df = pd.read_excel(BytesIO(resp.content), sheet_name='Sheet1', header=4)

    REQUIRED_COLUMNS = {'Request Number', 'MW Total', 'Fuel Source\n1', 'Status'}
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise ValueError(f'BPA sheet is missing expected columns: {missing}')

    print(f'  BPA: {len(df)} rows downloaded')

    projects = []
    for _, row in df.iterrows():
        queue_id = safe_str(row.get('Request Number'))
        if not queue_id:
            continue

        connection_type = safe_str(row.get('Connection Type'))
        # BPA Excel header contains a literal newline: "Fuel Source\n1" — pandas preserves it
        fuel_source = safe_str(row.get('Fuel Source\n1'))

        # Load connections override fuel type
        if connection_type == 'LL':
            fuel_normalized = 'load'
        else:
            fuel_normalized = BPA_FUEL_MAP.get(fuel_source, 'other')

        mw = row.get('MW Total')
        try:
            capacity_mw = float(mw) if pd.notna(mw) else None
        except (ValueError, TypeError):
            capacity_mw = None

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
