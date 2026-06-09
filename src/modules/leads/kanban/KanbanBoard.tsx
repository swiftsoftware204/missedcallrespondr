import { useState, useEffect, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { Phone, Flame, Droplets, Snowflake } from 'lucide-react'
import { useKanbanStore } from './kanbanStore'
import { LeadDetail } from './LeadDetail'
import { Badge, Spinner } from '@shared/ui'
import { Modal } from '@shared/ui/Modal'
import { cn, formatPhone } from '@shared/utils'
import type { Lead, LeadTemperature } from '@shared/types'

interface KanbanBoardProps { tenantId: string; readOnly?: boolean }

export function KanbanBoard({ tenantId, readOnly }: KanbanBoardProps) {
  const { leads, columns, loading, fetchBoard, moveLead } = useKanbanStore()
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  useEffect(() => { fetchBoard(tenantId) }, [tenantId, fetchBoard])

  const onDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination || readOnly) return
    await moveLead(result.draggableId, result.destination.droppableId, result.destination.index)
  }, [moveLead, readOnly])

  if (loading) return <div className="flex justify-center py-16"><Spinner size={32} /></div>

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 220px)' }}>
          {columns.map(col => {
            const colLeads = leads.filter(l => l.kanban_column === col.slug).sort((a, b) => a.kanban_order - b.kanban_order)
            return (
              <div key={col.id} className="flex-shrink-0 w-72">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color }} />
                  <h3 className="text-sm font-semibold text-slate-700">{col.name}</h3>
                  <span className="ml-auto text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{colLeads.length}</span>
                </div>
                <Droppable droppableId={col.slug}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}
                      className={cn('flex flex-col gap-2 min-h-[200px] rounded-xl p-2 transition-colors',
                        snapshot.isDraggingOver ? 'bg-blue-50 ring-2 ring-blue-200' : 'bg-slate-50')}>
                      {colLeads.map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index} isDragDisabled={readOnly}>
                          {(provided, snapshot) => (
                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                              onClick={() => setSelectedLead(lead)}
                              className={cn('bg-white rounded-lg border border-slate-200 p-3 cursor-pointer transition-all hover:shadow-md hover:border-slate-300',
                                snapshot.isDragging && 'shadow-xl rotate-1 opacity-90')}>
                              <LeadCard lead={lead} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>
      <Modal open={!!selectedLead} onClose={() => setSelectedLead(null)} title="Lead Details" size="md">
        {selectedLead && <LeadDetail lead={selectedLead} onClose={() => setSelectedLead(null)} readOnly={readOnly} />}
      </Modal>
    </>
  )
}

function LeadCard({ lead }: { lead: Lead }) {
  const tempIcon = (t: LeadTemperature) => {
    if (t === 'hot') return <Flame size={12} className="text-red-500" />
    if (t === 'warm') return <Droplets size={12} className="text-amber-500" />
    return <Snowflake size={12} className="text-blue-400" />
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{lead.name ?? 'Unknown'}</p>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Phone size={11} /> {formatPhone(lead.phone)}</p>
        </div>
        {tempIcon(lead.temperature)}
      </div>
      {lead.company && <p className="text-xs text-slate-400 truncate">{lead.company}</p>}
      <div className="flex items-center justify-between mt-1">
        <Badge variant={lead.source === 'missed_call' ? 'info' : 'default'} size="sm">
          {lead.source === 'missed_call' ? 'Missed Call' : lead.source}
        </Badge>
        {lead.value != null && <span className="text-xs font-medium text-emerald-600">${lead.value.toLocaleString()}</span>}
      </div>
      {lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {lead.tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{tag}</span>
          ))}
          {lead.tags.length > 2 && <span className="text-xs text-slate-400">+{lead.tags.length - 2}</span>}
        </div>
      )}
    </div>
  )
}