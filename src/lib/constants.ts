import { FuelType } from '@/types'

export const ISO_COLORS: Record<string, string> = {
  PJM:   '#1a6bb5',
  MISO:  '#b07a0f',
  CAISO: '#6b4ab0',
  ERCOT: '#b04a1a',
  ISONE: '#0f7a5a',
  NYISO: '#4a4ab0',
  SPP:   '#2a7a2a',
}

export const ISO_BOUNDS: Record<string, [[number, number], [number, number]]> = {
  PJM:   [[36.5, -84.0], [47.5, -73.5]],
  MISO:  [[29.5, -100.5],[49.5, -80.0]],
  CAISO: [[32.5, -124.5],[42.5, -113.5]],
  ERCOT: [[25.5, -106.5],[36.5, -93.5]],
  ISONE: [[41.0, -73.7], [47.5, -66.9]],
  NYISO: [[40.4, -79.8], [45.1, -71.8]],
  SPP:   [[28.0, -103.0],[45.5, -88.0]],
}

export const FUEL_COLORS: Record<FuelType, string> = {
  solar:         '#F59E0B',
  storage:       '#7C3AED',
  wind:          '#0EA5E9',
  offshore_wind: '#0369A1',
  gas:           '#EF4444',
  nuclear:       '#8B5CF6',
  hydro:         '#06B6D4',
  other:         '#6B7280',
}

export const FUEL_LABELS: Record<FuelType, string> = {
  solar:         'Solar',
  storage:       'Battery storage',
  wind:          'Wind',
  offshore_wind: 'Offshore wind',
  gas:           'Gas',
  nuclear:       'Nuclear',
  hydro:         'Hydro',
  other:         'Other',
}

export const CIRCUIT_STATE_COLORS: Record<string, string> = {
  open:            '#1D9E75',
  open_contested:  '#5DCAA5',
  tight:           '#EF9F27',
  tight_contested: '#D85A30',
  constrained:     '#9E9E9E',
  no_data:         '#BDBDBD',
}

export const CIRCUIT_STATE_LABELS: Record<string, string> = {
  open:            'Open',
  open_contested:  'Open, contested',
  tight:           'Tight',
  tight_contested: 'Tight, contested',
  constrained:     'Constrained',
  no_data:         'No data',
}

export const CIRCUIT_STATE_DESCRIPTIONS: Record<string, string> = {
  open:            '> threshold MW, no queue',
  open_contested:  '> threshold MW, queue present',
  tight:           '0.1–threshold MW, no queue',
  tight_contested: '0.1–threshold MW, queue present',
  constrained:     '< 0.1 MW remaining',
  no_data:         'Circuit not modeled',
}

export const DEFAULT_FILTERS: import('@/types').MapFilters = {
  threshold: 2,
  minMW: 0,
  showActive: true,
  showWithdrawn: false,
  fuels: ['solar','storage','wind','offshore_wind','gas','nuclear','hydro','other'],
  showQueueDots: true,
  showISOBorders: true,
  codFilter: 'all',
}

export const COUNTY_COLOR_SCALE = [
  { max: 0,        color: '#e8e8e2' },
  { max: 500,      color: '#c8e6c9' },
  { max: 2000,     color: '#66bb6a' },
  { max: 5000,     color: '#2e7d32' },
  { max: Infinity, color: '#1b5e20' },
]
