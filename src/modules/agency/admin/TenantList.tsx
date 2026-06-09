import { useState, useEffect } from 'react'
import { Plus, Search, Building2, Phone, MoreVertical } from 'lucide-react'
import { useTenantStore } from '@core/tenant/tenantStore'
import { Card } from '@shared/ui/Card'
import { Button } from '@shared/ui/Button'
import { Input } from '@shared/ui/Input'
import { Badge, Spinner, EmptyState, Dropdown, DropdownItem } from '@shared/ui'
import { Modal } from '@shared/ui/Modal'
import { TenantForm } from './TenantForm'
import type { Tenant } from '@shared/types'
import { formatDate, formatPhone } from '@shared/utils'

export function TenantList() {
  const { tenants, loading, fetchTenants, setActiveTenant, updateTenant } = useTenantStore()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editTenant, setEditTenant] = useState<Tenant | null>(null)

  useEffect(() => { fetchTenants() }, [fetchTenants])

  const filtered = tenants.filter(t =>
    t.business_name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase()))

  const modeBadge = (mode: Tenant['mode']) => (
    <Badge variant={mode === 'self_service' ? 'info' : 'default'}>{mode === 'self_service' ? 'Self-Service' : 'View Only'}</Badge>
  )
  const planBadge = (plan: Tenant['plan']) => {
    const v = { basic: 'default', pro: 'info', enterprise: 'purple' } as const
    return <Badge variant={v[plan]}>{plan}</Badge>
  }
  const statusBadge = (status: Tenant['status']) => {
    const v = { active: 'success', inactive: 'default', suspended: 'danger' } as const
    return <Badge variant={v[status]}>{status}</Badge>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500 mt-0.5">{tenants.length} total tenants</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus size={16} /> Add Client</Button>
      </div>
      <Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={16} />} />
      {loading ? <div className="flex justify-center py-16"><Spinner size={32} /></div>
        : filtered.length === 0 ? (
          <EmptyState title={search ? 'No clients match your search' : 'No clients yet'}
            description={search ? 'Try a different search term' : 'Add your first client to get started'}
            action={!search ? <Button onClick={() => setShowCreate(true)}><Plus size={16} /> Add Client</Button> : undefined} />
        ) : (
          <div className="grid gap-4">
            {filtered.map(tenant => (
              <Card key={tenant.id} className="hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {tenant.business_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900">{tenant.business_name}</h3>
                      {statusBadge(tenant.status)}{modeBadge(tenant.mode)}{planBadge(tenant.plan)}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><Building2 size={13} /> {tenant.email}</span>
                      {tenant.telnyx_phone_number && <span className="flex items-center gap-1"><Phone size={13} /> {formatPhone(tenant.telnyx_phone_number)}</span>}
                      <span>Joined {formatDate(tenant.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm text-slate-500">SMS this month</p>
                      <p className="text-sm font-semibold text-slate-900">{tenant.sms_used_this_month} / {tenant.monthly_sms_limit}</p>
                      <div className="mt-1 w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (tenant.sms_used_this_month / tenant.monthly_sms_limit) * 100)}%` }} />
                      </div>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => setActiveTenant(tenant.id)}>Manage</Button>
                    <Dropdown trigger={<button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"><MoreVertical size={16} /></button>}>
                      <DropdownItem onClick={() => setEditTenant(tenant)}>Edit</DropdownItem>
                      <DropdownItem onClick={() => updateTenant(tenant.id, { mode: tenant.mode === 'view_only' ? 'self_service' : 'view_only' })}>Toggle Mode</DropdownItem>
                      <DropdownItem onClick={() => updateTenant(tenant.id, { status: tenant.status === 'active' ? 'suspended' : 'active' })} danger={tenant.status === 'active'}>
                        {tenant.status === 'active' ? 'Suspend' : 'Activate'}
                      </DropdownItem>
                    </Dropdown>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add New Client" size="lg">
        <TenantForm onSuccess={() => setShowCreate(false)} />
      </Modal>
      <Modal open={!!editTenant} onClose={() => setEditTenant(null)} title="Edit Client" size="lg">
        {editTenant && <TenantForm tenant={editTenant} onSuccess={() => setEditTenant(null)} />}
      </Modal>
    </div>
  )
}