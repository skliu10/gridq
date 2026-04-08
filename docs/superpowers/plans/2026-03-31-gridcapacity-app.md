# GridCapacity Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build GridCapacity — a US hosting capacity and interconnection queue map for energy developers, with a Next.js frontend, Leaflet map, and Python data pipeline.

**Architecture:** Next.js 14 app with a Leaflet map rendered client-side (dynamic import, no SSR). Static JSON/GeoJSON files in `/public/data/` are fetched at runtime. A Python pipeline (gridstatus + geocoding) populates those files weekly via GitHub Actions.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Leaflet, leaflet.markercluster, topojson-client, Radix UI, shadcn/ui, Python (gridstatus, pandas, rapidfuzz)

---

## File Map

| File | Responsibility |
|---|---|
| `src/types/index.ts` | All shared TypeScript types |
| `src/lib/constants.ts` | Colors, labels, bounds, defaults |
| `src/lib/leaflet-utils.ts` | Leaflet styling/marker logic |
| `src/lib/render-popup.ts` | React→DOM renderer for Leaflet popups |
| `src/hooks/useMapData.ts` | Fetch + cache all public/data/ files |
| `src/hooks/useMapFilters.ts` | Filter state management |
| `src/components/map/GridMap.tsx` | Main Leaflet map component |
| `src/components/sidebar/Sidebar.tsx` | Left panel: legend + filters + stats |
| `src/components/topbar/TopBar.tsx` | Header: logo + ISO nav + freshness |
| `src/components/popups/CircuitPopup.tsx` | ICA circuit hover popup |
| `src/components/popups/QueueProjectPopup.tsx` | Queue project hover popup |
| `src/components/popups/CountyPopup.tsx` | County choropleth hover popup |
| `src/components/popups/ISOPopup.tsx` | ISO region click popup |
| `src/app/page.tsx` | Root page — wires everything together |
| `src/app/layout.tsx` | Root layout with metadata |
| `public/data/meta.json` | Pipeline freshness metadata |
| `public/data/iso_summary.json` | ISO-level queue stats |
| `public/data/county_summary.json` | County-level queue stats |
| `public/data/queue_projects.geojson` | Queue project points (30 sample) |
| `public/data/ica_circuits.geojson` | ICA circuit lines (20 sample, CA) |
| `next.config.ts` | Webpack fs:false fallback |
| `pipeline/fetch_queues.py` | Fetch ISO queues via gridstatus |
| `pipeline/geocode_substations.py` | Geocode POIs via HIFLD fuzzy match |
| `pipeline/build_county_summary.py` | Aggregate to county + ISO summaries |
| `pipeline/fetch_ica_california.py` | Process CA ICA GeoJSON exports |
| `pipeline/run_all.py` | Orchestrate all pipeline steps |
| `pipeline/requirements.txt` | Python dependencies |
| `.github/workflows/refresh-data.yml` | Weekly GitHub Actions pipeline |
| `.env.example` | No-token notice |
| `README.md` | Setup + data source docs |

---

## Chunk 1: Project Scaffold + Types + Constants

### Task 1: Initialize Next.js project

- [ ] Navigate to `~/Documents/Github/GridCapacity`
- [ ] Run scaffold:
```bash
cd ~/Documents/Github/GridCapacity
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes
```
- [ ] Install runtime dependencies:
```bash
npm install leaflet @types/leaflet
npm install leaflet.markercluster @types/leaflet.markercluster
npm install topojson-client @types/topojson-client
npm install @radix-ui/react-slider @radix-ui/react-switch @radix-ui/react-checkbox
npm install @radix-ui/react-tooltip lucide-react clsx tailwind-merge
npm install -D @types/node
```
- [ ] Init shadcn:
```bash
npx shadcn@latest init --defaults
npx shadcn@latest add slider switch checkbox tooltip badge
```
- [ ] Create `.env.example` with `# No tokens required for this project`

### Task 2: Create directory structure

- [ ] Create all required directories:
```bash
mkdir -p src/components/map src/components/sidebar src/components/popups src/components/topbar
mkdir -p src/lib src/hooks src/types pipeline public/data
```

### Task 3: Create type definitions

- [ ] Create `src/types/index.ts` with all types (FuelType, CircuitState, QueueProject, CircuitFeature, CountySummary, ISOSummary, AppMeta, MapFilters, GeoJSONFeatureCollection, GeoJSONFeature)

### Task 4: Create constants

- [ ] Create `src/lib/constants.ts` with ISO_COLORS, ISO_BOUNDS, FUEL_COLORS, FUEL_LABELS, CIRCUIT_STATE_COLORS, CIRCUIT_STATE_LABELS, CIRCUIT_STATE_DESCRIPTIONS, DEFAULT_FILTERS, COUNTY_COLOR_SCALE

---

## Chunk 2: Utilities + Sample Data

### Task 5: Create Leaflet utilities

- [ ] Create `src/lib/leaflet-utils.ts` with getCircuitState, getCircuitColor, getCircuitWeight, getQueueDotRadius, getQueueDotColor, getQueueDotOpacity, getCountyColor, getISOStyle, createQueueMarker

### Task 6: Create popup renderer

- [ ] Create `src/lib/render-popup.ts` with renderPopupContent using React.createElement + createRoot

### Task 7: Create sample data files

- [ ] Create `public/data/meta.json`
- [ ] Create `public/data/iso_summary.json` (7 ISOs)
- [ ] Create `public/data/county_summary.json` (20 sample counties across CA, TX, IL, PA, MA)
- [ ] Create `public/data/queue_projects.geojson` (30 sample points across all 7 ISOs)
- [ ] Create `public/data/ica_circuits.geojson` (20 sample LineStrings in Southern California)

---

## Chunk 3: Hooks + Popup Components

### Task 8: Create hooks

- [ ] Create `src/hooks/useMapData.ts` — fetches all public/data/ files with in-memory cache
- [ ] Create `src/hooks/useMapFilters.ts` — filter state with useCallback setters

### Task 9: Create popup components

- [ ] Create `src/components/popups/CircuitPopup.tsx`
- [ ] Create `src/components/popups/QueueProjectPopup.tsx`
- [ ] Create `src/components/popups/CountyPopup.tsx`
- [ ] Create `src/components/popups/ISOPopup.tsx`

---

## Chunk 4: Map + Sidebar + TopBar

### Task 10: Create GridMap component

- [ ] Create `src/components/map/GridMap.tsx` — forwardRef with GridMapHandle, 4 layer groups, OSM tiles, county TopoJSON choropleth, ICA circuit lines, queue dot clusters, ISO boundaries

### Task 11: Create Sidebar

- [ ] Create `src/components/sidebar/Sidebar.tsx` — circuit legend, layer toggles, fuel checkboxes, threshold/minMW sliders, status radio, COD filter, stats grid, data coverage notice

### Task 12: Create TopBar

- [ ] Create `src/components/topbar/TopBar.tsx` — logo, ISO pills, freshness indicator, GitHub link

---

## Chunk 5: App Shell + Config + Pipeline

### Task 13: Create main page

- [ ] Create `src/app/page.tsx` — wires TopBar + Sidebar + GridMap with dynamic import (ssr:false), stats memo, ISO fly-to

### Task 14: Update layout + Next.js config

- [ ] Update `src/app/layout.tsx` — set title "GridCapacity", description "US hosting capacity and interconnection queue map"
- [ ] Update `next.config.ts` — add webpack fs:false fallback

### Task 15: Create pipeline scripts

- [ ] Create `pipeline/requirements.txt`
- [ ] Create `pipeline/fetch_queues.py`
- [ ] Create `pipeline/geocode_substations.py`
- [ ] Create `pipeline/build_county_summary.py`
- [ ] Create `pipeline/fetch_ica_california.py`
- [ ] Create `pipeline/run_all.py`

### Task 16: Create GitHub Actions + README

- [ ] Create `.github/workflows/refresh-data.yml`
- [ ] Create `README.md`

---

## Chunk 6: Build + Verify

### Task 17: Build and verify

- [ ] Run `npm run build` — fix any TypeScript errors
- [ ] Run `npm run dev` — confirm app starts on localhost:3000
- [ ] Verify: map renders with OSM tiles, sample queue dots visible, sidebar functional
- [ ] Report: all files created, any build errors, manual setup requirements
