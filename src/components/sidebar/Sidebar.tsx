'use client'
import { MapFilters, FuelType } from '@/types'
import {
  CIRCUIT_STATE_COLORS,
  CIRCUIT_STATE_LABELS,
  CIRCUIT_STATE_DESCRIPTIONS,
  FUEL_COLORS,
  FUEL_LABELS,
} from '@/lib/constants'

interface Stats {
  open: number
  open_contested: number
  tight: number
  tight_contested: number
  constrained: number
  totalQueueProjects: number
  totalQueueMW: number
}

interface Props {
  filters: MapFilters
  setThreshold: (v: number) => void
  setMinMW: (v: number) => void
  toggleFuel: (f: FuelType) => void
  setShowActive: (v: boolean) => void
  setShowWithdrawn: (v: boolean) => void
  setShowQueueDots: (v: boolean) => void
  setShowISOBorders: (v: boolean) => void
  setCodFilter: (v: MapFilters['codFilter']) => void
  stats: Stats
  currentZoom: number
}

export default function Sidebar({
  filters, setThreshold, setMinMW, toggleFuel,
  setShowActive, setShowWithdrawn, setShowQueueDots,
  setShowISOBorders, setCodFilter, stats, currentZoom,
}: Props) {
  const circuitsVisible = currentZoom >= 11

  return (
    <div className="w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">

      {/* Section 1 — Layer controls */}
      <div className="p-4 border-b border-gray-100">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-3">
          Circuit status
        </p>
        <div className={`space-y-2 mb-4 transition-opacity ${circuitsVisible ? 'opacity-100' : 'opacity-40'}`}>
          {Object.entries(CIRCUIT_STATE_COLORS).map(([state, color]) => (
            <div key={state} className="flex items-start gap-2">
              <div
                className="flex-shrink-0 rounded"
                style={{ width: 24, height: 5, background: color, marginTop: 6 }}
              />
              <div>
                <div className="text-[11px] font-medium text-gray-700 leading-tight">
                  {CIRCUIT_STATE_LABELS[state]}
                </div>
                <div className="text-[10px] text-gray-400 leading-tight">
                  {CIRCUIT_STATE_DESCRIPTIONS[state]}
                </div>
              </div>
            </div>
          ))}
          {!circuitsVisible && (
            <p className="text-[10px] text-gray-400 italic">Zoom in to z11+ to see circuits</p>
          )}
        </div>

        {/* Queue dots toggle */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] text-gray-600">Queue projects</span>
          <button
            onClick={() => setShowQueueDots(!filters.showQueueDots)}
            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
              filters.showQueueDots ? 'bg-[#1D9E75]' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${
              filters.showQueueDots ? 'translate-x-3.5' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {/* Fuel checkboxes */}
        {filters.showQueueDots && (
          <div className="space-y-1 ml-1 mb-3">
            {(Object.keys(FUEL_COLORS) as FuelType[]).map(fuel => (
              <label key={fuel} className="flex items-center gap-2 cursor-pointer">
                <div
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ background: FUEL_COLORS[fuel] }}
                />
                <input
                  type="checkbox"
                  checked={filters.fuels.includes(fuel)}
                  onChange={() => toggleFuel(fuel)}
                  className="sr-only"
                />
                <span className="text-[11px] text-gray-600">{FUEL_LABELS[fuel]}</span>
              </label>
            ))}
          </div>
        )}

        {/* ISO borders toggle */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-600">ISO borders</span>
          <button
            onClick={() => setShowISOBorders(!filters.showISOBorders)}
            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
              filters.showISOBorders ? 'bg-[#1D9E75]' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${
              filters.showISOBorders ? 'translate-x-3.5' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
      </div>

      {/* Section 2 — Filters */}
      <div className="p-4 border-b border-gray-100 space-y-4">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Filters</p>

        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[11px] text-gray-600">High capacity above</span>
            <span className="text-[11px] font-medium text-[#1D9E75]">{filters.threshold} MW</span>
          </div>
          <input
            type="range" min={0.5} max={10} step={0.5}
            value={filters.threshold}
            onChange={e => setThreshold(parseFloat(e.target.value))}
            className="w-full h-1 accent-[#1D9E75]"
          />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[11px] text-gray-600">Min project size</span>
            <span className="text-[11px] font-medium text-gray-700">{filters.minMW} MW</span>
          </div>
          <input
            type="range" min={0} max={500} step={10}
            value={filters.minMW}
            onChange={e => setMinMW(parseInt(e.target.value))}
            className="w-full h-1 accent-[#1D9E75]"
          />
        </div>

        <div>
          <p className="text-[11px] text-gray-600 mb-1">Project status</p>
          <div className="flex gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" checked={filters.showActive && !filters.showWithdrawn}
                onChange={() => { setShowActive(true); setShowWithdrawn(false) }}
                className="accent-[#1D9E75]" />
              <span className="text-[11px] text-gray-600">Active only</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" checked={filters.showActive && filters.showWithdrawn}
                onChange={() => { setShowActive(true); setShowWithdrawn(true) }}
                className="accent-[#1D9E75]" />
              <span className="text-[11px] text-gray-600">All</span>
            </label>
          </div>
        </div>

        <div>
          <p className="text-[11px] text-gray-600 mb-1">Proposed COD</p>
          <select
            value={filters.codFilter}
            onChange={e => setCodFilter(e.target.value as MapFilters['codFilter'])}
            className="w-full text-[11px] border border-gray-200 rounded px-2 py-1 text-gray-700 bg-white"
          >
            <option value="all">All dates</option>
            <option value="2yr">Within 2 years</option>
            <option value="5yr">Within 5 years</option>
          </select>
        </div>
      </div>

      {/* Section 3 — Stats */}
      <div className="p-4 border-b border-gray-100">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-3">Summary</p>
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {[
            { label: 'Open', value: stats.open, color: '#1D9E75' },
            { label: 'Contested', value: stats.open_contested, color: '#5DCAA5' },
            { label: 'Tight', value: stats.tight + stats.tight_contested, color: '#EF9F27' },
            { label: 'Constrained', value: stats.constrained, color: '#9E9E9E' },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-md p-2">
              <div className="text-base font-medium" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="text-[11px] text-gray-500 space-y-0.5">
          <div>Queue projects: <span className="font-medium text-gray-700">{stats.totalQueueProjects.toLocaleString()}</span></div>
          <div>Active MW: <span className="font-medium text-gray-700">{Math.round(stats.totalQueueMW).toLocaleString()} MW</span></div>
        </div>
      </div>

      {/* Section 4 — Data coverage */}
      <div className="p-4">
        <div className="bg-amber-50 border-l-2 border-amber-400 rounded-sm p-3">
          <p className="text-[11px] text-amber-900 leading-relaxed">
            <span className="font-medium">Circuit data:</span> California only (SCE, PG&E, SDG&E)<br />
            <span className="font-medium">Queue data:</span> All 7 US ISOs via gridstatus<br />
            <span className="font-medium">Outside CA:</span> County-level signal only
          </p>
          <a href="#" className="text-[11px] text-amber-700 underline mt-1 block">
            More states coming — contribute data →
          </a>
        </div>
      </div>

    </div>
  )
}
