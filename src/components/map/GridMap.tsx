'use client'
import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { MapFilters, CountySummary, CircuitFeature, QueueProject } from '@/types'
import { ISO_BOUNDS } from '@/lib/constants'
import {
  getCircuitColor,
  getCircuitWeight,
  getCircuitState,
  getCountyColor,
  getISOStyle,
  createQueueMarker,
} from '@/lib/leaflet-utils'
import { renderPopupContent } from '@/lib/render-popup'
import CircuitPopup from '@/components/popups/CircuitPopup'
import QueueProjectPopup from '@/components/popups/QueueProjectPopup'
import CountyPopup from '@/components/popups/CountyPopup'
import ISOPopup from '@/components/popups/ISOPopup'
import { ISOSummary, GeoJSONFeatureCollection } from '@/types'

export interface GridMapHandle {
  flyToISO: (iso: string) => void
}

interface Props {
  filters: MapFilters
  queueProjects: GeoJSONFeatureCollection | null
  icaCircuits: GeoJSONFeatureCollection | null
  countySummary: CountySummary[]
  isoBoundaries: GeoJSONFeatureCollection | null
  isoSummary: ISOSummary[]
  onZoomChange?: (zoom: number) => void
}

const GridMap = forwardRef<GridMapHandle, Props>(function GridMap(
  { filters, queueProjects, icaCircuits, countySummary, isoBoundaries, isoSummary, onZoomChange },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRefs = useRef<{
    iso: L.LayerGroup
    county: L.LayerGroup
    circuits: L.LayerGroup
    queueDots: L.LayerGroup
  } | null>(null)

  // Initialize map once on mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [38, -98],
      zoom: 4,
      zoomControl: true,
      attributionControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    const iso = L.layerGroup().addTo(map)
    const county = L.layerGroup().addTo(map)
    const circuits = L.layerGroup().addTo(map)
    const queueDots = L.layerGroup().addTo(map)
    layerRefs.current = { iso, county, circuits, queueDots }

    map.on('zoomend', () => {
      const z = map.getZoom()
      onZoomChange?.(z)
      const countyOpacity = z >= 11 ? 0 : z >= 10 ? 0.4 : 1
      county.eachLayer(l => {
        if (l instanceof L.Path) l.setStyle({ fillOpacity: countyOpacity * 0.5 })
      })
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      layerRefs.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useImperativeHandle(ref, () => ({
    flyToISO(iso: string) {
      const bounds = ISO_BOUNDS[iso]
      if (bounds && mapRef.current) {
        mapRef.current.fitBounds(bounds, { padding: [40, 40] })
      }
    },
  }))

  // ISO boundaries layer
  useEffect(() => {
    if (!layerRefs.current) return
    const { iso } = layerRefs.current
    iso.clearLayers()
    if (!filters.showISOBorders) return

    if (!isoBoundaries) {
      Object.entries(ISO_BOUNDS).forEach(([name, bounds]) => {
        const rect = L.rectangle(bounds, getISOStyle(name))
        rect.bindTooltip(name, { permanent: true, direction: 'center', className: 'iso-label-tooltip' })
        const summary = isoSummary.find(s => s.iso === name)
        if (summary) {
          rect.bindPopup(renderPopupContent(ISOPopup, { isoSummary: summary, isoName: name }))
        }
        iso.addLayer(rect)
      })
      return
    }

    isoBoundaries.features.forEach(feat => {
      const isoName = (feat.properties?.NAME ?? feat.properties?.iso ?? '') as string
      const layer = L.geoJSON(feat as GeoJSON.Feature, {
        style: () => getISOStyle(isoName),
        onEachFeature: (_feature, l) => {
          l.bindTooltip(isoName, { permanent: false, direction: 'center' })
          const summary = isoSummary.find(s => s.iso === isoName)
          if (summary) {
            l.bindPopup(renderPopupContent(ISOPopup, { isoSummary: summary, isoName }))
          }
        },
      })
      iso.addLayer(layer)
    })
  }, [isoBoundaries, filters.showISOBorders, isoSummary])

  // County choropleth layer
  useEffect(() => {
    if (!layerRefs.current || !countySummary.length) return
    const { county } = layerRefs.current
    county.clearLayers()

    const fipsLookup: Record<string, CountySummary> = {}
    countySummary.forEach(c => { if (c.fips) fipsLookup[c.fips] = c })

    fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json')
      .then(r => r.json())
      .then(async (topo) => {
        const topojson = await import('topojson-client')
        const geojson = topojson.feature(
          topo,
          topo.objects.counties
        ) as unknown as GeoJSON.FeatureCollection

        const layer = L.geoJSON(geojson, {
          style: (feature) => {
            const fips = feature?.properties?.id as string ?? ''
            const data = fipsLookup[fips]
            return {
              fillColor: data ? getCountyColor(data.total_mw) : '#e8e8e2',
              fillOpacity: 0.5,
              color: '#e5e7eb',
              weight: 0.5,
              opacity: 0.8,
            }
          },
          onEachFeature: (feature, l) => {
            const fips = feature.properties?.id as string ?? ''
            const data = fipsLookup[fips]
            if (data) {
              l.on('mouseover', () => {
                l.bindPopup(renderPopupContent(CountyPopup, { summary: data })).openPopup()
              })
            }
          },
        })
        county.addLayer(layer)
      })
      .catch(err => console.warn('Failed to load county TopoJSON:', err))
  }, [countySummary])

  // ICA circuits layer
  useEffect(() => {
    if (!layerRefs.current || !icaCircuits) return
    const { circuits } = layerRefs.current
    circuits.clearLayers()

    icaCircuits.features.forEach(feat => {
      const p = feat.properties as unknown as CircuitFeature
      const color = getCircuitColor(p.net_mw, p.has_queue_data, filters.threshold)
      const weight = getCircuitWeight(p.voltage_kv)
      const isDashed = !p.net_mw || p.net_mw < 0.1

      const line = L.geoJSON(feat as GeoJSON.Feature, {
        style: {
          color,
          weight,
          opacity: 0.9,
          dashArray: isDashed ? '6 4' : undefined,
          lineCap: 'round',
          lineJoin: 'round',
        },
      })

      line.on('mouseover', () => {
        line.setStyle({ weight: weight + 2, color: '#ffffff', opacity: 1 })
        line.bindPopup(renderPopupContent(CircuitPopup, { ...p })).openPopup()
      })
      line.on('mouseout', () => {
        line.setStyle({ weight, color, opacity: 0.9 })
      })

      circuits.addLayer(line)
    })
  }, [icaCircuits, filters.threshold])

  // Queue dots layer
  useEffect(() => {
    if (!layerRefs.current || !queueProjects) return
    const { queueDots } = layerRefs.current
    queueDots.clearLayers()
    if (!filters.showQueueDots) return

    import('leaflet.markercluster').then(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cluster = (L as any).markerClusterGroup({
        maxClusterRadius: 50,
        disableClusteringAtZoom: 10,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        iconCreateFunction: (c: any) => {
          const count = c.getChildCount()
          const size = Math.min(40, Math.max(16, Math.log(count) * 10))
          return L.divIcon({
            html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#64748b;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;border:1.5px solid #fff">${count}</div>`,
            className: '',
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          })
        },
      })

      const cutoffDate = filters.codFilter !== 'all'
        ? new Date(new Date().setFullYear(
            new Date().getFullYear() + (filters.codFilter === '2yr' ? 2 : 5)
          ))
        : null

      queueProjects.features.forEach(feat => {
        const p = feat.properties as unknown as QueueProject
        const coords = (feat.geometry as GeoJSON.Point).coordinates

        if (!filters.fuels.includes(p.fuel)) return
        if (p.mw < filters.minMW) return
        const upper = (p.status ?? '').toUpperCase()
        const isActive = upper === 'ACTIVE' || upper === 'IN SERVICE' || upper === 'OPERATIONAL'
        if (filters.showActive && !filters.showWithdrawn && !isActive) return
        if (!filters.showActive && filters.showWithdrawn && isActive) return
        if (cutoffDate && p.cod) {
          const cod = new Date(p.cod)
          if (!isNaN(cod.getTime()) && cod > cutoffDate) return
        }

        const marker = createQueueMarker(coords[1], coords[0], p.fuel, p.mw, p.status)
        marker.on('mouseover', () => {
          marker.bindPopup(renderPopupContent(QueueProjectPopup, { project: p })).openPopup()
        })
        cluster.addLayer(marker)
      })

      queueDots.addLayer(cluster)
    })
  }, [queueProjects, filters.showQueueDots, filters.fuels, filters.minMW, filters.showActive, filters.showWithdrawn, filters.codFilter])

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      <style>{`
        .iso-label-tooltip {
          background: transparent;
          border: none;
          box-shadow: none;
          font-size: 11px;
          color: #6B7280;
          font-weight: 500;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 10px;
          padding: 0;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          border: 1px solid #e5e7eb;
        }
        .leaflet-popup-content {
          margin: 0;
        }
        .leaflet-popup-tip-container {
          display: none;
        }
      `}</style>
    </div>
  )
})

export default GridMap
