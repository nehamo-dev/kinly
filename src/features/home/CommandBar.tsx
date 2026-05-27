import { useState } from 'react'
import { AddEventModal } from './AddEventModal'
import { AddTaskModal } from './AddTaskModal'

interface CommandBarProps {
  familyId: string | null
  onRefresh: () => void
}

export function CommandBar({ familyId, onRefresh }: CommandBarProps) {
  const [eventOpen, setEventOpen] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)

  return (
    <>
      <div className="mb-7">
        {/* Input row */}
        <div className="flex items-center gap-2 border border-slate-200 rounded-2xl bg-white px-4 py-3 shadow-sm">
          <input
            type="text"
            placeholder="Add an event, plan a task, set a reminder, or ask anything..."
            className="flex-1 text-sm text-slate-700 placeholder:text-slate-400 bg-transparent focus:outline-none"
            readOnly
          />
          <button className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors" aria-label="Voice input">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
            aria-label="Send"
          >
            <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Quick-action chips */}
        <div className="flex items-center gap-2 mt-3">
          <QuickChip icon="✦" label="Plan my week" onClick={() => {}} />
          <QuickChip icon="📅" label="Add event" onClick={() => setEventOpen(true)} />
          <QuickChip icon="✓" label="Add task" onClick={() => setTaskOpen(true)} />
        </div>

        {/* Footer hint */}
        <p className="text-xs text-slate-400 mt-3">
          Kinly pulls context from your calendar, inbox, and family profiles.
        </p>
      </div>

      <AddEventModal
        open={eventOpen}
        onClose={() => setEventOpen(false)}
        familyId={familyId}
        onSaved={onRefresh}
      />
      <AddTaskModal
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        familyId={familyId}
        onSaved={onRefresh}
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
