import { useState } from 'react'
import { Flame, Droplets, Snowflake, Phone, Mail, Building2, DollarSign, Tag } from 'lucide-react'
import { useKanbanStore } from './kanbanStore'
import { Button } from '@shared/ui/Button'
import { Input, Select, Textarea } from '@shared/ui/Input'
import { Badge } from '@shared/ui'
import { toast } from '@shared/ui'
import type { Lead, LeadTemperature } from '@shared/types'
import { formatPhone, formatRelativeTime, cn } from '@shared/utils'

interface LeadDetailProps { lead: Lead; onClose: () => void; readOnly?: boolean }

export function LeadDetail({ lead, onClose: _onClose, readOnly }: LeadDetailProps) {
  const { updateLead } = useKanbanStore()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: lead.name ?? '', email: lead.email ?? '', company: lead.company ?? '',
    value: lead.value?.toString() ?? '', temperature: lead.temperature,
    notes: lead.notes ?? '', tags: lead.tags.join(', '),
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const tempIcon = (t: LeadTemperature) => {
    if (t === 'hot') return <Flame size={14} className="text-red-500" />
    if (t === 'warm') return <Droplets size={14} className="text-amber-500" />
    return <Snowflake size={14} className="text-blue-400" />
  }
  const tempVariant = (t: LeadTemperature) => t === 'hot' ? 'danger' : t === 'warm' ? 'warning' : 'info'

  const handleSave = async () => {
    setLoading(true)
    try {
      await updateLead(lead.id, {
        name: form.name || null, email: form.email || null, company: form.company || null,
        value: form.value ? parseFloat(form.value) : null,
        temperature: form.temperature as LeadTemperature, notes: form.notes || null,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      })
      toast('success', 'Lead updated')
      setEditing(false)
    } catch { toast('error', 'Failed to update lead') }
    finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {(lead.name ?? lead.phone).slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900">{lead.name ?? 'Unknown'}</h3>
            <Badge variant={tempVariant(lead.temperature) as 'danger' | 'warning' | 'info'}>
              <span className="flex items-center gap-1">{tempIcon(lead.temperature)} {lead.temperature}</span>
            </Badge>
          </div>
          <p className="text-sm text-slate-500">{formatPhone(lead.phone)}</p>
        </div>
        {!readOnly && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)}>
            {editing ? 'Cancel' : 'Edit'}
          </Button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name" value={form.name} onChange={e => set('name', e.target.value)} />
            <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Company" value={form.company} onChange={e => set('company', e.target.value)} />
            <Input label="Est. Value ($)" type="number" value={form.value} onChange={e => set('value', e.target.value)} />
          </div>
          <Select label="Temperature" value={form.temperature} onChange={e => set('temperature', e.target.value)}
            options={[{ value: 'hot', label: 'Hot' }, { value: 'warm', label: 'Warm' }, { value: 'cold', label: 'Cold' }]} />
          <Textarea label="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} />
          <Input label="Tags (comma-separated)" value={form.tags} onChange={e => set('tags', e.target.value)} />
          <div className="flex justify-end">
            <Button onClick={handleSave} loading={loading}>Save Changes</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <InfoItem icon={<Phone size={14} />} label="Phone" value={formatPhone(lead.phone)} />
            {lead.email && <InfoItem icon={<Mail size={14} />} label="Email" value={lead.email} />}
            {lead.company && <InfoItem icon={<Building2 size={14} />} label="Company" value={lead.company} />}
            {lead.value != null && <InfoItem icon={<DollarSign size={14} />} label="Est. Value" value={`$${lead.value.toLocaleString()}`} />}
          </div>
          {lead.tags.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2 flex items-center gap-1"><Tag size={12} /> Tags</p>
              <div className="flex flex-wrap gap-1.5">{lead.tags.map(tag => <Badge key={tag}>{tag}</Badge>)}</div>
            </div>
          )}
          {lead.notes && (
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Notes</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}
          <p className="text-xs text-slate-400">
            Created {formatRelativeTime(lead.created_at)}
            {lead.last_contacted_at && ` · Last contact ${formatRelativeTime(lead.last_contacted_at)}`}
          </p>
        </div>
      )}
    </div>
  )
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400 flex items-center gap-1 mb-0.5">{icon} {label}</p>
      <p className="text-sm text-slate-800 font-medium">{value}</p>
    </div>
  )
}