export type UserRole = 'agency_admin' | 'agency_staff' | 'tenant_admin' | 'tenant_user'
export type TenantMode = 'view_only' | 'self_service'
export type TenantStatus = 'active' | 'inactive' | 'suspended'
export type TenantPlan = 'basic' | 'pro' | 'enterprise'

export interface DayHours { open: string; close: string; enabled: boolean }
export interface BusinessHours {
  monday: DayHours; tuesday: DayHours; wednesday: DayHours; thursday: DayHours
  friday: DayHours; saturday: DayHours; sunday: DayHours
}

export interface Tenant {
  id: string; name: string; business_name: string; email: string; phone: string | null
  timezone: string; plan: TenantPlan; mode: TenantMode; status: TenantStatus
  telnyx_phone_number: string | null; telnyx_messaging_profile_id: string | null
  business_hours: BusinessHours; auto_reply_enabled: boolean
  auto_reply_delay_seconds: number; monthly_sms_limit: number
  sms_used_this_month: number; created_at: string; updated_at: string
}

export interface User {
  id: string; email: string; full_name: string | null; role: UserRole
  tenant_id: string | null; avatar_url: string | null; is_active: boolean
  last_login: string | null; created_at: string; updated_at: string
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'closed_won' | 'closed_lost'
export type LeadTemperature = 'hot' | 'warm' | 'cold'
export type LeadSource = 'missed_call' | 'manual' | 'import' | 'web_form'

export interface Lead {
  id: string; tenant_id: string; name: string | null; phone: string
  email: string | null; company: string | null; source: LeadSource
  status: LeadStatus; temperature: LeadTemperature; value: number | null
  assigned_to: string | null; kanban_column: string; kanban_order: number
  last_contacted_at: string | null; opt_out: boolean; notes: string | null
  tags: string[]; created_at: string; updated_at: string
}

export interface KanbanColumn {
  id: string; tenant_id: string; name: string; slug: string; color: string
  order_index: number; is_default: boolean; created_at: string
}

export interface Conversation {
  id: string; tenant_id: string; lead_id: string | null; phone: string
  contact_name: string | null; status: 'open' | 'closed' | 'spam'
  assigned_to: string | null; last_message_at: string | null
  unread_count: number; created_at: string; updated_at: string
}

export type MessageDirection = 'inbound' | 'outbound'
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'received'

export interface Message {
  id: string; conversation_id: string; tenant_id: string; direction: MessageDirection
  body: string; status: MessageStatus; telnyx_message_id: string | null
  sent_by: string | null; is_auto_reply: boolean; template_id: string | null
  error_message: string | null; sent_at: string | null; delivered_at: string | null
  created_at: string
}

export interface MissedCall {
  id: string; tenant_id: string; lead_id: string | null; caller_phone: string
  caller_name: string | null; called_at: string; auto_sms_sent: boolean
  auto_sms_sent_at: string | null; queued_for_next_day: boolean
  telnyx_call_id: string | null; created_at: string
}

export type TemplateCategory = 'welcome' | 'follow_up' | 'appointment' | 'missed_call' | 'custom'

export interface SmsTemplate {
  id: string; tenant_id: string | null; name: string; body: string
  category: TemplateCategory; variables: string[]; is_agency_template: boolean
  is_active: boolean; ab_variant: string | null; usage_count: number
  created_by: string | null; created_at: string; updated_at: string
}

export type ActivityType = 'note' | 'sms_sent' | 'sms_received' | 'call_missed' | 'status_changed' | 'assigned' | 'created'

export interface LeadActivity {
  id: string; tenant_id: string; lead_id: string; type: ActivityType
  description: string; metadata: Record<string, unknown>
  created_by: string | null; created_at: string
}

export interface AnalyticsSnapshot {
  id: string; tenant_id: string; date: string; missed_calls: number
  auto_sms_sent: number; responses_received: number; leads_created: number
  leads_converted: number; response_rate: number; created_at: string
}
