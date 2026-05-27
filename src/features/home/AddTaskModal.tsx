import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { supabase } from '../../lib/supabase'
import type { TaskTag } from '../../types'

interface AddTaskModalProps {
  open: boolean
  onClose: () => void
  familyId: string | null
  onSaved: () => void
}

interface FormData {
  title: string
  due_date: string
  tag: TaskTag | ''
}

const TAGS: TaskTag[] = ['kid', 'home', 'occasion', 'shopping', 'urgent', 'other']

export function AddTaskModal({ open, onClose, familyId, onSaved }: AddTaskModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: { due_date: format(new Date(), 'yyyy-MM-dd'), tag: '' }
  })

  async function onSubmit(data: FormData) {
    if (!familyId) return
    setLoading(true)
    setError(null)
    try {
      const { error: err } = await supabase.from('tasks').insert({
        family_id: familyId,
        event_id: null,
        title: data.title,
        due_date: data.due_date || null,
        tag: data.tag || null,
        done: false,
        source: 'manual',
      })
      if (err) throw err
      reset()
      onSaved()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error saving task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add task"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button form="add-task-form" type="submit" loading={loading}>Save task</Button>
        </>
      }
    >
      <form id="add-task-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Task"
          placeholder="Book dentist appointment..."
          error={errors.title?.message}
          {...register('title', { required: 'Task title is required' })}
        />
        <Input label="Due date (optional)" type="date" {...register('due_date')} />
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Tag (optional)</label>
          <select
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E8392A]"
            {...register('tag')}
          >
            <option value="">No tag</option>
            {TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  )
}
