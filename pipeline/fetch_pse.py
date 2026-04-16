"""
Fetch PSE (Puget Sound Energy) interconnection queue.
Scrapes the public HTML queue page.
Returns a list of project dicts matching the queue_raw.json schema.

NOTE: If PSE's page requires JavaScript rendering, returns empty list with warning.
"""

import requests
from bs4 import BeautifulSoup
import pandas as pd

PSE_URL = 'https://www.pse.com/en/pages/transmission/transmission-services/interconnection-queue'

PSE_FUEL_MAP = {
    'Solar': 'solar',
    'Wind': 'wind',
    'Battery': 'storage',
    'Storage': 'storage',
    'Natural Gas': 'gas',
    'Gas': 'gas',
    'Hydro': 'hydro',
    'Nuclear': 'nuclear',
    'Geothermal': 'other',
    'Biomass': 'other',
}


def normalize_date(val) -> str | None:
    if not val or str(val).strip() in ('', 'None', 'TBD', 'N/A'):
        return None
    try:
        return pd.to_datetime(val, dayfirst=False).strftime('%Y-%m-%d')
    except Exception:
        return None


def safe_str(val) -> str:
    s = str(val).strip() if val else ''
    return '' if s in ('None', 'nan', 'N/A') else s


def fetch_pse() -> list[dict]:
    print('Fetching PSE queue...')
    try:
        resp = requests.get(
            PSE_URL, timeout=30,
            headers={'User-Agent': 'Mozilla/5.0 (compatible; GridQ/1.0)'}
        )
        resp.raise_for_status()
    except Exception as e:
        print(f'  PSE: fetch failed — {e}')
        return []

    soup = BeautifulSoup(resp.text, 'html.parser')
    tables = soup.find_all('table')

    if not tables:
        print('  PSE: no HTML table found (page may require JavaScript) — skipping')
        return []

    table = tables[0]
    headers = [th.get_text(strip=True) for th in table.find_all('th')]
    rows = table.find_all('tr')[1:]  # skip header row

    projects = []
    for i, row in enumerate(rows):
        cells = [td.get_text(strip=True) for td in row.find_all('td')]
        if len(cells) < len(headers):
            continue
        data = dict(zip(headers, cells))

        name = (data.get('Project Name') or data.get('Name') or '').strip()
        mw_str = (data.get('Capacity (MW)') or data.get('MW') or data.get('Capacity') or '0').replace(',', '')
        fuel_raw = (data.get('Fuel Type') or data.get('Fuel') or data.get('Generation Type') or '').strip()
        county = (data.get('County') or '').strip()
        state = (data.get('State') or 'WA').strip()
        poi = (data.get('Point of Interconnection') or data.get('POI') or '').strip()
        queue_date = normalize_date(data.get('Queue Date') or data.get('Application Date'))
        in_service = normalize_date(data.get('In-Service Date') or data.get('Proposed In-Service Date'))
        status = (data.get('Status') or '').strip()

        try:
            capacity_mw = float(mw_str)
        except (ValueError, TypeError):
            capacity_mw = None

        projects.append({
            'queue_id':        f'PSE-{i+1:04d}',
            'project_name':    name,
            'iso':             'PSE',
            'fuel_normalized': PSE_FUEL_MAP.get(fuel_raw, 'other'),
            'capacity_mw':     capacity_mw,
            'status':          status,
            'poi_name':        poi,
            'state':           state,
            'county':          county,
            'proposed_cod':    in_service,
            'queue_date':      queue_date,
        })

    print(f'  PSE: {len(projects)} projects scraped')
    return projects


if __name__ == '__main__':
    projects = fetch_pse()
    mw = sum(p['capacity_mw'] for p in projects if p['capacity_mw'] is not None)
    print(f'Total PSE capacity: {mw/1000:.1f} GW across {len(projects)} projects')
