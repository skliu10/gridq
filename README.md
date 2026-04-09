# GridCapacity

US hosting capacity and interconnection queue map for energy developers.

## Quick start

1. Clone the repo
2. Install dependencies: `npm install`
3. Download HIFLD electric substations GeoJSON from
   https://hifld-geoplatform.opendata.arcgis.com/datasets/electric-substations
   and save as `pipeline/hifld_substations.geojson`
4. Download EIA RTO Regions GeoJSON from
   https://atlas.eia.gov/maps/eia::rto-regions
   and save as `public/data/iso_boundaries.geojson`
5. Install Python deps: `pip install -r pipeline/requirements.txt`
6. Run pipeline: `python pipeline/run_all.py`
7. Start app: `npm run dev`

The app ships with sample data and renders immediately without steps 3–6.

## Data sources

| Source | Data | Access |
|---|---|---|
| gridstatus (open source) | ISO interconnection queues | Free, no account |
| HIFLD | Substation locations | Free, no account |
| EIA Atlas | ISO/RTO territory boundaries | Free, no account |
| OpenStreetMap | Base map tiles | Free, no account |
| CA ICA portals (SCE/PG&E/SDG&E) | Circuit hosting capacity | Free, manual download |

## CA ICA data download

- SCE DERIM: https://sce.com/derim — export as GeoJSON, save as `pipeline/sce_ica_export.geojson`
- PG&E GRIP: https://www.pge.com/en/about/doing-business-with-pge/interconnections/distributed-resource-planning-data-and-maps.html — save as `pipeline/pge_ica_export.geojson`
- SDG&E: SDG&E data portal — save as `pipeline/sdge_ica_export.geojson`

## Architecture

Next.js app (reads static files) ← /public/data/ ← Python pipeline (runs weekly via GitHub Actions)

Pipeline: gridstatus → queue_raw.json → geocode via HIFLD → queue_projects.geojson
                     → county_summary.json + iso_summary.json
CA ICA manual exports → ica_circuits.geojson

## Environment variables

No API tokens required. This project uses only free, open data sources.

## GitHub Actions setup

Add `VERCEL_DEPLOY_HOOK` as a repository secret to trigger redeployment after each data refresh.
