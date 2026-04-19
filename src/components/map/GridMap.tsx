'use client'
import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { MapFilters, CountySummary, QueueProject } from '@/types'
import { ISO_BOUNDS, STATE_FIPS_TO_ISO } from '@/lib/constants'
import {
  getCountyColor,
  getISOStyle,
  createQueueMarker,
} from '@/lib/leaflet-utils'
import { renderPopupContent } from '@/lib/render-popup'
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
  countySummary: CountySummary[]
  isoBoundaries: GeoJSONFeatureCollection | null
  isoSummary: ISOSummary[]
}

const GridMap = forwardRef<GridMapHandle, Props>(function GridMap(
  { filters, queueProjects, countySummary, isoBoundaries, isoSummary },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRefs = useRef<{
    iso: L.LayerGroup
    county: L.LayerGroup
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
    const queueDots = L.layerGroup().addTo(map)
    layerRefs.current = { iso, county, queueDots }

    map.on('zoomend', () => {
      const z = map.getZoom()
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
      // Build ISO boundaries from us-atlas state polygons
      fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json')
        .then(r => r.json())
        .then(async (topo) => {
          const topojson = await import('topojson-client')
          const geojson = topojson.feature(topo, topo.objects.states) as unknown as GeoJSON.FeatureCollection

          // Group state features by ISO
          const isoFeatureMap: Record<string, GeoJSON.Feature[]> = {}
          geojson.features.forEach(feat => {
            const fips = String(feat.id ?? '').padStart(2, '0')
            const isoName = STATE_FIPS_TO_ISO[fips]
            if (!isoName) return
            if (!isoFeatureMap[isoName]) isoFeatureMap[isoName] = []
            isoFeatureMap[isoName].push(feat)
          })

          Object.entries(isoFeatureMap).forEach(([isoName, features]) => {
            const summary = isoSummary.find(s => s.iso === isoName)
            const layer = L.geoJSON(features, {
              style: () => getISOStyle(isoName),
              onEachFeature: (_feat, l) => {
                if (summary) {
                  l.bindPopup(renderPopupContent(ISOPopup, { isoSummary: summary, isoName }))
                }
              },
            })
            layer.bindTooltip(isoName, { sticky: true, className: 'iso-label-tooltip' })
            iso.addLayer(layer)
          })
        })
        .catch(() => {
          // Last-resort fallback: labeled bounding rectangles
          Object.entries(ISO_BOUNDS).forEach(([name, bounds]) => {
            const rect = L.rectangle(bounds, getISOStyle(name))
            rect.bindTooltip(name, { permanent: true, direction: 'center', className: 'iso-label-tooltip' })
            const summary = isoSummary.find(s => s.iso === name)
            if (summary) rect.bindPopup(renderPopupContent(ISOPopup, { isoSummary: summary, isoName: name }))
            iso.addLayer(rect)
          })
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
        const status = (p.status ?? '').toUpperCase()
        const isInactive = status === 'WITHDRAWN' || status === 'COMPLETED' || status === 'DONE' || status === 'LEGACY: DONE'
        if (!filters.showWithdrawn && isInactive) return
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
  }, [queueProjects, filters.showQueueDots, filters.fuels, filters.minMW, filters.showWithdrawn, filters.codFilter])

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
          overflow: visible;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          border: 1px solid #e5e7eb;
        }
        .leaflet-popup-content {
          margin: 0;
          overflow: hidden;
          border-radius: 10px;
        }
        .leaflet-popup-tip-container {
          display: none;
        }
      `}</style>
    </div>
  )
})

export default GridMap
