import { CircuitFeature } from '@/types'
import { CIRCUIT_STATE_COLORS, CIRCUIT_STATE_LABELS } from '@/lib/constants'
import { getCircuitState } from '@/lib/leaflet-utils'

interface Props extends CircuitFeature {
  onClose?: () => void
}

export default function CircuitPopup({
  circuit_id, substation, voltage_kv, gross_mw, queued_mw, net_mw,
  has_queue_data, utility
}: Props) {
  const state = getCircuitState(net_mw, has_queue_data, 2)
  const stateColor = CIRCUIT_STATE_COLORS[state] ?? CIRCUIT_STATE_COLORS.no_data
  const stateLabel = CIRCUIT_STATE_LABELS[state] ?? 'Unknown'
  const netColor = net_mw < 0.1 ? '#9E9E9E' : net_mw >= 2 ? '#1D9E75' : '#EF9F27'
  const grossSafe = gross_mw > 0 ? gross_mw : 1
  const netPct = Math.min(100, Math.max(0, (net_mw / grossSafe) * 100))
  const queuedPct = Math.min(100 - netPct, (queued_mw / grossSafe) * 100)

  return (
    <div className="min-w-[220px] p-3 text-sm bg-white">
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="font-medium text-gray-900">{circuit_id}</div>
          <div className="text-xs text-gray-500">{substation}</div>
        </div>
        <span className="ml-2 flex-shrink-0 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
          {voltage_kv} kV
        </span>
      </div>

      <div className="space-y-1 my-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Gross capacity</span>
          <span className="font-medium text-gray-700">{gross_mw.toFixed(1)} MW</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Queued MW</span>
          <span className="font-medium text-amber-600">{queued_mw.toFixed(1)} MW</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Net remaining</span>
          <span className="font-medium" style={{ color: netColor }}>{net_mw.toFixed(1)} MW</span>
        </div>
      </div>

      <div className="h-2 rounded bg-gray-100 overflow-hidden flex mb-2">
        <div style={{ width: `${netPct}%`, background: '#1D9E75' }} />
        <div style={{ width: `${queuedPct}%`, background: '#EF9F27' }} />
      </div>

      <div className="mb-2">
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: stateColor + '22', color: stateColor }}
        >
          {stateLabel}
        </span>
      </div>

      {!has_queue_data && (
        <p className="text-xs text-amber-600 mb-1">
          Queue backlog unavailable for this utility
        </p>
      )}

      <div className="text-xs text-gray-400 mt-1">
        Updated monthly · {utility}
      </div>
    </div>
  )
}
