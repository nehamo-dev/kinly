import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { EmailRow } from '../../components/ui/EmailRow'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { supabase } from '../../lib/supabase'
import { DEMO_EMAILS } from '../../lib/demo'
import type { DemoFlaggedEmail } from '../../types'

const COLLAPSED_COUNT = 3

interface FlaggedEmailsProps {
  emails?: DemoFlaggedEmail[]
  familyId?: string | null
  onTaskCreated?: () => void
}

export function FlaggedEmails({ emails = DEMO_EMAILS, familyId, onTaskCreated }: FlaggedEmailsProps) {
  const [expanded, setExpanded] = useState(false)
  const [taskTitle, setTaskTitle] = useState<string | null>(null) // null = closed
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const visible = expanded ? emails : emails.slice(0, COLLAPSED_COUNT)
  const hiddenCount = emails.length - COLLAPSED_COUNT

  function openTaskModal(email: DemoFlaggedEmail) {
    setTaskTitle(email.title)
    setDueDate('')
    setError(null)
  }

  async function saveTask() {
    if (!familyId || taskTitle === null) return
    setSaving(true)
    setError(null)
    try {
      const { error: err } = await supabase.from('tasks').insert({
        family_id: familyId,
        event_id: null,
        title: taskTitle,
        due_date: dueDate || null,
        tag: 'gmail',
        done: false,
        source: 'gmail',
      })
      if (err) throw err
      setTaskTitle(null)
      onTaskCreated?.()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error saving task')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Quick task modal */}
      <Modal
        open={taskTitle !== null}
        onClose={() => setTaskTitle(null)}
        title="Add as task"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setTaskTitle(null)}>Cancel</Button>
            <Button onClick={saveTask} loading={saving}>Save task</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Task</label>
            <input
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E8392A]"
              value={taskTitle ?? ''}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
          </div>
          <Input
            label="Due date (optional)"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </Modal>

      <section className="mb-8">
        <SectionHeader
          label="Flagged Emails"
          count={emails.length}
          action={{ label: 'Open inbox', onClick: () => navigate('/inbox') }}
        />
        <Card padding="none">
          <div className="px-4">
            {emails.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No flagged emails</p>
            ) : (
              <>
                {visible.map((email) => (
                  <EmailRow
                    key={email.id}
                    title={email.title}
                    domain={email.domain}
                    preview={email.preview}
                    timestamp={email.timestamp}
                    tag={email.tag}
                    memberName={email.memberName}
                    onCreateTask={familyId ? () => openTaskModal(email) : undefined}
                  />
                ))}
                {hiddenCount > 0 && !expanded && (
                  <button
                    className="w-full text-xs text-slate-400 hover:text-slate-600 py-3 text-center"
                    onClick={() => setExpanded(true)}
                  >
                    Show {hiddenCount} more ↓
                  </button>
                )}
              </>
            )}
          </div>
        </Card>
      </section>
    </>
  )
}
