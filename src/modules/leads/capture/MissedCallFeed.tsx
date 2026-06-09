import { useState, useEffect } from 'react'
import { Phone, Clock, CheckCircle, XCircle, Calendar } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { Card } from '@shared/ui/Card'
import { Badge, Spinner, EmptyState } from '@shared/ui'
import type { MissedCall } from '@shared/types'
import { formatPhone, formatRelativeTime } from '@shared/utils'

export function MissedCallFeed({ tenantId }: { tenantId: string }) {
  const [calls, setCalls] = useState<MissedCall[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCalls()
    const channel = supabase.channel(`missed_calls:${tenantId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'missed_calls', filter: `tenant_id=eq.${tenantId}` },
        (payload) => setCalls(p => [payload.new as MissedCall, ...p]))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [tenantId])

  const loadCalls = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('missed_calls').select('*')
        .eq('tenant_id', tenantId).order('called_at', { ascending: false }).limit(50)
      if (error) throw error
      setCalls((data ?? []) as MissedCall[])
    } finally { setLoading(false) }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner size={32} /></div>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Missed Calls</h1>
        <p className="text-sm text-slate-500 mt-0.5">Real-time missed call tracking</p>
      </div>
      {calls.length === 0
        ? <EmptyState title="No missed calls yet" description="Missed calls will appear here in real-time" />
        : (
          <div className="flex flex-col gap-3">
            {calls.map(call => (
              <Card key={call.id} className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${call.auto_sms_sent ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  <Phone size={18} className={call.auto_sms_sent ? 'text-emerald-600' : 'text-red-500'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900">{call.caller_name ?? formatPhone(call.caller_phone)}</p>
                    {call.caller_name && <p className="text-xs text-slate-500">{formatPhone(call.caller_phone)}</p>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs text-slate-400 flex items-center gap-1"><Clock size={11} /> {formatRelativeTime(call.called_at)}</span>
                    {call.auto_sms_sent_at && <span className="text-xs text-slate-400">SMS sent {formatRelativeTime(call.auto_sms_sent_at)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {call.auto_sms_sent
                    ? <Badge variant="success"><CheckCircle size={12} className="mr-1" /> SMS Sent</Badge>
                    : call.queued_for_next_day
                    ? <Badge variant="warning"><Calendar size={12} className="mr-1" /> Queued</Badge>
                    : <Badge variant="danger"><XCircle size={12} className="mr-1" /> No SMS</Badge>}
                </div>
              </Card>
            ))}
          </div>
        )}
    </div>
  )
}