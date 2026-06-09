import { useState } from 'react'
import { useTenantStore } from '@core/tenant/tenantStore'
import { useAuthStore } from '@core/auth/authStore'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { toast } from '@shared/ui'
import type { DayHours, BusinessHours } from '@shared/types'

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const

export function SettingsPage({ tenantId }: { tenantId: string }) {
  const { tenants, updateTenant } = useTenantStore()
  const { user } = useAuthStore()
  const tenant = tenants.find(t => t.id === tenantId)
  const isAgency = user?.role === 'agency_admin' || user?.role === 'agency_staff'
  const [hours, setHours] = useState<BusinessHours>(tenant?.business_hours ?? {} as BusinessHours)
  const [saving, setSaving] = useState(false)

  if (!tenant) return <p className="text-slate-500">No tenant selected.</p>

  const updateDay = (day: string, field: keyof DayHours, value: string | boolean) =>
    setHours(prev => ({ ...prev, [day]: { ...prev[day as keyof BusinessHours], [field]: value } }))

  const saveHours = async () => {
    setSaving(true)
    try { await updateTenant(tenantId, { business_hours: hours }); toast('success', 'Business hours saved') }
    catch { toast('error', 'Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">{tenant.business_name}</p>
      </div>
      <Card>
        <h2 className="text-base font-semibold text-slate-900 mb-4">Business Information</h2>
        <div className="grid grid-cols-2 gap-4">
          {[['Business Name', tenant.business_name], ['Mode', tenant.mode.replace('_', ' ')],
            ['Timezone', tenant.timezone], ['Telnyx Number', tenant.telnyx_phone_number ?? 'Not configured']].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className="text-sm font-medium capitalize">{value}</p>
            </div>
          ))}
        </div>
        {!isAgency && <p className="text-xs text-slate-400 mt-4">Contact your agency to update business information.</p>}
      </Card>
      <Card>
        <h2 className="text-base font-semibold text-slate-900 mb-4">Auto-Reply Settings</h2>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Auto-reply {tenant.auto_reply_enabled ? 'enabled' : 'disabled'}</p>
              <p className="text-xs text-slate-400">Automatically send SMS when a call is missed</p>
            </div>
            <div className={`w-10 h-6 rounded-full transition-colors ${tenant.auto_reply_enabled ? 'bg-blue-600' : 'bg-slate-300'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform mt-0.5 ${tenant.auto_reply_enabled ? 'ml-[18px]' : 'ml-0.5'}`} />
            </div>
          </div>
          <p className="text-sm text-slate-600">Reply delay: <span className="font-medium">{tenant.auto_reply_delay_seconds}s</span></p>
          <div>
            <p className="text-sm text-slate-600 mb-1">SMS quota: <span className="font-medium">{tenant.sms_used_this_month} / {tenant.monthly_sms_limit} this month</span></p>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (tenant.sms_used_this_month / tenant.monthly_sms_limit) * 100)}%` }} />
            </div>
          </div>
        </div>
      </Card>
      <Card>
        <h2 className="text-base font-semibold text-slate-900 mb-4">Business Hours</h2>
        <div className="flex flex-col gap-3">
          {DAYS.map(day => {
            const d = hours[day] as DayHours | undefined
            return (
              <div key={day} className="flex items-center gap-4">
                <div className="w-24">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={d?.enabled ?? false} onChange={e => updateDay(day, 'enabled', e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600" disabled={!isAgency} />
                    <span className="text-sm capitalize">{day.slice(0, 3)}</span>
                  </label>
                </div>
                {d?.enabled ? (
                  <div className="flex items-center gap-2">
                    <input type="time" value={d.open} onChange={e => updateDay(day, 'open', e.target.value)} disabled={!isAgency}
                      className="border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <span className="text-slate-400">–</span>
                    <input type="time" value={d.close} onChange={e => updateDay(day, 'close', e.target.value)} disabled={!isAgency}
                      className="border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ) : <span className="text-sm text-slate-400">Closed</span>}
              </div>
            )
          })}
        </div>
        {isAgency && <div className="flex justify-end mt-4"><Button onClick={saveHours} loading={saving}>Save Hours</Button></div>}
      </Card>
    </div>
  )
}