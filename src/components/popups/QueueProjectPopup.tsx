import { QueueProject } from '@/types'
import { ISO_COLORS, FUEL_COLORS, FUEL_LABELS } from '@/lib/constants'

interface Props {
  project: QueueProject
  onClose?: () => void
}

function formatCOD(cod: string): string {
  if (!cod) return '—'
  const d = new Date(cod)
  if (isNaN(d.getTime())) return cod
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export default function QueueProjectPopup({ project }: Props) {
  const {
    name, iso, fuel, mw, status, poi, cod, geo_score
  } = project
  const isoColor = ISO_COLORS[iso] ?? '#888888'
  const fuelColor = FUEL_COLORS[fuel] ?? FUEL_COLORS.other
  const fuelLabel = FUEL_LABELS[fuel] ?? fuel
  const upper = (status ?? '').toUpperCase()
  const isActive = upper === 'ACTIVE' || upper === 'IN SERVICE' || upper === 'OPERATIONAL'

  return (
    <div className="min-w-[200px] p-3 text-sm bg-white">
      <div className="font-medium text-gray-900 truncate max-w-[200px] mb-1">{name}</div>

      <div className="flex gap-1 mb-2 flex-wrap">
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
          style={{ background: isoColor }}
        >
          {iso}
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
          style={{ background: fuelColor }}
        >
          {fuelLabel}
        </span>
      </div>

      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-medium text-gray-900">{mw.toLocaleString()}</span>
        <span className="text-xs text-gray-500">MW</span>
      </div>

      <div className="mb-2">
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {status}
        </span>
      </div>

      <div className="space-y-0.5 text-xs text-gray-600">
        <div><span className="text-gray-400">POI: </span>{poi || '—'}</div>
        <div><span className="text-gray-400">COD: </span>{formatCOD(cod)}</div>
      </div>

      {geo_score < 85 && (
        <div className="mt-2 text-xs text-amber-600">
          Location approximate (fuzzy match)
        </div>
      )}
    </div>
  )
}
