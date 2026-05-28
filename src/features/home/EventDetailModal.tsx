import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import type { FamilyEvent } from '../../types'

interface EventDetailModalProps {
  event: FamilyEvent | null
  memberName?: string | null
  subline?: string | null
  isDaily?: boolean
  onClose: () => void
}

function formatTime(t: string | null | undefined): string | null {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

const sourceLabel: Record<string, string> = {
  manual: 'Added manually',
  calendar: 'From Google Calendar',
  gmail: 'Detected in Gmail',
}

export function EventDetailModal({ event, memberName, subline, isDaily, onClose }: EventDetailModalProps) {
  if (!event) return null
  const time = formatTime(event.time_start)

  return (
    <Modal open={!!event} onClose={onClose} size="sm">
      {/* Time + source */}
      <div className="flex items-center justify-between mb-4">
        {time ? (
          <span className="text-2xl font-semibold text-slate-900 tabular-nums">{time}</span>
        ) : (
          <span className="text-sm text-slate-400">No time set</span>
        )}
        <span className="text-xs text-slate-400">{sourceLabel[event.source] ?? event.source}</span>
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-slate-900 leading-snug mb-3">{event.title}</h3>

      {/* Badges */}
      {(memberName || isDaily) && (
        <div className="flex items-center gap-1.5 mb-3">
          {memberName && <Badge variant="kid">{memberName}</Badge>}
          {isDaily && <Badge variant="daily">daily</Badge>}
        </div>
      )}

      {/* Subline / notes */}
      {subline && (
        <p className="text-sm text-slate-500 leading-relaxed border-t border-slate-100 pt-3 mt-1">
          {subline}
        </p>
      )}

      {/* Date */}
      <p className="text-xs text-slate-400 mt-4">
        {new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric'
        })}
      </p>
    </Modal>
  )
}
