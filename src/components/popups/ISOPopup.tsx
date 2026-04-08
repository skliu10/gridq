import { ISOSummary } from '@/types'
import { ISO_COLORS } from '@/lib/constants'

interface Props {
  isoSummary: ISOSummary
  isoName: string
  onClose?: () => void
}

export default function ISOPopup({ isoSummary, isoName }: Props) {
  const color = ISO_COLORS[isoName] ?? '#888888'
  return (
    <div
      className="min-w-[160px] p-3 text-sm bg-white border-l-4"
      style={{ borderColor: color }}
    >
      <div className="font-medium text-gray-900 mb-2">{isoName}</div>
      <div className="text-xl font-medium text-gray-900 mb-0.5">
        {isoSummary.total_mw.toLocaleString()} MW
      </div>
      <div className="text-xs text-gray-500">
        {isoSummary.project_count.toLocaleString()} projects in queue
      </div>
    </div>
  )
}
