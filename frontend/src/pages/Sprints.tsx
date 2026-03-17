import { useState, useEffect } from 'react'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import './Crud.css'

interface Sprint {
  id: number
  name: string
  startDate: string
  endDate: string
  projectId: number
  projectName: string | null
}

export default function Sprints() {
  const { canEdit } = useAuth()
  const [list, setList] = useState<Sprint[]>([])
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', projectId: '' })
  const [saveError, setSaveError] = useState('')

  const load = async () => {
    setLoading(true)
    const url = filterProject ? `/api/sprints?projectId=${filterProject}` : '/api/sprints'
    const [rList, rProj] = await Promise.all([
      api<Sprint[]>(url),
      api<{ id: number; name: string }[]>('/api/projects')
    ])
    if (rList.data) setList(rList.data)
    if (rProj.data) setProjects(rProj.data)
    setError(rList.error || rProj.error || '')
    setLoading(false)
  }

  useEffect(() => { load() }, [filterProject])

  const openAdd = () => {
    setForm({
      name: '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      projectId: projects[0]?.id.toString() ?? ''
    })
    setSaveError('')
    setModal('add')
  }
  const openEdit = (s: Sprint) => {
    setEditingId(s.id)
    setForm({
      name: s.name,
      startDate: s.startDate.slice(0, 10),
      endDate: s.endDate.slice(0, 10),
      projectId: s.projectId.toString()
    })
    setSaveError('')
    setModal('edit')
  }
  const closeModal = () => { setModal(null); setEditingId(null) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveError('')
    if (new Date(form.endDate) < new Date(form.startDate)) {
      setSaveError('Дата окончания должна быть не раньше даты начала')
      return
    }
    const body = {
      name: form.name.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      projectId: parseInt(form.projectId, 10)
    }
    if (modal === 'add') {
      const res = await api<Sprint>('/api/sprints', { method: 'POST', body: JSON.stringify(body) })
      if (res.error) setSaveError(res.error)
      else { closeModal(); load() }
    } else if (editingId) {
      const res = await api(`/api/sprints/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: body.name, startDate: body.startDate, endDate: body.endDate })
      })
      if (res.error) setSaveError(res.error)
      else { closeModal(); load() }
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить спринт?')) return
    await api(`/api/sprints/${id}`, { method: 'DELETE' })
    load()
  }

  if (loading) return <div className="crud-loading">Загрузка…</div>
  if (error) return <div className="crud-error">{error}</div>

  return (
    <div className="crud">
      <div className="crud-head">
        <h1>Спринты</h1>
        {canEdit && <button type="button" onClick={openAdd}>Добавить спринт</button>}
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
            <th>Проект</th>
            <th>Начало</th>
            <th>Окончание</th>
            {canEdit && <th></th>}
          </tr>
        </thead>
        <tbody>
          {list.map(s => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{s.projectName}</td>
              <td>{s.startDate}</td>
              <td>{s.endDate}</td>
              {canEdit && (
                <td>
                  <button type="button" className="btn-sm" onClick={() => openEdit(s)}>Изменить</button>
                  <button type="button" className="btn-sm danger" onClick={() => handleDelete(s.id)}>Удалить</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{modal === 'add' ? 'Новый спринт' : 'Редактирование'}</h2>
            <form onSubmit={handleSubmit}>
              <label>Название <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></label>
              <label>Проект
                <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))} required disabled={modal === 'edit'}>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label>Дата начала <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required /></label>
              <label>Дата окончания <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required /></label>
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
