type EventHandler<T = unknown> = (payload: T) => void

class EventBus {
  private listeners = new Map<string, Set<EventHandler>>()
  on<T>(event: string, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(handler as EventHandler)
    return () => this.off(event, handler)
  }
  off<T>(event: string, handler: EventHandler<T>): void {
    this.listeners.get(event)?.delete(handler as EventHandler)
  }
  emit<T>(event: string, payload: T): void {
    this.listeners.get(event)?.forEach(h => h(payload))
  }
}

export const eventBus = new EventBus()
export const EVENTS = {
  LEAD_CREATED: 'lead.created', LEAD_UPDATED: 'lead.updated',
  SMS_SENT: 'sms.sent', SMS_RECEIVED: 'sms.received',
  SMS_DELIVERED: 'sms.delivered', CALL_MISSED: 'call.missed',
  TENANT_SWITCHED: 'tenant.switched',
} as const
