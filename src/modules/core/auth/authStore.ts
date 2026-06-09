import { create } from 'zustand'
import { supabase } from '../../../lib/supabase'
import type { User } from '@shared/types'

interface AuthState {
  user: User | null; loading: boolean; initialized: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

async function loadProfile(id: string): Promise<User | null> {
  const { data } = await supabase.from('users').select('*').eq('id', id).maybeSingle()
  return data as User | null
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null, loading: false, initialized: false,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const profile = await loadProfile(session.user.id)
      if (profile) set({ user: profile })
    }
    set({ initialized: true })
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await loadProfile(session.user.id)
        if (profile) set({ user: profile })
      } else if (event === 'SIGNED_OUT') {
        set({ user: null })
      }
    })
  },

  signIn: async (email, password) => {
    set({ loading: true })
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } finally { set({ loading: false }) }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null })
  },
}))