import { create } from 'zustand'
import { supabase } from '../../../lib/supabase'
import type { Tenant } from '@shared/types'

interface TenantState {
  tenants: Tenant[]; activeTenantId: string | null; loading: boolean
  fetchTenants: () => Promise<void>
  setActiveTenant: (id: string) => void
  getActiveTenant: () => Tenant | null
  createTenant: (data: Partial<Tenant>) => Promise<Tenant>
  updateTenant: (id: string, data: Partial<Tenant>) => Promise<void>
}

export const useTenantStore = create<TenantState>((set, get) => ({
  tenants: [], activeTenantId: null, loading: false,

  fetchTenants: async () => {
    set({ loading: true })
    try {
      const { data, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: false })
      if (error) throw error
      set({ tenants: (data ?? []) as Tenant[] })
    } finally { set({ loading: false }) }
  },

  setActiveTenant: (id) => set({ activeTenantId: id }),
  getActiveTenant: () => { const { tenants, activeTenantId } = get(); return tenants.find(t => t.id === activeTenantId) ?? null },

  createTenant: async (data) => {
    const { data: created, error } = await supabase.from('tenants').insert(data).select().single()
    if (error) throw error
    set(s => ({ tenants: [created as Tenant, ...s.tenants] }))
    return created as Tenant
  },

  updateTenant: async (id, data) => {
    const { error } = await supabase.from('tenants').update(data).eq('id', id)
    if (error) throw error
    set(s => ({ tenants: s.tenants.map(t => t.id === id ? { ...t, ...data } : t) }))
  },
}))