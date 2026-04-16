import L from 'leaflet'
import {
  CIRCUIT_STATE_COLORS,
  FUEL_COLORS,
  ISO_COLORS,
  COUNTY_COLOR_SCALE,
} from '@/lib/constants'
import { FuelType } from '@/types'

export function getCircuitState(
  net_mw: number,
  has_queue_data: boolean,
  threshold: number
): string {
  if (net_mw === undefined || net_mw === null) return 'no_data'
  if (net_mw < 0.1) return 'constrained'
  if (net_mw >= threshold) return has_queue_data ? 'open_contested' : 'open'
  return has_queue_data ? 'tight_contested' : 'tight'
}

export function getCircuitColor(
  net_mw: number,
  has_queue_data: boolean,
  threshold: number
): string {
  const state = getCircuitState(net_mw, has_queue_data, threshold)
  return CIRCUIT_STATE_COLORS[state] ?? CIRCUIT_STATE_COLORS.no_data
}

export function getCircuitWeight(voltage_kv: number): number {
  if (voltage_kv >= 33) return 4
  if (voltage_kv >= 16) return 3
  return 2
}

export function getQueueDotRadius(mw: number): number {
  return Math.max(4, Math.min(18, Math.sqrt(Math.max(mw, 1)) * 1.8))
}

export function getQueueDotColor(fuel: FuelType): string {
  return FUEL_COLORS[fuel] ?? FUEL_COLORS.other
}

export function getQueueDotOpacity(status: string): number {
  const upper = status.toUpperCase()
  if (upper === 'ACTIVE' || upper === 'IN SERVICE' || upper === 'OPERATIONAL') {
    return 0.85
  }
  return 0.3
}

export function getCountyColor(total_mw: number): string {
  if (!total_mw || total_mw === 0) return COUNTY_COLOR_SCALE[0].color
  for (const step of COUNTY_COLOR_SCALE) {
    if (total_mw <= step.max) return step.color
  }
  return COUNTY_COLOR_SCALE[COUNTY_COLOR_SCALE.length - 1].color
}

export function getISOStyle(isoName: string): L.PathOptions {
  const color = ISO_COLORS[isoName] ?? '#888888'
  return {
    color,
    weight: 2,
    opacity: 0.8,
    fillColor: color,
    fillOpacity: 0.12,
  }
}

export function createQueueMarker(
  lat: number,
  lng: number,
  fuel: FuelType,
  mw: number,
  status: string
): L.CircleMarker {
  return L.circleMarker([lat, lng], {
    radius: getQueueDotRadius(mw),
    fillColor: getQueueDotColor(fuel),
    color: '#ffffff',
    weight: 1.5,
    opacity: 1,
    fillOpacity: getQueueDotOpacity(status),
  })
}
