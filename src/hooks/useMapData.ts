'use client'
import { useState, useEffect } from 'react'
import { CountySummary, ISOSummary, AppMeta, GeoJSONFeatureCollection } from '@/types'

interface MapData {
  queueProjects: GeoJSONFeatureCollection | null
  countySummary: CountySummary[]
  isoSummary: ISOSummary[]
  icaCircuits: GeoJSONFeatureCollection | null
  isoBoundaries: GeoJSONFeatureCollection | null
  meta: AppMeta | null
  loading: boolean
  error: string | null
}

const cache: Partial<MapData> = {}

export function useMapData(): MapData {
  const [data, setData] = useState<MapData>({
    queueProjects: null,
    countySummary: [],
    isoSummary: [],
    icaCircuits: null,
    isoBoundaries: null,
    meta: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    async function fetchAll() {
      try {
        const [queueProjects, countySummary, isoSummary, icaCircuits, meta] =
          await Promise.all([
            cache.queueProjects ??
              fetch('/data/queue_projects.geojson').then(r => r.json()),
            cache.countySummary ??
              fetch('/data/county_summary.json').then(r => r.json()),
            cache.isoSummary ??
              fetch('/data/iso_summary.json').then(r => r.json()),
            cache.icaCircuits ??
              fetch('/data/ica_circuits.geojson').then(r => r.json()),
            cache.meta ??
              fetch('/data/meta.json').then(r => r.json()),
          ])

        Object.assign(cache, { queueProjects, countySummary, isoSummary, icaCircuits, meta })

        let isoBoundaries: GeoJSONFeatureCollection | null = null
        try {
          const r = await fetch('/data/iso_boundaries.geojson')
          if (r.ok) isoBoundaries = await r.json()
        } catch {
          // optional file — state-polygon fallback is used when absent
        }

        setData({
          queueProjects,
          countySummary,
          isoSummary,
          icaCircuits,
          isoBoundaries,
          meta,
          loading: false,
          error: null,
        })
      } catch (err) {
        setData(prev => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load data',
        }))
      }
    }
    fetchAll()
  }, [])

  return data
}
