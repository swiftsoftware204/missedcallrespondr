import { useEffect, useState } from 'react'
import { useAuthStore } from '@core/auth/authStore'
import { useTenantStore } from '@core/tenant/tenantStore'
import { LoginPage } from '@core/auth/LoginPage'
import { AppShell, type AppView } from './components/AppShell'
import { TenantList } from '@agency/admin/TenantList'
import { KanbanBoard } from '@leads/kanban/KanbanBoard'
import { ConversationCenter } from '@sms/conversations/ConversationCenter'
import { AnalyticsDashboard } from '@analytics/dashboard/AnalyticsDashboard'
import { TemplateManager } from '@templates/sms/TemplateManager'
import { MissedCallFeed } from '@leads/capture/MissedCallFeed'
import { SettingsPage } from './components/SettingsPage'
import { ToastProvider, Spinner } from '@shared/ui'
import './styles.css'

export default function App() {
  const { user, initialized, initialize } = useAuthStore()
  const { fetchTenants, tenants, activeTenantId, setActiveTenant } = useTenantStore()
  const [view, setView] = useState<AppView>('analytics')

  useEffect(() => { initialize() }, [initialize])

  useEffect(() => {
    if (user) {
      fetchTenants().then(() => {
        if (user.tenant_id && !activeTenantId) setActiveTenant(user.tenant_id)
      })
    }
  }, [user])

  if (!initialized) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Spinner size={40} /></div>
  }

  if (!user) return <><LoginPage /><ToastProvider /></>

  const isAgency = user.role === 'agency_admin' || user.role === 'agency_staff'
  const effectiveTenantId = isAgency ? activeTenantId : user.tenant_id
  const activeTenant = tenants.find(t => t.id === effectiveTenantId)
  const isSelfService = isAgency || activeTenant?.mode === 'self_service'

  const renderView = () => {
    if (view === 'agency_dashboard' && isAgency) return <TenantList />
    if (!effectiveTenantId) return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-slate-500 text-sm">
          {isAgency ? 'Select a tenant from the dropdown to view their data.' : 'Your account is not linked to a tenant. Contact your administrator.'}
        </p>
      </div>
    )
    switch (view) {
      case 'analytics': return <AnalyticsDashboard tenantId={effectiveTenantId} />
      case 'missed_calls': return <MissedCallFeed tenantId={effectiveTenantId} />
      case 'conversations': return <ConversationCenter tenantId={effectiveTenantId} readOnly={!isSelfService} />
      case 'kanban': return <KanbanBoard tenantId={effectiveTenantId} readOnly={!isSelfService} />
      case 'templates': return <TemplateManager tenantId={effectiveTenantId} readOnly={!isSelfService} />
      case 'settings': return <SettingsPage tenantId={effectiveTenantId} />
      default: return <AnalyticsDashboard tenantId={effectiveTenantId} />
    }
  }

  return (
    <>
      <AppShell view={view} onViewChange={setView}>{renderView()}</AppShell>
      <ToastProvider />
    </>
  )
}
