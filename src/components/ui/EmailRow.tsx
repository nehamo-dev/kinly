import { Badge } from './Badge'
import type { TaskTag } from '../../types'

interface EmailRowProps {
  title: string
  domain: string
  preview: string
  timestamp: string
  tag?: TaskTag | null
  memberName?: string | null
}

export function EmailRow({ title, domain, preview, timestamp, tag, memberName }: EmailRowProps) {
  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-slate-100 last:border-0">
      {/* Mail icon */}
      <div className="mt-0.5 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium text-slate-800">{title}</span>
            {memberName && <Badge variant="kid">{memberName}</Badge>}
            {tag && (
              <Badge variant={
                tag === 'urgent' ? 'urgent'
                : tag === 'home' ? 'home'
                : tag === 'gmail' ? 'gmail'
                : 'default'
              }>
                {tag}
              </Badge>
            )}
          </div>
          <span className="text-xs text-slate-400 flex-shrink-0 mt-0.5">{timestamp}</span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed truncate">
          <span className="text-slate-500">{domain}</span>
          {' — '}
          {preview}
        </p>
      </div>
    </div>
  )
}
