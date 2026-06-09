import { useState, type ReactNode } from 'react'
import { LayoutDashboard, Phone, MessageSquare, Kanban, FileText, Building2, Settings, LogOut, Menu, BarChart2 } from 'lucide-react'
import { useAuthStore } from '@core/auth/authStore'
import { useTenantStore } from '@core/tenant/tenantStore'
import { Badge } from '@shared/ui'
import { cn, getInitials } from '@shared/utils'

export type AppView = 'agency_dashboard' | 'analytics' | 'missed_calls' | 'conversations' | 'kanban' | 'templates' | 'settings'

interface AppShellProps { view: AppView; onViewChange: (v: AppView) => void; children: ReactNode }

export function AppShell({ view, onViewChange, children }: AppShellProps) {
  const { user, signOut } = useAuthStore()
  const { tenants, activeTenantId, getActiveTenant, setActiveTenant } = useTenantStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isAgency = user?.role === 'agency_admin' || user?.role === 'agency_staff'
  const activeTenant = getActiveTenant()

  const navItems = [
    ...(isAgency ? [{ id: 'agency_dashboard' as AppView, label: 'Agency', icon: <Building2 size={18} /> }] : []),
    { id: 'analytics' as AppView, label: 'Analytics', icon: <BarChart2 size={18} /> },
    { id: 'missed_calls' as AppView, label: 'Missed Calls', icon: <Phone size={18} /> },
    { id: 'conversations' as AppView, label: 'Inbox', icon: <MessageSquare size={18} /> },
    { id: 'kanban' as AppView, label: 'Pipeline', icon: <Kanban size={18} /> },
    { id: 'templates' as AppView, label: 'Templates', icon: <FileText size={18} /> },
    { id: 'settings' as AppView, label: 'Settings', icon: <Settings size={18} /> },
  ]

  const Nav = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center"><Phone size={16} className="text-white" /></div>
          <span className="text-base font-bold text-white">CallBack Pro</span>
        </div>
      </div>
      {isAgency && tenants.length > 0 && (
        <div className="px-3 py-3 border-b border-slate-800">
          <p className="text-xs text-slate-500 px-2 mb-1.5">Viewing tenant</p>
          <select value={activeTenantId ?? ''} onChange={e => setActiveTenant(e.target.value)}
            className="w-full bg-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">All Tenants</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.business_name}</option>)}
          </select>
        </div>
      )}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {navItems.map(item => (
          <button key={item.id} onClick={() => { onViewChange(item.id); setMobileOpen(false) }}
            className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-1 transition-all',
              view === item.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800')}>
            {item.icon}{item.label}
          </button>
        ))}
      </nav>
      <div className="px-3 py-3 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {getInitials(user?.full_name ?? user?.email ?? 'U')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.full_name ?? user?.email}</p>
            <p className="text-xs text-slate-400 truncate">{user?.role?.replace('_', ' ')}</p>
          </div>
          <button onClick={signOut} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <aside className="w-60 bg-slate-900 flex-shrink-0 hidden md:flex flex-col"><Nav /></aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-60 bg-slate-900 flex flex-col"><Nav /></aside>
        </div>
      )}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"><Menu size={20} /></button>
          <span className="font-semibold text-slate-900">CallBack Pro</span>
          {activeTenant && <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{activeTenant.business_name}</span>}
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            {!isAgency && activeTenant && (
              <div className="mb-4">
                <Badge variant={activeTenant.mode === 'self_service' ? 'success' : 'default'}>
                  {activeTenant.mode === 'self_service' ? 'Self-Service Mode' : 'View-Only Mode'}
                </Badge>
              </div>
            )}
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}