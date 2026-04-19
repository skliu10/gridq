'use client'
import { MapFilters, FuelType } from '@/types'
import { FUEL_COLORS, FUEL_LABELS } from '@/lib/constants'

interface FuelStats {
  count: number
  mw: number
}

interface Stats {
  totalQueueProjects: number
  totalQueueMW: number
  byFuel: Record<string, FuelStats>
}

interface Props {
  filters: MapFilters
  setMinMW: (v: number) => void
  toggleFuel: (f: FuelType) => void
  setShowWithdrawn: (v: boolean) => void
  setShowQueueDots: (v: boolean) => void
  setShowISOBorders: (v: boolean) => void
  setCodFilter: (v: MapFilters['codFilter']) => void
  stats: Stats
}

export default function Sidebar({
  filters, setMinMW, toggleFuel,
  setShowWithdrawn, setShowQueueDots,
  setShowISOBorders, setCodFilter, stats,
}: Props) {
  return (
    <div className="w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">

      {/* Section 1 — Layer controls */}
      <div className="p-4 border-b border-gray-100">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-3">Layers</p>

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

        {/* Fuel type pills */}
        {filters.showQueueDots && (
          <div className="flex flex-wrap gap-1.5 mb-3 ml-0.5">
            {(Object.keys(FUEL_COLORS) as FuelType[]).map(fuel => {
              const active = filters.fuels.includes(fuel)
              return (
                <button
                  key={fuel}
                  onClick={() => toggleFuel(fuel)}
                  title={FUEL_LABELS[fuel]}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all"
                  style={active ? {
                    background: FUEL_COLORS[fuel] + '22',
                    borderColor: FUEL_COLORS[fuel],
                    color: FUEL_COLORS[fuel],
                  } : {
                    background: 'transparent',
                    borderColor: '#d1d5db',
                    color: '#9ca3af',
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: active ? FUEL_COLORS[fuel] : '#d1d5db' }}
                  />
                  {FUEL_LABELS[fuel]}
                </button>
              )
            })}
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

        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-600">Include inactive</span>
            <p className="text-[10px] text-gray-400">Show withdrawn &amp; completed projects</p>
          </div>
          <button
            onClick={() => setShowWithdrawn(!filters.showWithdrawn)}
            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors flex-shrink-0 ${
              filters.showWithdrawn ? 'bg-[#1D9E75]' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${
              filters.showWithdrawn ? 'translate-x-3.5' : 'translate-x-0.5'
            }`} />
          </button>
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
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-3">Queue summary</p>

        {/* Totals */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 bg-gray-50 rounded-md px-2 py-2">
            <div className="text-base font-semibold text-gray-800 leading-tight">
              {stats.totalQueueProjects.toLocaleString()}
            </div>
            <div className="text-[10px] text-gray-400">Projects</div>
          </div>
          <div className="flex-1 bg-gray-50 rounded-md px-2 py-2">
            <div className="text-base font-semibold text-gray-800 leading-tight">
              {stats.totalQueueMW >= 1000
                ? `${(stats.totalQueueMW / 1000).toFixed(0)} GW`
                : `${Math.round(stats.totalQueueMW)} MW`}
            </div>
            <div className="text-[10px] text-gray-400">Capacity</div>
          </div>
        </div>

        {/* Per-fuel breakdown */}
        <div className="space-y-1">
          {(Object.keys(FUEL_COLORS) as FuelType[])
            .filter(fuel => (stats.byFuel[fuel]?.count ?? 0) > 0)
            .sort((a, b) => (stats.byFuel[b]?.mw ?? 0) - (stats.byFuel[a]?.mw ?? 0))
            .map(fuel => {
              const s = stats.byFuel[fuel]
              const pct = stats.totalQueueMW > 0
                ? Math.round((s.mw / stats.totalQueueMW) * 100)
                : 0
              return (
                <div key={fuel} className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: FUEL_COLORS[fuel] }}
                  />
                  <span className="text-[11px] text-gray-600 flex-1">{FUEL_LABELS[fuel]}</span>
                  <span className="text-[11px] text-gray-400">{s.count.toLocaleString()}</span>
                  <span className="text-[10px] text-gray-300 w-7 text-right">{pct}%</span>
                </div>
              )
            })
          }
        </div>
      </div>

      {/* Section 4 — Data coverage */}
      <div className="p-4">
        <div className="bg-amber-50 border-l-2 border-amber-400 rounded-sm p-3">
          <p className="text-[11px] text-amber-900 leading-relaxed">
            <span className="font-medium">Queue data:</span> All 7 US ISOs via gridstatus<br />
            <span className="font-medium">County heatmap:</span> Queued MW by county
          </p>
        </div>
      </div>

    </div>
  )
}
