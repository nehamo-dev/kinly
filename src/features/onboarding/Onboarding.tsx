import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { supabase } from '../../lib/supabase'
import { buildGoogleAuthUrl } from '../../lib/google'
import { useAuthStore } from '../../store/authStore'

// ─── Schemas ──────────────────────────────────────────────────────────────────
const step1Schema = z.object({ familyName: z.string().min(1, 'Family name is required') })
const step2Schema = z.object({ yourName: z.string().min(1, 'Your name is required') })
const kidSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  school: z.string().optional(),
  grade: z.string().optional(),
  dob: z.string().optional(),
})
const step3Schema = z.object({ kids: z.array(kidSchema) })
const step5Schema = z.object({
  serviceName: z.string().optional(),
  frequency: z.string().optional(),
  providerName: z.string().optional(),
})

type Step1 = z.infer<typeof step1Schema>
type Step2 = z.infer<typeof step2Schema>
type Step3 = z.infer<typeof step3Schema>
type Step5 = z.infer<typeof step5Schema>

const AVATAR_COLORS = ['#1D9E75', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899']
const totalSteps = 5

export function Onboarding() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Collected data
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [, setFamilyName] = useState('')

  const user = useAuthStore((s) => s.user)
  const setFamilyIdStore = useAuthStore((s) => s.setFamilyId)
  const navigate = useNavigate()

  // Step 1
  const step1 = useForm<Step1>({ resolver: zodResolver(step1Schema) })
  // Step 2
  const step2 = useForm<Step2>({ resolver: zodResolver(step2Schema) })
  // Step 3
  const step3 = useForm<Step3>({
    resolver: zodResolver(step3Schema),
    defaultValues: { kids: [{ name: '', school: '', grade: '', dob: '' }] }
  })
  const { fields, append, remove } = useFieldArray({ control: step3.control, name: 'kids' })
  // Step 5
  const step5 = useForm<Step5>({ resolver: zodResolver(step5Schema) })

  async function onStep1(data: Step1) {
    setLoading(true)
    setError(null)
    try {
      const { data: fam, error: famErr } = await supabase
        .from('families')
        .insert({ name: data.familyName, is_demo: false })
        .select()
        .single()
      if (famErr || !fam) throw famErr || new Error('Failed to create family')
      await supabase.from('user_families').insert({
        user_id: user!.id, family_id: fam.id, role: 'manager'
      })
      setFamilyId(fam.id)
      setFamilyName(data.familyName)
      setFamilyIdStore(fam.id)
      setStep(2)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error creating family')
    } finally {
      setLoading(false)
    }
  }

  async function onStep2(data: Step2) {
    if (!familyId) return
    setLoading(true)
    setError(null)
    try {
      await supabase.from('members').insert({
        family_id: familyId,
        name: data.yourName,
        role: 'parent',
        avatar_color: AVATAR_COLORS[0],
        date_of_birth: null, school: null, grade: null
      })
      setStep(3)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error saving profile')
    } finally {
      setLoading(false)
    }
  }

  async function onStep3(data: Step3) {
    if (!familyId) return
    const filledKids = data.kids.filter((k) => k.name.trim())
    if (filledKids.length > 0) {
      setLoading(true)
      try {
        await supabase.from('members').insert(
          filledKids.map((k, i) => ({
            family_id: familyId,
            name: k.name,
            role: 'child' as const,
            school: k.school || null,
            grade: k.grade || null,
            date_of_birth: k.dob || null,
            avatar_color: AVATAR_COLORS[(i + 2) % AVATAR_COLORS.length],
          }))
        )
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error saving kids')
        setLoading(false)
        return
      } finally {
        setLoading(false)
      }
    }
    setStep(4)
  }

  async function onStep5(data: Step5) {
    if (!familyId || !data.serviceName?.trim()) {
      navigate('/')
      return
    }
    setLoading(true)
    try {
      await supabase.from('home_services').insert({
        family_id: familyId,
        name: data.serviceName,
        frequency: (data.frequency as 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual' | 'custom') || 'monthly',
        provider_id: null,
        custom_days: null,
        last_done: null,
        next_due: null,
      })
    } finally {
      setLoading(false)
    }
    navigate('/')
  }

  const progress = Math.round((step / totalSteps) * 100)

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>Step {step} of {totalSteps}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1D9E75] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">

          {/* Step 1: Family name */}
          {step === 1 && (
            <form onSubmit={step1.handleSubmit(onStep1)} className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">What's your family name?</h2>
                <p className="text-sm text-slate-500 mt-1">This is how your household will be identified.</p>
              </div>
              <Input
                label="Family name"
                placeholder="The Johnsons"
                error={step1.formState.errors.familyName?.message}
                {...step1.register('familyName')}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" loading={loading} className="w-full">Continue</Button>
            </form>
          )}

          {/* Step 2: Your name */}
          {step === 2 && (
            <form onSubmit={step2.handleSubmit(onStep2)} className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">What's your name?</h2>
                <p className="text-sm text-slate-500 mt-1">How other family members will see you.</p>
              </div>
              <Input
                label="Your name"
                placeholder="Sarah"
                error={step2.formState.errors.yourName?.message}
                {...step2.register('yourName')}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" loading={loading} className="w-full">Continue</Button>
            </form>
          )}

          {/* Step 3: Kids */}
          {step === 3 && (
            <form onSubmit={step3.handleSubmit(onStep3)} className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Add your kids</h2>
                <p className="text-sm text-slate-500 mt-1">You can always add more later.</p>
              </div>

              <div className="flex flex-col gap-4">
                {fields.map((field, i) => (
                  <div key={field.id} className="border border-slate-100 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Child {i + 1}</span>
                      {i > 0 && (
                        <button
                          type="button"
                          onClick={() => remove(i)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <Input
                      label="Name"
                      placeholder="Lila"
                      {...step3.register(`kids.${i}.name`)}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="School" placeholder="Cedar Crest" {...step3.register(`kids.${i}.school`)} />
                      <Input label="Grade" placeholder="Grade 3" {...step3.register(`kids.${i}.grade`)} />
                    </div>
                    <Input label="Date of birth" type="date" {...step3.register(`kids.${i}.dob`)} />
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="text-sm text-[#1D9E75] hover:text-[#178a64] font-medium"
                onClick={() => append({ name: '', school: '', grade: '', dob: '' })}
              >
                + Add another child
              </button>

              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={() => setStep(4)}>Skip</Button>
                <Button type="submit" loading={loading} className="flex-1">Continue</Button>
              </div>
            </form>
          )}

          {/* Step 4: Connect Google Calendar */}
          {step === 4 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Connect Google Calendar</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Kinly will pull your family's events automatically.
                </p>
              </div>
              <div className="flex flex-col gap-3 py-2">
                {['See events across all family members', 'Auto-detect school pickups & activities', 'Stay in sync — no manual entry'].map((feat) => (
                  <div key={feat} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="text-[#1D9E75]">✓</span> {feat}
                  </div>
                ))}
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  const url = buildGoogleAuthUrl('onboarding')
                  window.location.href = url
                }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="white" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.5 14H12c-.28 0-.5-.22-.5-.5v-9c0-.28.22-.5.5-.5s.5.22.5.5V15h4c.28 0 .5.22.5.5s-.22.5-.5.5z" />
                </svg>
                Connect Google Calendar
              </Button>
              <button
                className="text-sm text-slate-400 hover:text-slate-600 text-center"
                onClick={() => setStep(5)}
              >
                I'll do this later →
              </button>
            </div>
          )}

          {/* Step 5: First home service */}
          {step === 5 && (
            <form onSubmit={step5.handleSubmit(onStep5)} className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Add a home service</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Cleaners, HVAC, lawn care — Kinly tracks when things are due.
                </p>
              </div>
              <Input
                label="Service name"
                placeholder="House cleaning"
                {...step5.register('serviceName')}
              />
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Frequency</label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                  {...step5.register('frequency')}
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Every 2 weeks</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
              <Input
                label="Provider (optional)"
                placeholder="Maria's Cleaning Co."
                {...step5.register('providerName')}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={() => navigate('/')}>Skip</Button>
                <Button type="submit" loading={loading} className="flex-1">Finish setup</Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
