import type { ReactNode } from 'react'
import { useAuthStore } from '@core/auth/authStore'
import type { UserRole } from '@shared/types'

export function usePermissions() {
  const user = useAuthStore(s => s.user)
  const isAgency = user?.role === 'agency_admin' || user?.role === 'agency_staff'
  const isAgencyAdmin = user?.role === 'agency_admin'
  const isTenantAdmin = user?.role === 'tenant_admin'
  const can = (action: 'manage_tenants' | 'view_all_tenants' | 'edit_leads' | 'send_sms' | 'manage_templates' | 'view_analytics') => {
    switch (action) {
      case 'manage_tenants': return isAgencyAdmin
      case 'view_all_tenants': return isAgency
      case 'edit_leads': return true
      case 'send_sms': return isAgency || isTenantAdmin
      case 'manage_templates': return isAgency || isTenantAdmin
      case 'view_analytics': return true
    }
  }
  return { user, isAgency, isAgencyAdmin, isTenantAdmin, isSelfService: isAgency, can }
}

export function RequireRole({ roles, children, fallback }: { roles: UserRole[]; children: ReactNode; fallback?: ReactNode }) {
  const user = useAuthStore(s => s.user)
  if (!user || !roles.includes(user.role)) return <>{fallback ?? null}</>
  return <>{children}</>
}