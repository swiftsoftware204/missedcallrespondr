import { useState, useEffect } from 'react'
import { Phone, MessageSquare, TrendingUp, Users } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { supabase } from '../../../lib/supabase'
import { StatCard } from '@shared/ui/Card'
import { Card } from '@shared/ui/Card'
import { Spinner } from '@shared/ui'
import type { AnalyticsSnapshot } from '@shared/types'
import { format, subDays, parseISO } from 'date-fns'

interface DashboardStats {
  totalMissedCalls: number; autoSmsSent: number; responseRate: number
  leadsCreated: number; leadsConverted: number; snapshots: AnalyticsSnapshot[]
}

export function AnalyticsDashboard({ tenantId }: { tenantId: string }) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState(30)

  useEffect(() => { loadStats() }, [tenantId, range])

  const loadStats = async () => {
    setLoading(true)
    try {
      const from = format(subDays(new Date(), range), 'yyyy-MM-dd')
      const [snapshotsRes, leadsRes, missedRes] = await Promise.all([
        supabase.from('analytics_snapshots').select('*').eq('tenant_id', tenantId).gte('date', from).order('date'),
        supabase.from('leads').select('id, status').eq('tenant_id', tenantId),
        supabase.from('missed_calls').select('id, auto_sms_sent').eq('tenant_id', tenantId),
      ])
      const snapshots = (snapshotsRes.data ?? []) as AnalyticsSnapshot[]
      const leads = leadsRes.data ?? []
      const missed = missedRes.data ?? []
      const total = missed.length
      const sent = missed.filter(m => m.auto_sms_sent).length
      setStats({
        totalMissedCalls: total, autoSmsSent: sent,
        responseRate: total > 0 ? Math.round((sent / total) * 100) : 0,
        leadsCreated: leads.length,
        leadsConverted: leads.filter(l => l.status === 'closed_won').length,
        snapshots,
      })
    } finally { setLoading(false) }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner size={32} /></div>
  if (!stats) return null

  const chartData = stats.snapshots.map(s => ({
    date: format(parseISO(s.date), 'MMM d'),
    missed: s.missed_calls, sms: s.auto_sms_sent, responses: s.responses_received, leads: s.leads_created,
  }))

  const pieData = [
    { name: 'Closed Won', value: stats.leadsConverted, color: '#10b981' },
    { name: 'Active', value: Math.max(0, stats.leadsCreated - stats.leadsConverted), color: '#3b82f6' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Performance overview</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setRange(d)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${range === d ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Missed Calls" value={stats.totalMissedCalls} icon={<Phone size={20} />} iconColor="bg-red-100 text-red-500" />
        <StatCard label="Auto-SMS Sent" value={stats.autoSmsSent} icon={<MessageSquare size={20} />} iconColor="bg-blue-100 text-blue-600" />
        <StatCard label="Response Rate" value={`${stats.responseRate}%`} icon={<TrendingUp size={20} />} iconColor="bg-emerald-100 text-emerald-600"
          change={stats.responseRate >= 60 ? 'Good performance' : 'Needs improvement'} changeType={stats.responseRate >= 60 ? 'positive' : 'negative'} />
        <StatCard label="Leads Created" value={stats.leadsCreated} icon={<Users size={20} />} iconColor="bg-violet-100 text-violet-600" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Missed Calls vs. Auto-SMS</h3>
          {chartData.length === 0
            ? <div className="flex items-center justify-center h-48 text-sm text-slate-400">No data for this period</div>
            : <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="missed" stroke="#ef4444" strokeWidth={2} name="Missed Calls" dot={false} />
                  <Line type="monotone" dataKey="sms" stroke="#3b82f6" strokeWidth={2} name="Auto-SMS" dot={false} />
                  <Line type="monotone" dataKey="responses" stroke="#10b981" strokeWidth={2} name="Responses" dot={false} />
                </LineChart>
              </ResponsiveContainer>}
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Lead Outcomes</h3>
          {stats.leadsCreated === 0
            ? <div className="flex items-center justify-center h-48 text-sm text-slate-400">No leads yet</div>
            : <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={60} innerRadius={35}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2 mt-2">
                  {pieData.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} /><span className="text-slate-600">{d.name}</span></div>
                      <span className="font-semibold text-slate-900">{d.value}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Conversion Rate</span>
                    <span className="font-semibold text-emerald-600">{stats.leadsCreated > 0 ? Math.round((stats.leadsConverted / stats.leadsCreated) * 100) : 0}%</span>
                  </div>
                </div>
              </>}
        </Card>
      </div>
      {chartData.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Daily Leads Created</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="leads" fill="#6366f1" radius={[4, 4, 0, 0]} name="Leads" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  )
}