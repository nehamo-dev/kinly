import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { supabase } from '../../lib/supabase'
import type { Task, TaskTag } from '../../types'

interface EditTaskModalProps {
  task: Task | null
  onClose: () => void
  onSaved: () => void
}

interface FormData {
  title: string
  due_date: string
  tag: TaskTag | ''
}

const TAGS: TaskTag[] = ['kid', 'home', 'occasion', 'shopping', 'urgent', 'other']

export function EditTaskModal({ task, onClose, onSaved }: EditTaskModalProps) {
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>()

  // Populate form whenever a new task opens
  useEffect(() => {
    if (task) {
      reset({
        title: task.title,
        due_date: task.due_date ?? '',
        tag: task.tag ?? '',
      })
      setError(null)
    }
  }, [task, reset])

  async function onSubmit(data: FormData) {
    if (!task) return
    setLoading(true)
    setError(null)
    try {
      const { error: err } = await supabase
        .from('tasks')
        .update({
          title: data.title,
          due_date: data.due_date || null,
          tag: data.tag || null,
        })
        .eq('id', task.id)
      if (err) throw err
      onSaved()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error saving task')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!task) return
    setDeleting(true)
    try {
      await supabase.from('tasks').delete().eq('id', task.id)
      onSaved()
      onClose()
    } catch {
      setError('Error deleting task')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal
      open={!!task}
      onClose={onClose}
      title="Edit task"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" onClick={handleDelete} loading={deleting}
            className="text-red-500 hover:text-red-600 hover:bg-red-50">
            Delete
          </Button>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button form="edit-task-form" type="submit" loading={loading}>Save</Button>
          </div>
        </div>
      }
    >
      <form id="edit-task-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Task"
          placeholder="Task title..."
          error={errors.title?.message}
          {...register('title', { required: 'Title is required' })}
        />
        <Input label="Due date" type="date" {...register('due_date')} />
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Tag</label>
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
