'use client'
import { useRef, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import TopBar from '@/components/topbar/TopBar'
import Sidebar from '@/components/sidebar/Sidebar'
import { useMapData } from '@/hooks/useMapData'
import { useMapFilters } from '@/hooks/useMapFilters'
import { getCircuitState } from '@/lib/leaflet-utils'
import type { GridMapHandle } from '@/components/map/GridMap'

// Dynamic import to avoid SSR — Leaflet requires window
const GridMap = dynamic(() => import('@/components/map/GridMap'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="text-sm text-gray-400">Loading map...</div>
    </div>
  ),
})

export default function Home() {
  const mapRef = useRef<GridMapHandle>(null)
  const [currentZoom, setCurrentZoom] = useState(4)
  const [activeISO, setActiveISO] = useState<string | null>(null)

  const {
    queueProjects, countySummary, isoSummary,
    icaCircuits, isoBoundaries, meta, loading
  } = useMapData()

  const {
    filters, setThreshold, setMinMW, toggleFuel,
    setShowActive, setShowWithdrawn, setShowQueueDots,
    setShowISOBorders, setCodFilter,
  } = useMapFilters()

  const handleISOSelect = useCallback((iso: string) => {
    setActiveISO(iso)
    mapRef.current?.flyToISO(iso)
  }, [])

  const stats = useMemo(() => {
    const counts = { open: 0, open_contested: 0, tight: 0, tight_contested: 0, constrained: 0 }
    if (icaCircuits) {
      icaCircuits.features.forEach(f => {
        const p = f.properties as { net_mw: number; has_queue_data: boolean }
        const state = getCircuitState(p.net_mw, p.has_queue_data, filters.threshold)
        if (state in counts) counts[state as keyof typeof counts]++
      })
    }
    let totalQueueProjects = 0
    let totalQueueMW = 0
    if (queueProjects) {
      queueProjects.features.forEach(f => {
        const p = f.properties as { mw: number; status: string; fuel: string }
        const upper = (p.status ?? '').toUpperCase()
        const isActive = upper === 'ACTIVE' || upper === 'IN SERVICE'
        if (filters.showActive && isActive) {
          totalQueueProjects++
          totalQueueMW += p.mw ?? 0
        }
        if (filters.showWithdrawn && !isActive) {
          totalQueueProjects++
        }
      })
    }
    return { ...counts, totalQueueProjects, totalQueueMW }
  }, [icaCircuits, queueProjects, filters.threshold, filters.showActive, filters.showWithdrawn])

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar
        onISOSelect={handleISOSelect}
        activeISO={activeISO}
        meta={meta}
      />
      <div className="flex flex-1 min-h-0">
        <Sidebar
          filters={filters}
          setThreshold={setThreshold}
          setMinMW={setMinMW}
          toggleFuel={toggleFuel}
          setShowActive={setShowActive}
          setShowWithdrawn={setShowWithdrawn}
          setShowQueueDots={setShowQueueDots}
          setShowISOBorders={setShowISOBorders}
          setCodFilter={setCodFilter}
          stats={stats}
          currentZoom={currentZoom}
        />
        {loading ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-sm text-gray-400">Loading grid data...</div>
          </div>
        ) : (
          <GridMap
            ref={mapRef}
            filters={filters}
            queueProjects={queueProjects}
            icaCircuits={icaCircuits}
            countySummary={countySummary}
            isoBoundaries={isoBoundaries}
            isoSummary={isoSummary}
            onZoomChange={setCurrentZoom}
          />
        )}
      </div>
    </div>
  )
}
