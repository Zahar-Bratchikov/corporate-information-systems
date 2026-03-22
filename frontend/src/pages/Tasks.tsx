import { useState, useEffect } from 'react'
import { api } from '../api'
import { endpoints } from '../api/endpoints'
import { useAuth } from '../AuthContext'
import './Crud.css'

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

interface Dict { id: number; name: string }

export default function Tasks() {
  const { canEdit, user } = useAuth()
  const [list, setList] = useState<Task[]>([])
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([])
  const [users, setUsers] = useState<{ id: number; fullName: string }[]>([])
  const [sprints, setSprints] = useState<{ id: number; name: string; projectId: number }[]>([])
  const [types, setTypes] = useState<Dict[]>([])
  const [statuses, setStatuses] = useState<Dict[]>([])
  const [priorities, setPriorities] = useState<Dict[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    title: '', dueDate: '', typeId: 1, priorityId: 2, statusId: 1, projectId: '', sprintId: '', assigneeId: ''
  })
  const [saveError, setSaveError] = useState('')

  const load = async () => {
    setLoading(true)
    const projectId = filterProject ? parseInt(filterProject, 10) : undefined
    const [rList, rProj, rUsers, rSprints, rTypes, rStatuses, rPrio] = await Promise.all([
      api<Task[]>(endpoints.tasks.list(projectId != null && !Number.isNaN(projectId) ? { projectId } : undefined)),
      api<{ id: number; name: string }[]>(endpoints.projects.list),
      api<{ id: number; fullName: string }[]>(endpoints.referenceData.usersForSelect),
      api<{ id: number; name: string; projectId: number }[]>(endpoints.sprints.list()),
      api<Dict[]>(endpoints.referenceData.taskTypes),
      api<Dict[]>(endpoints.referenceData.taskStatuses),
      api<Dict[]>(endpoints.referenceData.priorities)
    ])
    if (rList.data) setList(rList.data)
    if (rProj.data) setProjects(rProj.data)
    if (rUsers.data) setUsers(rUsers.data)
    if (rSprints.data) setSprints(rSprints.data)
    if (rTypes.data) setTypes(rTypes.data)
    if (rStatuses.data) setStatuses(rStatuses.data)
    if (rPrio.data) setPriorities(rPrio.data)
    setError(rList.error || '')
    setLoading(false)
  }

  useEffect(() => { load() }, [canEdit, filterProject])

  const openAdd = () => {
    setForm({
      title: '', dueDate: '', typeId: 1, priorityId: 2, statusId: 1,
      projectId: projects[0]?.id.toString() ?? '', sprintId: '', assigneeId: ''
    })
    setSaveError('')
    setModal('add')
  }
  const openEdit = (t: Task) => {
    setEditingId(t.id)
    setForm({
      title: t.title,
      dueDate: t.dueDate?.slice(0, 10) ?? '',
      typeId: t.typeId,
      priorityId: t.priorityId,
      statusId: t.statusId,
      projectId: t.projectId.toString(),
      sprintId: t.sprintId?.toString() ?? '',
      assigneeId: t.assigneeId?.toString() ?? ''
    })
    setSaveError('')
    setModal('edit')
  }
  const closeModal = () => { setModal(null); setEditingId(null) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveError('')
    const body = {
      title: form.title.trim(),
      dueDate: form.dueDate || null,
      typeId: form.typeId,
      priorityId: form.priorityId,
      statusId: form.statusId,
      projectId: parseInt(form.projectId, 10),
      sprintId: form.sprintId ? parseInt(form.sprintId, 10) : null,
      assigneeId: form.assigneeId ? parseInt(form.assigneeId, 10) : null
    }
    if (modal === 'add') {
      const res = await api<Task>(endpoints.tasks.create, { method: 'POST', body: JSON.stringify(body) })
      if (res.error) setSaveError(res.error)
      else { closeModal(); load() }
    } else if (editingId) {
      const res = await api(endpoints.tasks.byId(editingId), { method: 'PUT', body: JSON.stringify(body) })
      if (res.error) setSaveError(res.error)
      else { closeModal(); load() }
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить задачу?')) return
    await api(endpoints.tasks.byId(id), { method: 'DELETE' })
    load()
  }

  const projectSprints = form.projectId ? sprints.filter(s => s.projectId === parseInt(form.projectId, 10)) : []

  if (loading) {
    return (
      <div className="crud-loading upzit-loading" data-testid="upzit-tasks-loading">
        Загрузка…
      </div>
    )
  }
  if (error) {
    return (
      <div className="crud-error upzit-error" data-testid="upzit-tasks-error">
        {error}
      </div>
    )
  }

  return (
    <div className="crud upzit-page upzit-page--tasks" data-testid="upzit-tasks-page">
      <div className="crud-head upzit-page-head">
        <h1 className="upzit-page-title">Задачи</h1>
        {canEdit && (
          <button
            type="button"
            onClick={openAdd}
            className="upzit-btn upzit-btn--add-task"
            data-testid="upzit-task-add-button"
          >
            Добавить задачу
          </button>
        )}
      </div>
      <div className="crud-filters upzit-filters" data-testid="upzit-tasks-filters">
        <label className="upzit-field">
          Проект
          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            data-testid="upzit-tasks-filter-project"
          >
            <option value="">Все</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      </div>
      <table className="crud-table upzit-table upzit-tasks-table" data-testid="upzit-tasks-table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Тип</th>
            <th>Приоритет</th>
            <th>Статус</th>
            <th>Проект</th>
            <th>Срок</th>
            <th>Исполнитель</th>
            {canEdit && <th aria-label="Действия" />}
          </tr>
        </thead>
        <tbody>
          {list.map(t => (
            <tr key={t.id} data-testid={`upzit-task-row-${t.id}`} className="upzit-task-row">
              <td data-testid={`upzit-task-cell-title-${t.id}`}>{t.title}</td>
              <td>{t.typeName}</td>
              <td>{t.priorityName}</td>
              <td>{t.statusName}</td>
              <td>{t.projectName}</td>
              <td>{t.dueDate ?? '—'}</td>
              <td>{t.assigneeName ?? '—'}</td>
              {canEdit && (
                <td className="upzit-row-actions">
                  <button
                    type="button"
                    className="btn-sm upzit-btn upzit-btn--edit-task"
                    data-testid={`upzit-task-edit-${t.id}`}
                    onClick={() => openEdit(t)}
                  >
                    Изменить
                  </button>
                  {(user?.roleName === 'Администратор' || user?.roleName === 'Руководитель проекта / Тимлид') && (
                    <button
                      type="button"
                      className="btn-sm danger upzit-btn upzit-btn--delete-task"
                      data-testid={`upzit-task-delete-${t.id}`}
                      onClick={() => handleDelete(t.id)}
                    >
                      Удалить
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {modal && (
        <div
          className="modal-overlay upzit-modal-overlay"
          data-testid="upzit-task-modal-overlay"
          onClick={closeModal}
        >
          <div
            className="modal modal-wide upzit-modal upzit-task-modal"
            data-testid="upzit-task-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upzit-task-modal-title"
            onClick={e => e.stopPropagation()}
          >
            <h2 id="upzit-task-modal-title">{modal === 'add' ? 'Новая задача' : 'Редактирование'}</h2>
            <form data-testid="upzit-task-form" onSubmit={handleSubmit}>
              <label className="upzit-field">
                Название
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                  data-testid="upzit-task-input-title"
                />
              </label>
              <label className="upzit-field">
                Тип
                <select
                  value={form.typeId}
                  onChange={e => setForm(f => ({ ...f, typeId: parseInt(e.target.value, 10) }))}
                  data-testid="upzit-task-select-type"
                >
                  {types.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </label>
              <label className="upzit-field">
                Приоритет
                <select
                  value={form.priorityId}
                  onChange={e => setForm(f => ({ ...f, priorityId: parseInt(e.target.value, 10) }))}
                  data-testid="upzit-task-select-priority"
                >
                  {priorities.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </label>
              <label className="upzit-field">
                Статус
                <select
                  value={form.statusId}
                  onChange={e => setForm(f => ({ ...f, statusId: parseInt(e.target.value, 10) }))}
                  data-testid="upzit-task-select-status"
                >
                  {statuses.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </label>
              <label className="upzit-field">
                Проект
                <select
                  value={form.projectId}
                  onChange={e => setForm(f => ({ ...f, projectId: e.target.value, sprintId: '' }))}
                  required
                  data-testid="upzit-task-select-project"
                >
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label className="upzit-field">
                Спринт
                <select
                  value={form.sprintId}
                  onChange={e => setForm(f => ({ ...f, sprintId: e.target.value }))}
                  data-testid="upzit-task-select-sprint"
                >
                  <option value="">—</option>
                  {projectSprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <label className="upzit-field">
                Срок
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  data-testid="upzit-task-input-due-date"
                />
              </label>
              <label className="upzit-field">
                Исполнитель
                <select
                  value={form.assigneeId}
                  onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))}
                  data-testid="upzit-task-select-assignee"
                >
                  <option value="">—</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                </select>
              </label>
              {saveError && (
                <div className="form-error upzit-form-error" data-testid="upzit-task-form-error">
                  {saveError}
                </div>
              )}
              <div className="modal-actions upzit-modal-actions">
                <button type="button" data-testid="upzit-task-cancel" onClick={closeModal}>
                  Отмена
                </button>
                <button type="submit" data-testid="upzit-task-save">
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
