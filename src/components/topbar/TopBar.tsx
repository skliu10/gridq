'use client'
import { AppMeta } from '@/types'
import { ISO_COLORS } from '@/lib/constants'

interface Props {
  onISOSelect: (iso: string) => void
  activeISO: string | null
  meta: AppMeta | null
}

function daysSince(isoString: string): number {
  return Math.floor((Date.now() - new Date(isoString).getTime()) / 86400000)
}

export default function TopBar({ onISOSelect, activeISO, meta }: Props) {
  const days = meta ? daysSince(meta.queue_fetched_at) : null
  const ageColor = days === null ? 'text-gray-400'
    : days > 90 ? 'text-red-500'
    : days > 30 ? 'text-amber-500'
    : 'text-gray-400'

  return (
    <div className="h-11 bg-white border-b border-gray-200 flex items-center px-4 gap-4 z-10 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M10 2L4 10h5l-1 6 6-8h-5l1-6z" fill="#1D9E75" stroke="#1D9E75" strokeWidth="0.5" strokeLinejoin="round"/>
        </svg>
        <span className="text-[13px] font-medium text-gray-900">GridCapacity</span>
      </div>

      {/* ISO pills */}
      <div className="flex gap-1.5 flex-1 justify-center">
        {Object.keys(ISO_COLORS).map(iso => (
          <button
            key={iso}
            onClick={() => onISOSelect(iso)}
            className={`text-[11px] px-3 py-1 rounded-full border transition-all ${
              activeISO === iso
                ? 'bg-white border-[#1D9E75] text-[#1D9E75] font-medium'
                : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200'
            }`}
          >
            {iso === 'ISONE' ? 'ISO-NE' : iso}
          </button>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {days !== null && (
          <span className={`text-[11px] ${ageColor}`}>
            Updated {days === 0 ? 'today' : `${days}d ago`}
          </span>
        )}
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-gray-600"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.341-3.369-1.341-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.268 2.75 1.026A9.578 9.578 0 0112 6.836a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.026 2.747-1.026.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
          </svg>
        </a>
      </div>
    </div>
  )
}
