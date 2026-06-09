import { useState } from 'react'
import { useTenantStore } from '@core/tenant/tenantStore'
import { Button } from '@shared/ui/Button'
import { Input, Select } from '@shared/ui/Input'
import { toast } from '@shared/ui'
import type { Tenant, TenantMode, TenantPlan } from '@shared/types'

const TIMEZONES = ['America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Phoenix','America/Anchorage','Pacific/Honolulu','Europe/London','Europe/Paris','Asia/Tokyo']

export function TenantForm({ tenant, onSuccess }: { tenant?: Tenant; onSuccess: () => void }) {
  const { createTenant, updateTenant } = useTenantStore()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    business_name: tenant?.business_name ?? '', name: tenant?.name ?? '',
    email: tenant?.email ?? '', phone: tenant?.phone ?? '',
    timezone: tenant?.timezone ?? 'America/New_York',
    plan: (tenant?.plan ?? 'basic') as TenantPlan,
    mode: (tenant?.mode ?? 'view_only') as TenantMode,
    telnyx_phone_number: tenant?.telnyx_phone_number ?? '',
    monthly_sms_limit: tenant?.monthly_sms_limit ?? 500,
    auto_reply_enabled: tenant?.auto_reply_enabled ?? true,
    auto_reply_delay_seconds: tenant?.auto_reply_delay_seconds ?? 30,
  })

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    try {
      if (tenant) { await updateTenant(tenant.id, form); toast('success', 'Client updated') }
      else { await createTenant(form); toast('success', 'Client created') }
      onSuccess()
    } catch (err) { toast('error', err instanceof Error ? err.message : 'Failed to save') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Business Name *" value={form.business_name} onChange={e => set('business_name', e.target.value)} placeholder="Acme Plumbing" required />
        <Input label="Contact Name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="John Smith" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Email *" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="owner@business.com" required />
        <Input label="Phone" type="tel" value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} placeholder="+1 (555) 000-0000" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Select label="Plan" value={form.plan} onChange={e => set('plan', e.target.value)}
          options={[{ value: 'basic', label: 'Basic' }, { value: 'pro', label: 'Pro' }, { value: 'enterprise', label: 'Enterprise' }]} />
        <Select label="Mode" value={form.mode} onChange={e => set('mode', e.target.value)}
          options={[{ value: 'view_only', label: 'View Only' }, { value: 'self_service', label: 'Self-Service' }]} />
        <Select label="Timezone" value={form.timezone} onChange={e => set('timezone', e.target.value)}
          options={TIMEZONES.map(tz => ({ value: tz, label: tz.replace('_', ' ') }))} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Telnyx Phone Number" value={form.telnyx_phone_number ?? ''} onChange={e => set('telnyx_phone_number', e.target.value)} placeholder="+15551234567" />
        <Input label="Monthly SMS Limit" type="number" value={form.monthly_sms_limit} onChange={e => set('monthly_sms_limit', parseInt(e.target.value))} min={100} />
      </div>
      <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.auto_reply_enabled} onChange={e => set('auto_reply_enabled', e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
          <span className="text-sm font-medium text-slate-700">Auto-reply enabled</span>
        </label>
        {form.auto_reply_enabled && (
          <div className="flex items-center gap-2 ml-4">
            <span className="text-sm text-slate-500">Delay:</span>
            <Input type="number" value={form.auto_reply_delay_seconds} onChange={e => set('auto_reply_delay_seconds', parseInt(e.target.value))} min={0} max={300} className="w-20" />
            <span className="text-sm text-slate-500">seconds</span>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading}>{tenant ? 'Save Changes' : 'Create Client'}</Button>
      </div>
    </form>
  )
}