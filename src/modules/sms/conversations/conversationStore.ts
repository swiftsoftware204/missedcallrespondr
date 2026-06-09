import { create } from 'zustand'
import { supabase } from '../../../lib/supabase'
import type { Conversation, Message } from '@shared/types'
import { eventBus, EVENTS } from '@shared/events/eventBus'

interface ConversationState {
  conversations: Conversation[]; activeConversationId: string | null
  messages: Record<string, Message[]>; loading: boolean; sendingMessage: boolean
  fetchConversations: (tenantId: string) => Promise<void>
  setActiveConversation: (id: string) => void
  fetchMessages: (conversationId: string) => Promise<void>
  sendMessage: (conversationId: string, tenantId: string, body: string) => Promise<void>
  subscribeRealtime: (tenantId: string) => () => void
  markRead: (conversationId: string) => Promise<void>
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [], activeConversationId: null, messages: {}, loading: false, sendingMessage: false,

  fetchConversations: async (tenantId) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase.from('conversations').select('*')
        .eq('tenant_id', tenantId).order('last_message_at', { ascending: false, nullsFirst: false })
      if (error) throw error
      set({ conversations: (data ?? []) as Conversation[] })
    } finally { set({ loading: false }) }
  },

  setActiveConversation: (id) => {
    set({ activeConversationId: id })
    get().fetchMessages(id)
    get().markRead(id)
  },

  fetchMessages: async (conversationId) => {
    const { data, error } = await supabase.from('messages').select('*')
      .eq('conversation_id', conversationId).order('created_at', { ascending: true })
    if (error) throw error
    set(s => ({ messages: { ...s.messages, [conversationId]: (data ?? []) as Message[] } }))
  },

  sendMessage: async (conversationId, tenantId, body) => {
    set({ sendingMessage: true })
    try {
      const { data, error } = await supabase.from('messages').insert({
        conversation_id: conversationId, tenant_id: tenantId,
        direction: 'outbound', body, status: 'pending',
      }).select().single()
      if (error) throw error
      set(s => ({ messages: { ...s.messages, [conversationId]: [...(s.messages[conversationId] ?? []), data as Message] } }))
      await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId)
      eventBus.emit(EVENTS.SMS_SENT, { conversationId, body })
    } finally { set({ sendingMessage: false }) }
  },

  markRead: async (conversationId) => {
    await supabase.from('conversations').update({ unread_count: 0 }).eq('id', conversationId)
    set(s => ({ conversations: s.conversations.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c) }))
  },

  subscribeRealtime: (tenantId) => {
    const channel = supabase.channel(`messages:${tenantId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `tenant_id=eq.${tenantId}` }, (payload) => {
        const msg = payload.new as Message
        set(s => ({
          messages: { ...s.messages, [msg.conversation_id]: [...(s.messages[msg.conversation_id] ?? []), msg] },
          conversations: s.conversations.map(c => c.id === msg.conversation_id
            ? { ...c, last_message_at: msg.created_at, unread_count: msg.direction === 'inbound' && c.id !== s.activeConversationId ? c.unread_count + 1 : c.unread_count }
            : c),
        }))
        if (msg.direction === 'inbound') eventBus.emit(EVENTS.SMS_RECEIVED, { message: msg })
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  },
}))