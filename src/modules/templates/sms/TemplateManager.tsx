import { useState, useEffect } from 'react'
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { Button } from '@shared/ui/Button'
import { Input, Select, Textarea } from '@shared/ui/Input'
import { Badge, Spinner, EmptyState } from '@shared/ui'
import { Modal, ConfirmModal } from '@shared/ui/Modal'
import { Card } from '@shared/ui/Card'
import { toast } from '@shared/ui'
import { interpolateTemplate } from '@shared/utils'
import type { SmsTemplate, TemplateCategory } from '@shared/types'

const CATEGORY_MAP: Record<TemplateCategory, { label: string; variant: 'info' | 'success' | 'warning' | 'default' | 'purple' }> = {
  missed_call: { label: 'Missed Call', variant: 'info' },
  follow_up: { label: 'Follow-Up', variant: 'warning' },
  appointment: { label: 'Appointment', variant: 'success' },
  welcome: { label: 'Welcome', variant: 'purple' },
  custom: { label: 'Custom', variant: 'default' },
}

export function TemplateManager({ tenantId, readOnly }: { tenantId: string; readOnly?: boolean }) {
  const [templates, setTemplates] = useState<SmsTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTemplate, setEditTemplate] = useState<SmsTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<SmsTemplate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SmsTemplate | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { loadTemplates() }, [tenantId])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('sms_templates').select('*')
        .or(`is_agency_template.eq.true,tenant_id.eq.${tenantId}`).eq('is_active', true)
        .order('is_agency_template', { ascending: false })
      if (error) throw error
      setTemplates((data ?? []) as SmsTemplate[])
    } finally { setLoading(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await supabase.from('sms_templates').update({ is_active: false }).eq('id', deleteTarget.id)
      setTemplates(p => p.filter(t => t.id !== deleteTarget.id))
      toast('success', 'Template removed'); setDeleteTarget(null)
    } finally { setDeleting(false) }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SMS Templates</h1>
          <p className="text-sm text-slate-500 mt-0.5">{templates.length} templates available</p>
        </div>
        {!readOnly && <Button onClick={() => setShowForm(true)}><Plus size={16} /> New Template</Button>}
      </div>
      {loading ? <div className="flex justify-center py-16"><Spinner size={32} /></div>
        : templates.length === 0 ? <EmptyState title="No templates yet" description="Create your first SMS template" />
        : (
          <div className="grid gap-4">
            {templates.map(t => (
              <Card key={t.id}>
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="text-sm font-semibold text-slate-900">{t.name}</h3>
                      <Badge variant={CATEGORY_MAP[t.category].variant}>{CATEGORY_MAP[t.category].label}</Badge>
                      {t.is_agency_template && <Badge variant="success">Agency Template</Badge>}
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2">{t.body}</p>
                    {t.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {t.variables.map(v => <code key={v} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{`{{${v}}}`}</code>)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setPreviewTemplate(t)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Preview">
                      <Eye size={16} />
                    </button>
                    {!readOnly && !t.is_agency_template && (
                      <>
                        <button onClick={() => setEditTemplate(t)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><Pencil size={16} /></button>
                        <button onClick={() => setDeleteTarget(t)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      <Modal open={showForm || !!editTemplate} onClose={() => { setShowForm(false); setEditTemplate(null) }} title={editTemplate ? 'Edit Template' : 'New Template'} size="lg">
        <TemplateForm tenantId={tenantId} template={editTemplate ?? undefined} onSuccess={() => { setShowForm(false); setEditTemplate(null); loadTemplates() }} />
      </Modal>
      <Modal open={!!previewTemplate} onClose={() => setPreviewTemplate(null)} title="Template Preview">
        {previewTemplate && <TemplatePreview template={previewTemplate} />}
      </Modal>
      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting}
        title="Delete Template" message={`Are you sure you want to delete "${deleteTarget?.name}"?`} confirmLabel="Delete" />
    </div>
  )
}

function TemplateForm({ tenantId, template, onSuccess }: { tenantId: string; template?: SmsTemplate; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: template?.name ?? '', body: template?.body ?? '', category: template?.category ?? 'custom' as TemplateCategory })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const extractVars = (body: string) => [...body.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1])
  const VARS = ['business_name', 'contact_name', 'phone', 'day', 'time']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    try {
      const payload = { ...form, variables: extractVars(form.body), tenant_id: tenantId, is_agency_template: false }
      if (template) { await supabase.from('sms_templates').update(payload).eq('id', template.id); toast('success', 'Template updated') }
      else { await supabase.from('sms_templates').insert(payload); toast('success', 'Template created') }
      onSuccess()
    } catch { toast('error', 'Failed to save template') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Template Name *" value={form.name} onChange={e => set('name', e.target.value)} required />
      <Select label="Category" value={form.category} onChange={e => set('category', e.target.value)}
        options={Object.entries(CATEGORY_MAP).map(([v, m]) => ({ value: v, label: m.label }))} />
      <div>
        <Textarea label="Message Body *" value={form.body} onChange={e => set('body', e.target.value)} rows={4} required placeholder="Hi {{contact_name}}! We missed your call..." />
        <p className="text-xs text-slate-400 mt-1">Character count: {form.body.length}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <p className="text-xs text-slate-500 w-full">Available variables:</p>
        {VARS.map(v => (
          <button key={v} type="button" onClick={() => set('body', form.body + `{{${v}}}`)}
            className="text-xs bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 px-2 py-1 rounded transition-colors">{`{{${v}}}`}</button>
        ))}
      </div>
      <div className="flex justify-end"><Button type="submit" loading={loading}>{template ? 'Save' : 'Create'}</Button></div>
    </form>
  )
}

function TemplatePreview({ template }: { template: SmsTemplate }) {
  const sampleVars = { contact_name: 'John', business_name: 'Acme Plumbing', phone: '(555) 123-4567', day: 'Monday', time: '9:00 AM' }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-500">Preview with sample data:</p>
      <div className="bg-slate-900 rounded-2xl p-5 max-w-xs mx-auto">
        <div className="bg-blue-500 rounded-2xl rounded-br-sm px-4 py-3">
          <p className="text-white text-sm leading-relaxed">{interpolateTemplate(template.body, sampleVars)}</p>
        </div>
      </div>
      <div className="bg-slate-50 rounded-lg p-3">
        <p className="text-xs text-slate-500 mb-1">Raw template:</p>
        <p className="text-sm text-slate-700 font-mono">{template.body}</p>
      </div>
    </div>
  )
}