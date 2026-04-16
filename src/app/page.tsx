'use client'
import React, { useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import TopBar from '@/components/topbar/TopBar'
import Sidebar from '@/components/sidebar/Sidebar'
import { useMapData } from '@/hooks/useMapData'
import { useMapFilters } from '@/hooks/useMapFilters'
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
  const [activeISO, setActiveISO] = React.useState<string | null>(null)

  const {
    queueProjects, countySummary, isoSummary,
    isoBoundaries, meta, loading
  } = useMapData()

  const {
    filters, setMinMW, toggleFuel,
    setShowWithdrawn, setShowQueueDots,
    setShowISOBorders, setCodFilter,
  } = useMapFilters()

  const handleISOSelect = useCallback((iso: string) => {
    setActiveISO(iso)
    mapRef.current?.flyToISO(iso)
  }, [])

  const stats = useMemo(() => {
    const cutoffDate = filters.codFilter !== 'all'
      ? new Date(new Date().setFullYear(
          new Date().getFullYear() + (filters.codFilter === '2yr' ? 2 : 5)
        ))
      : null

    let totalQueueProjects = 0
    let totalQueueMW = 0
    const byFuel: Record<string, { count: number; mw: number }> = {}

    if (queueProjects) {
      queueProjects.features.forEach(f => {
        const p = f.properties as { mw: number; status: string; fuel: string; cod: string }
        if (!filters.fuels.includes(p.fuel as import('@/types').FuelType)) return
        if ((p.mw ?? 0) < filters.minMW) return
        if (cutoffDate && p.cod) {
          const cod = new Date(p.cod)
          if (!isNaN(cod.getTime()) && cod > cutoffDate) return
        }
        const isWithdrawn = (p.status ?? '').toUpperCase() === 'WITHDRAWN'
        if (!filters.showWithdrawn && isWithdrawn) return
        totalQueueProjects++
        totalQueueMW += p.mw ?? 0
        const fuel = p.fuel || 'other'
        if (!byFuel[fuel]) byFuel[fuel] = { count: 0, mw: 0 }
        byFuel[fuel].count++
        byFuel[fuel].mw += p.mw ?? 0
      })
    }
    return { totalQueueProjects, totalQueueMW, byFuel }
  }, [queueProjects, filters.showWithdrawn, filters.fuels, filters.minMW, filters.codFilter])

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
          setMinMW={setMinMW}
          toggleFuel={toggleFuel}
          setShowWithdrawn={setShowWithdrawn}
          setShowQueueDots={setShowQueueDots}
          setShowISOBorders={setShowISOBorders}
          setCodFilter={setCodFilter}
          stats={stats}
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
            countySummary={countySummary}
            isoBoundaries={isoBoundaries}
            isoSummary={isoSummary}
          />
        )}
      </div>
    </div>
  )
}
