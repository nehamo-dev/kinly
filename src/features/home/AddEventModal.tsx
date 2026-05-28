import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { supabase } from '../../lib/supabase'

interface AddEventModalProps {
  open: boolean
  onClose: () => void
  familyId: string | null
  onSaved: () => void
  /** Pre-fill the date field (yyyy-MM-dd). Defaults to today. */
  defaultDate?: string
  /** Pre-fill the title from natural-language parsing. */
  defaultTitle?: string
  /** Pre-fill the time field (HH:mm) from natural-language parsing. */
  defaultTime?: string
}

interface FormData {
  title: string
  date: string
  time_start: string
}

export function AddEventModal({ open, onClose, familyId, onSaved, defaultDate, defaultTitle, defaultTime }: AddEventModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: { date: defaultDate ?? format(new Date(), 'yyyy-MM-dd') }
  })

  // Re-populate the form on open. Use a ref to avoid dynamic dep-array size issues with RHF.
  const defaultsRef = useRef({ defaultTitle, defaultDate, defaultTime })
  defaultsRef.current = { defaultTitle, defaultDate, defaultTime }

  useEffect(() => {
    if (!open) return
    const { defaultTitle: t, defaultDate: d, defaultTime: time } = defaultsRef.current
    reset({
      title: t ?? '',
      date: d ?? format(new Date(), 'yyyy-MM-dd'),
      time_start: time ?? '',
    })
    setError(null)
  }, [open, reset])

  async function onSubmit(data: FormData) {
    if (!familyId) return
    setLoading(true)
    setError(null)
    try {
      const { error: err } = await supabase.from('events').insert({
        family_id: familyId,
        member_id: null,
        service_id: null,
        title: data.title,
        date: data.date,
        time_start: data.time_start || null,
        source: 'manual',
        calendar_event_id: null,
        gmail_message_id: null,
      })
      if (err) throw err
      reset()
      onSaved()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error saving event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add event"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button form="add-event-form" type="submit" loading={loading}>Save event</Button>
        </>
      }
    >
      <form id="add-event-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Event title"
          placeholder="School pickup, doctor's appointment..."
          error={errors.title?.message}
          {...register('title', { required: 'Title is required' })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date" type="date" {...register('date', { required: true })} />
          <Input label="Time (optional)" type="time" {...register('time_start')} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  )
}
