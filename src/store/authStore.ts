import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'

interface AuthState {
  session: Session | null
  user: User | null
  familyId: string | null
  isDemo: boolean
  setSession: (session: Session | null) => void
  setFamilyId: (id: string | null) => void
  setIsDemo: (demo: boolean) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  familyId: null,
  isDemo: false,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setFamilyId: (familyId) => set({ familyId }),
  setIsDemo: (isDemo) => set({ isDemo }),
  clear: () => set({ session: null, user: null, familyId: null, isDemo: false }),
}))
