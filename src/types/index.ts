export type FuelType =
  | 'solar'
  | 'storage'
  | 'wind'
  | 'offshore_wind'
  | 'gas'
  | 'nuclear'
  | 'hydro'
  | 'other'

export type CircuitState =
  | 'open'
  | 'open_contested'
  | 'tight'
  | 'tight_contested'
  | 'constrained'
  | 'no_data'

export interface QueueProject {
  id: string
  name: string
  iso: string
  fuel: FuelType
  mw: number
  status: string
  state: string
  poi: string
  cod: string
  lat: number
  lng: number
  geo_score: number
}

export interface CircuitFeature {
  utility: string
  circuit_id: string
  substation: string
  voltage_kv: number
  gross_mw: number
  queued_mw: number
  net_mw: number
  has_queue_data: boolean
}

export interface CountySummary {
  state: string
  county: string
  fips: string
  total_mw: number
  project_count: number
  solar?: number
  storage?: number
  wind?: number
}

export interface ISOSummary {
  iso: string
  total_mw: number
  project_count: number
}

export interface AppMeta {
  queue_fetched_at: string
  ica_fetched_at: string
  queue_project_count: number
  geocoded_count: number
  geocoded_pct: number
  circuit_count: number
}

export interface MapFilters {
  threshold: number
  minMW: number
  showActive: boolean
  showWithdrawn: boolean
  fuels: FuelType[]
  showQueueDots: boolean
  showISOBorders: boolean
  codFilter: 'all' | '2yr' | '5yr'
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJSONFeature[]
}

export interface GeoJSONFeature {
  type: 'Feature'
  geometry: {
    type: string
    coordinates: number[] | number[][] | number[][][]
  }
  properties: Record<string, unknown>
}
