import { useState, useEffect, useRef } from 'react'
import { Send, Search } from 'lucide-react'
import { useConversationStore } from './conversationStore'
import { Button } from '@shared/ui/Button'
import { Input } from '@shared/ui/Input'
import { Badge, Spinner, EmptyState } from '@shared/ui'
import { cn, formatPhone, formatMessageTime } from '@shared/utils'
import type { Conversation } from '@shared/types'

interface ConversationCenterProps { tenantId: string; readOnly?: boolean }

export function ConversationCenter({ tenantId, readOnly }: ConversationCenterProps) {
  const { conversations, activeConversationId, messages, loading, sendingMessage,
    fetchConversations, setActiveConversation, sendMessage, subscribeRealtime } = useConversationStore()
  const [search, setSearch] = useState('')
  const [reply, setReply] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchConversations(tenantId); return subscribeRealtime(tenantId) }, [tenantId])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, activeConversationId])

  const filtered = conversations.filter(c =>
    (c.contact_name ?? c.phone).toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search))

  const activeConv = conversations.find(c => c.id === activeConversationId)
  const activeMessages = activeConversationId ? (messages[activeConversationId] ?? []) : []

  const handleSend = async () => {
    if (!activeConversationId || !reply.trim()) return
    await sendMessage(activeConversationId, tenantId, reply.trim())
    setReply('')
  }

  return (
    <div className="flex bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm" style={{ height: 'calc(100vh - 180px)', minHeight: '500px' }}>
      <div className="w-72 flex-shrink-0 border-r border-slate-100 flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Inbox</h2>
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={14} />} />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? <div className="flex justify-center py-8"><Spinner /></div>
            : filtered.length === 0 ? <div className="p-4 text-center text-sm text-slate-400">No conversations</div>
            : filtered.map(conv => (
              <ConvItem key={conv.id} conv={conv} active={conv.id === activeConversationId} onClick={() => setActiveConversation(conv.id)} />
            ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        {activeConv ? (
          <>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-sm font-bold">
                {(activeConv.contact_name ?? activeConv.phone).slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{activeConv.contact_name ?? 'Unknown'}</p>
                <p className="text-xs text-slate-500">{formatPhone(activeConv.phone)}</p>
              </div>
              <div className="ml-auto">
                <Badge variant={activeConv.status === 'open' ? 'success' : 'default'}>{activeConv.status}</Badge>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {activeMessages.map(msg => (
                <div key={msg.id} className={cn('flex', msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[75%] rounded-2xl px-4 py-2.5',
                    msg.direction === 'outbound' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-slate-100 text-slate-900 rounded-bl-sm')}>
                    <p className="text-sm leading-relaxed">{msg.body}</p>
                    <p className={cn('text-xs mt-1', msg.direction === 'outbound' ? 'text-blue-200' : 'text-slate-400')}>
                      {formatMessageTime(msg.created_at)}
                      {msg.is_auto_reply && ' · Auto'}
                      {msg.direction === 'outbound' && <span className="ml-1">{msg.status === 'delivered' ? '✓✓' : msg.status === 'sent' ? '✓' : msg.status === 'failed' ? '✗' : '…'}</span>}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            {!readOnly && (
              <div className="p-4 border-t border-slate-100">
                <div className="flex gap-2">
                  <input className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Type a message..." value={reply} onChange={e => setReply(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }} />
                  <Button onClick={handleSend} loading={sendingMessage} disabled={!reply.trim()}><Send size={16} /></Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState title="No conversation selected" description="Select a conversation from the list to view messages" />
          </div>
        )}
      </div>
    </div>
  )
}

function ConvItem({ conv, active, onClick }: { conv: Conversation; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn('w-full text-left px-4 py-3 transition-colors border-b border-slate-50', active ? 'bg-blue-50' : 'hover:bg-slate-50')}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {(conv.contact_name ?? conv.phone).slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={cn('text-sm font-medium truncate', active ? 'text-blue-700' : 'text-slate-900')}>
              {conv.contact_name ?? formatPhone(conv.phone)}
            </p>
            {conv.last_message_at && <span className="text-xs text-slate-400 flex-shrink-0">{formatMessageTime(conv.last_message_at)}</span>}
          </div>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{formatPhone(conv.phone)}</p>
        </div>
        {conv.unread_count > 0 && (
          <span className="ml-1 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0">{conv.unread_count}</span>
        )}
      </div>
    </button>
  )
}