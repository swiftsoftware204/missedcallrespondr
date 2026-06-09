import { create } from 'zustand'
import { supabase } from '../../../lib/supabase'
import type { Lead, KanbanColumn } from '@shared/types'
import { eventBus, EVENTS } from '@shared/events/eventBus'

interface KanbanState {
  leads: Lead[]; columns: KanbanColumn[]; loading: boolean; tenantId: string | null
  fetchBoard: (tenantId: string) => Promise<void>
  moveLead: (leadId: string, toColumn: string, newOrder: number) => Promise<void>
  updateLead: (id: string, data: Partial<Lead>) => Promise<void>
  createLead: (data: Partial<Lead>) => Promise<Lead>
  deleteLead: (id: string) => Promise<void>
  addColumn: (tenantId: string, name: string, color: string) => Promise<void>
}

async function seedDefaultColumns(tenantId: string): Promise<KanbanColumn[]> {
  const defaults = [
    { name: 'New Lead', slug: 'new', color: '#3b82f6', order_index: 0, is_default: true },
    { name: 'Contacted', slug: 'contacted', color: '#8b5cf6', order_index: 1, is_default: true },
    { name: 'Qualified', slug: 'qualified', color: '#f59e0b', order_index: 2, is_default: true },
    { name: 'Proposal', slug: 'proposal', color: '#6366f1', order_index: 3, is_default: true },
    { name: 'Closed Won', slug: 'closed_won', color: '#10b981', order_index: 4, is_default: true },
    { name: 'Closed Lost', slug: 'closed_lost', color: '#ef4444', order_index: 5, is_default: true },
  ].map(c => ({ ...c, tenant_id: tenantId }))
  const { data } = await supabase.from('kanban_columns').insert(defaults).select()
  return (data ?? []) as KanbanColumn[]
}

export const useKanbanStore = create<KanbanState>((set, get) => ({
  leads: [], columns: [], loading: false, tenantId: null,

  fetchBoard: async (tenantId) => {
    set({ loading: true, tenantId })
    try {
      const [leadsRes, colsRes] = await Promise.all([
        supabase.from('leads').select('*').eq('tenant_id', tenantId).order('kanban_order'),
        supabase.from('kanban_columns').select('*').eq('tenant_id', tenantId).order('order_index'),
      ])
      if (leadsRes.error) throw leadsRes.error
      if (colsRes.error) throw colsRes.error
      let columns = (colsRes.data ?? []) as KanbanColumn[]
      if (columns.length === 0) columns = await seedDefaultColumns(tenantId)
      set({ leads: (leadsRes.data ?? []) as Lead[], columns })
    } finally { set({ loading: false }) }
  },

  moveLead: async (leadId, toColumn, newOrder) => {
    set(s => ({ leads: s.leads.map(l => l.id === leadId ? { ...l, kanban_column: toColumn, kanban_order: newOrder } : l) }))
    await supabase.from('leads').update({ kanban_column: toColumn, kanban_order: newOrder }).eq('id', leadId)
    eventBus.emit(EVENTS.LEAD_UPDATED, { leadId, column: toColumn })
  },

  updateLead: async (id, data) => {
    const { error } = await supabase.from('leads').update(data).eq('id', id)
    if (error) throw error
    set(s => ({ leads: s.leads.map(l => l.id === id ? { ...l, ...data } : l) }))
    eventBus.emit(EVENTS.LEAD_UPDATED, { leadId: id })
  },

  createLead: async (data) => {
    const { data: created, error } = await supabase.from('leads').insert(data).select().single()
    if (error) throw error
    set(s => ({ leads: [created as Lead, ...s.leads] }))
    eventBus.emit(EVENTS.LEAD_CREATED, { lead: created })
    return created as Lead
  },

  deleteLead: async (id) => {
    await supabase.from('leads').delete().eq('id', id)
    set(s => ({ leads: s.leads.filter(l => l.id !== id) }))
  },

  addColumn: async (tenantId, name, color) => {
    const { columns } = get()
    const slug = name.toLowerCase().replace(/\s+/g, '_')
    const { data, error } = await supabase.from('kanban_columns').insert({
      tenant_id: tenantId, name, slug, color, order_index: columns.length
    }).select().single()
    if (error) throw error
    set(s => ({ columns: [...s.columns, data as KanbanColumn] }))
  },
}))