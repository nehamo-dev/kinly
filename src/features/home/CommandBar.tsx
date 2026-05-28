import { useRef, useState } from 'react'
import { parseCommand } from '../../lib/parseCommand'
import { AddEventModal } from './AddEventModal'
import { AddTaskModal } from './AddTaskModal'
import type { TaskTag } from '../../types'

interface CommandBarProps {
  familyId: string | null
  onRefresh: () => void
}

interface ParsedState {
  type: 'task' | 'event'
  title: string
  date: string | null
  time: string | null
  tag: string | null
}

export function CommandBar({ familyId, onRefresh }: CommandBarProps) {
  const [value, setValue] = useState('')
  const [eventOpen, setEventOpen] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)
  const [parsed, setParsed] = useState<ParsedState | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed) return
    const result = parseCommand(trimmed)
    setParsed(result)
    if (result.type === 'event') {
      setEventOpen(true)
    } else {
      setTaskOpen(true)
    }
    setValue('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSubmit()
  }

  function handleSaved() {
    setParsed(null)
    onRefresh()
  }

  function handleClose(which: 'event' | 'task') {
    if (which === 'event') setEventOpen(false)
    else setTaskOpen(false)
    // Keep parsed for a moment in case the user re-opens; clear on next open
  }

  return (
    <>
      <div className="mb-7">
        {/* Input row */}
        <div className="flex items-center gap-2 border border-slate-200 rounded-2xl bg-white px-4 py-3 shadow-sm focus-within:border-slate-300 transition-colors">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add an event, plan a task, set a reminder, or ask anything..."
            className="flex-1 text-sm text-slate-700 placeholder:text-slate-400 bg-transparent focus:outline-none"
          />
          <button
            className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Voice input"
            tabIndex={-1}
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={handleSubmit}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors flex-shrink-0"
            aria-label="Send"
          >
            <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Quick-action chips */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <QuickChip icon="✦" label="Plan my week" onClick={() => {
            setValue('Plan my week')
            inputRef.current?.focus()
          }} />
          <QuickChip icon="📅" label="Add event" onClick={() => {
            setParsed({ type: 'event', title: '', date: null, time: null, tag: null })
            setEventOpen(true)
          }} />
          <QuickChip icon="✓" label="Add task" onClick={() => {
            setParsed({ type: 'task', title: '', date: null, time: null, tag: null })
            setTaskOpen(true)
          }} />
        </div>

        {/* Footer hint */}
        <p className="text-xs text-slate-400 mt-3">
          Try: "Dentist for Lila on Friday at 3pm" or "Buy birthday cake tomorrow"
        </p>
      </div>

      <AddEventModal
        open={eventOpen}
        onClose={() => handleClose('event')}
        familyId={familyId}
        onSaved={handleSaved}
        defaultTitle={parsed?.type === 'event' ? (parsed.title || undefined) : undefined}
        defaultDate={parsed?.date ?? undefined}
        defaultTime={parsed?.time ?? undefined}
      />
      <AddTaskModal
        open={taskOpen}
        onClose={() => handleClose('task')}
        familyId={familyId}
        onSaved={handleSaved}
        defaultTitle={parsed?.type === 'task' ? (parsed.title || undefined) : undefined}
        defaultDate={parsed?.date ?? undefined}
        defaultTag={(parsed?.tag as TaskTag | '') || undefined}
      />
    </>
  )
}

function QuickChip({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 rounded-full px-3.5 py-1.5 bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors font-medium"
    >
      <span className="text-slate-500">{icon}</span>
      {label}
    </button>
  )
}
