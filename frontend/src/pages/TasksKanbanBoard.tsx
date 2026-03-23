import { useMemo, useState } from 'react'

interface Task {
  id: number
  title: string
  dueDate: string | null
  typeId: number
  typeName: string | null
  priorityId: number
  priorityName: string | null
  statusId: number
  statusName: string | null
  projectId: number
  projectName: string | null
  sprintId: number | null
  sprintName: string | null
  assigneeId: number | null
  assigneeName: string | null
}

interface Dict {
  id: number
  name: string
}

export default function TasksKanbanBoard(props: {
  tasks: Task[]
  statuses: Dict[]
  canEdit: boolean
  canDelete: boolean
  onOpenEdit: (task: Task) => void
  onDelete: (id: number) => void
  onChangeStatus: (task: Task, newStatusId: number) => Promise<void>
}) {
  const { tasks, statuses, canEdit, canDelete, onOpenEdit, onDelete, onChangeStatus } = props

  const orderedStatuses = useMemo(
    () => [...statuses].sort((a, b) => a.id - b.id),
    [statuses]
  )

  const [dragOverStatusId, setDragOverStatusId] = useState<number | null>(null)

  const tasksByStatus = useMemo(() => {
    const map = new Map<number, Task[]>()
    for (const s of orderedStatuses) map.set(s.id, [])
    for (const t of tasks) {
      const cur = map.get(t.statusId)
      if (cur) cur.push(t)
    }
    return map
  }, [tasks, orderedStatuses])

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    if (!canEdit) return
    setDragOverStatusId(task.statusId)
    e.dataTransfer.setData('text/plain', String(task.id))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = async (e: React.DragEvent, newStatusId: number) => {
    e.preventDefault()
    setDragOverStatusId(null)
    if (!canEdit) return

    const raw = e.dataTransfer.getData('text/plain')
    const taskId = Number(raw)
    if (!taskId) return

    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    if (task.statusId === newStatusId) return

    await onChangeStatus(task, newStatusId)
  }

  const openFromKeyDown = (e: React.KeyboardEvent, task: Task) => {
    if (!canEdit) return
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    onOpenEdit(task)
  }

  return (
    <div className="upzit-kanban-wrapper" data-testid="upzit-kanban">
      <div className="upzit-kanban-board" data-testid="upzit-kanban-board">
        {orderedStatuses.map(s => {
          const columnTasks = tasksByStatus.get(s.id) ?? []
          return (
            <section
              key={s.id}
              className={`upzit-kanban-column ${dragOverStatusId === s.id ? 'upzit-kanban-column--over' : ''}`}
              data-testid={`upzit-kanban-column-${s.id}`}
              onDragOver={e => {
                if (!canEdit) return
                e.preventDefault()
                setDragOverStatusId(s.id)
              }}
              onDragLeave={() => setDragOverStatusId(prev => (prev === s.id ? null : prev))}
              onDrop={e => void handleDrop(e, s.id)}
            >
              <header className="upzit-kanban-column-header">
                <div
                  className="upzit-kanban-column-title"
                  data-testid={`upzit-kanban-column-title-${s.id}`}
                >
                  {s.name}
                </div>
                <div
                  className="upzit-kanban-column-count"
                  data-testid={`upzit-kanban-column-count-${s.id}`}
                >
                  {columnTasks.length}
                </div>
              </header>

              <div
                className="upzit-kanban-column-body"
                data-testid={`upzit-kanban-column-body-${s.id}`}
              >
                {columnTasks.length === 0 && (
                  <div className="upzit-kanban-empty" data-testid={`upzit-kanban-empty-${s.id}`}>
                    Нет задач
                  </div>
                )}

                {columnTasks.map(t => {
                  const canMove = canEdit
                  const priorityDotClass = `upzit-priority--${t.priorityId}`

                  return (
                    <div
                      key={t.id}
                      className={`upzit-kanban-card ${priorityDotClass}`}
                      role="button"
                      tabIndex={canEdit ? 0 : -1}
                      aria-disabled={!canEdit}
                      data-testid={`upzit-kanban-card-${t.id}`}
                      draggable={canMove}
                      onClick={() => {
                        if (!canEdit) return
                        onOpenEdit(t)
                      }}
                      onKeyDown={e => openFromKeyDown(e, t)}
                      onDragStart={e => void handleDragStart(e, t)}
                    >
                      <div className="upzit-kanban-card-title" data-testid={`upzit-kanban-card-title-${t.id}`}>
                        {t.title}
                      </div>

                      <div className="upzit-kanban-card-meta">
                        <span className="upzit-kanban-pill" data-testid={`upzit-kanban-card-due-${t.id}`}>
                          {t.dueDate ?? '—'}
                        </span>
                        <span className="upzit-kanban-pill" data-testid={`upzit-kanban-card-assignee-${t.id}`}>
                          {t.assigneeName ?? '—'}
                        </span>
                      </div>

                      <div className="upzit-kanban-card-submeta">
                        <span
                          className="upzit-kanban-card-priority"
                          data-testid={`upzit-kanban-card-priority-${t.id}`}
                        >
                          <span className="upzit-priority-dot" aria-hidden="true" />
                          {t.priorityName ?? '—'}
                        </span>
                      </div>

                      <label className="upzit-kanban-card-status-label" data-testid={`upzit-kanban-card-status-label-${t.id}`}>
                        <span className="upzit-visually-hidden">Статус</span>
                        <select
                          className="upzit-kanban-card-status-select"
                          data-testid={`upzit-kanban-card-status-select-${t.id}`}
                          value={t.statusId}
                          disabled={!canEdit}
                          onChange={e => {
                            const next = parseInt(e.target.value, 10)
                            void onChangeStatus(t, next)
                          }}
                        >
                          {orderedStatuses.map(x => (
                            <option key={x.id} value={x.id}>
                              {x.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      {canDelete && (
                        <div className="upzit-kanban-card-actions">
                          <button
                            type="button"
                            className="upzit-kanban-card-action-delete"
                            data-testid={`upzit-kanban-card-delete-${t.id}`}
                            onClick={e => {
                              e.stopPropagation()
                              onDelete(t.id)
                            }}
                          >
                            Удалить
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

