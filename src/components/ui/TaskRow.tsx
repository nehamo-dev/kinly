import { useEffect, useRef, useState } from 'react'
import { Badge } from './Badge'
import type { TaskTag } from '../../types'

interface TaskRowProps {
  title: string
  memberName?: string | null
  tag?: TaskTag | null
  subline?: string
  urgency?: string
  urgencyColor?: 'red' | 'green' | 'slate'
  done?: boolean
  onToggle?: () => void
  onSnooze?: (when: 'tomorrow' | 'next-week') => void
  onEdit?: () => void
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

function ClockIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-4 h-4">
      <circle cx="8" cy="8" r="6.5" />
      <polyline points="8,4.5 8,8 10.5,10" />
    </svg>
  )
}

export function TaskRow({
  title, tag, memberName, subline, urgency, urgencyColor = 'slate', done, onToggle, onSnooze, onEdit
}: TaskRowProps) {
  const [snoozeOpen, setSnoozeOpen] = useState(false)
  const snoozeRef = useRef<HTMLDivElement>(null)
  const circleColor = tag ? (tagCircleColor[tag] || 'border-slate-300') : 'border-slate-300'

  // Close popover on outside click
  useEffect(() => {
    if (!snoozeOpen) return
    function handleOutside(e: MouseEvent) {
      if (snoozeRef.current && !snoozeRef.current.contains(e.target as Node)) {
        setSnoozeOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [snoozeOpen])

  function handleSnoozeOption(when: 'tomorrow' | 'next-week') {
    setSnoozeOpen(false)
    onSnooze?.(when)
  }

  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-slate-100 last:border-0">
      {/* Colored ring — mark done */}
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

      {/* Content — tappable to edit */}
      <div
        className={`flex-1 min-w-0 ${onEdit ? 'cursor-pointer' : ''}`}
        onClick={onEdit}
        role={onEdit ? 'button' : undefined}
        tabIndex={onEdit ? 0 : undefined}
        onKeyDown={onEdit ? (e) => { if (e.key === 'Enter' || e.key === ' ') onEdit() } : undefined}
      >
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

      {/* Right side: urgency + snooze */}
      <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
        {urgency && (
          <span className={`text-xs font-semibold ${urgencyColors[urgencyColor]}`}>
            {urgency}
          </span>
        )}

        {onSnooze && (
          <div ref={snoozeRef} className="relative">
            <button
              onClick={() => setSnoozeOpen((o) => !o)}
              className="text-slate-300 hover:text-slate-500 transition-colors"
              aria-label="Snooze task"
            >
              <ClockIcon />
            </button>

            {snoozeOpen && (
              <div className="absolute right-0 top-6 z-50 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[130px]">
                <button
                  onClick={() => handleSnoozeOption('tomorrow')}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <span className="text-slate-400">→</span> Tomorrow
                </button>
                <button
                  onClick={() => handleSnoozeOption('next-week')}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <span className="text-slate-400">→</span> Next week
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
