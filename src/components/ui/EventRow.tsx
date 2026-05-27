import { Badge } from './Badge'

interface EventRowProps {
  timeStart?: string | null
  title: string
  memberName?: string | null
  subline?: string | null
  recurring?: boolean
  daily?: boolean
}

function formatTime(t: string | null | undefined): { main: string; ampm: string } | null {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return { main: `${hour}:${String(m).padStart(2, '0')}`, ampm }
}

export function EventRow({ timeStart, title, memberName, subline, daily }: EventRowProps) {
  const time = formatTime(timeStart)
  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-slate-100 last:border-0">
      {/* Time column */}
      <div className="w-16 flex-shrink-0 pt-0.5">
        {time ? (
          <span className="text-sm font-semibold text-slate-700 tabular-nums">
            {time.main}
            <span className="text-xs font-normal text-slate-400 ml-0.5">{time.ampm}</span>
          </span>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-slate-800">{title}</span>
          {memberName && <Badge variant="kid">{memberName}</Badge>}
          {daily && <Badge variant="daily">daily</Badge>}
        </div>
        {subline && (
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{subline}</p>
        )}
      </div>
    </div>
  )
}
