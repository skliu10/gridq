import { CountySummary } from '@/types'

interface Props {
  summary: CountySummary
  onClose?: () => void
}

export default function CountyPopup({ summary }: Props) {
  const { county, state, total_mw, project_count, solar = 0, storage = 0, wind = 0 } = summary
  const maxFuel = Math.max(solar, storage, wind, 1)

  return (
    <div className="min-w-[180px] p-3 text-sm bg-white">
      <div className="font-medium text-gray-900 mb-1">{county}, {state}</div>

      <div className="text-xl font-medium text-green-700 mb-0.5">
        {total_mw.toLocaleString()} MW
      </div>
      <div className="text-xs text-gray-500 mb-3">active queue · {project_count} projects</div>

      <div className="space-y-1 mb-3">
        {[
          { label: 'Solar', value: solar, color: '#F59E0B' },
          { label: 'Storage', value: storage, color: '#7C3AED' },
          { label: 'Wind', value: wind, color: '#0EA5E9' },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-gray-500">{label}</span>
              <span className="text-gray-700">{value.toLocaleString()} MW</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded overflow-hidden">
              <div
                className="h-full rounded"
                style={{ width: `${(value / maxFuel) * 100}%`, background: color }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-amber-600">
        Queue-derived signal — no circuit ICA data
      </div>
    </div>
  )
}
