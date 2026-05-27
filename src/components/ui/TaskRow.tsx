import { Badge } from './Badge'
import type { TaskTag } from '../../types'

interface TaskRowProps {
  title: string
  tags?: (TaskTag | 'member')[]
  memberName?: string | null
  tag?: TaskTag | null
  subline?: string
  urgency?: string
  urgencyColor?: 'red' | 'green' | 'slate'
  done?: boolean
  onToggle?: () => void
}

// Circle border color matches the primary tag
const tagCircleColor: Record<string, string> = {
  home:     'border-amber-400',
  urgent:   'border-amber-400',
  occasion: 'border-purple-400',
  kid:      'border-sky-400',
  shopping: 'border-slate-300',
  other:    'border-slate-300',
}

const urgencyColors = {
  red:   'text-red-500',
  green: 'text-[#E8392A]',
  slate: 'text-slate-400',
}

export function TaskRow({
  title, tag, memberName, subline, urgency, urgencyColor = 'slate', done, onToggle
}: TaskRowProps) {
  const circleColor = tag ? (tagCircleColor[tag] || 'border-slate-300') : 'border-slate-300'

  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-slate-100 last:border-0">
      {/* Colored ring checkbox */}
      <button
        onClick={onToggle}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors
          ${done ? 'bg-[#E8392A] border-[#E8392A]' : `${circleColor} hover:border-[#E8392A]`}`}
        aria-label={done ? 'Mark as not done' : 'Mark as done'}
      >
        {done && (
          <svg className="w-full h-full p-0.5" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.5">
            <polyline points="3,8 6.5,12 13,4" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-sm font-medium ${done ? 'line-through text-slate-400' : 'text-slate-800'}`}>
            {title}
          </span>
          {memberName && (
            <Badge variant="kid">{memberName}</Badge>
          )}
          {tag && tag !== 'other' && (
            <Badge variant={
              tag === 'urgent' ? 'urgent'
              : tag === 'kid' ? 'kid'
              : tag === 'home' ? 'home'
              : tag === 'occasion' ? 'occasion'
              : tag === 'gmail' ? 'gmail'
              : 'default'
            }>
              {tag}
            </Badge>
          )}
        </div>
        {subline && (
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{subline}</p>
        )}
      </div>

      {/* Urgency label */}
      {urgency && (
        <span className={`text-xs font-semibold flex-shrink-0 mt-0.5 ${urgencyColors[urgencyColor]}`}>
          {urgency}
        </span>
      )}
    </div>
  )
}
