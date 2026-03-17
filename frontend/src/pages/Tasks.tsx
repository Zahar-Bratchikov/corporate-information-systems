import { useState, useEffect } from 'react'
import { api } from '../api'
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
    const [rList, rProj, rUsers, rSprints, rTypes, rStatuses, rPrio] = await Promise.all([
      api<Task[]>(`/api/tasks${filterProject ? `?projectId=${filterProject}` : ''}`),
      api<{ id: number; name: string }[]>('/api/projects'),
      api<{ id: number; fullName: string }[]>('/api/dictionaries/users'),
      api<{ id: number; name: string; projectId: number }[]>('/api/sprints'),
      api<Dict[]>('/api/dictionaries/task-types'),
      api<Dict[]>('/api/dictionaries/task-statuses'),
      api<Dict[]>('/api/dictionaries/priorities')
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
      const res = await api<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(body) })
      if (res.error) setSaveError(res.error)
      else { closeModal(); load() }
    } else if (editingId) {
      const res = await api(`/api/tasks/${editingId}`, { method: 'PUT', body: JSON.stringify(body) })
      if (res.error) setSaveError(res.error)
      else { closeModal(); load() }
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить задачу?')) return
    await api(`/api/tasks/${id}`, { method: 'DELETE' })
    load()
  }

  const projectSprints = form.projectId ? sprints.filter(s => s.projectId === parseInt(form.projectId, 10)) : []

  if (loading) return <div className="crud-loading">Загрузка…</div>
  if (error) return <div className="crud-error">{error}</div>

  return (
    <div className="crud">
      <div className="crud-head">
        <h1>Задачи</h1>
        {canEdit && <button type="button" onClick={openAdd}>Добавить задачу</button>}
      </div>
      <div className="crud-filters">
        <label>Проект
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)}>
            <option value="">Все</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      </div>
      <table className="crud-table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Тип</th>
            <th>Приоритет</th>
            <th>Статус</th>
            <th>Проект</th>
            <th>Срок</th>
            <th>Исполнитель</th>
            {canEdit && <th></th>}
          </tr>
        </thead>
        <tbody>
          {list.map(t => (
            <tr key={t.id}>
              <td>{t.title}</td>
              <td>{t.typeName}</td>
              <td>{t.priorityName}</td>
              <td>{t.statusName}</td>
              <td>{t.projectName}</td>
              <td>{t.dueDate ?? '—'}</td>
              <td>{t.assigneeName ?? '—'}</td>
              {canEdit && (
                <td>
                  <button type="button" className="btn-sm" onClick={() => openEdit(t)}>Изменить</button>
                  {(user?.roleName === 'Администратор' || user?.roleName === 'Руководитель проекта / Тимлид') && (
                    <button type="button" className="btn-sm danger" onClick={() => handleDelete(t.id)}>Удалить</button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <h2>{modal === 'add' ? 'Новая задача' : 'Редактирование'}</h2>
            <form onSubmit={handleSubmit}>
              <label>Название <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></label>
              <label>Тип
                <select value={form.typeId} onChange={e => setForm(f => ({ ...f, typeId: parseInt(e.target.value, 10) }))}>
                  {types.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </label>
              <label>Приоритет
                <select value={form.priorityId} onChange={e => setForm(f => ({ ...f, priorityId: parseInt(e.target.value, 10) }))}>
                  {priorities.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </label>
              <label>Статус
                <select value={form.statusId} onChange={e => setForm(f => ({ ...f, statusId: parseInt(e.target.value, 10) }))}>
                  {statuses.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </label>
              <label>Проект
                <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value, sprintId: '' }))} required>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label>Спринт
                <select value={form.sprintId} onChange={e => setForm(f => ({ ...f, sprintId: e.target.value }))}>
                  <option value="">—</option>
                  {projectSprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <label>Срок <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></label>
              <label>Исполнитель
                <select value={form.assigneeId} onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))}>
                  <option value="">—</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                </select>
              </label>
              {saveError && <div className="form-error">{saveError}</div>}
              <div className="modal-actions">
                <button type="button" onClick={closeModal}>Отмена</button>
                <button type="submit">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
