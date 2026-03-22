import { useState, useEffect } from 'react'
import { api } from '../api'
import { endpoints } from '../api/endpoints'
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
    const pid = filterProject ? parseInt(filterProject, 10) : undefined
    const url = endpoints.sprints.list(pid != null && !Number.isNaN(pid) ? { projectId: pid } : undefined)
    const [rList, rProj] = await Promise.all([
      api<Sprint[]>(url),
      api<{ id: number; name: string }[]>(endpoints.projects.list)
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
      const res = await api<Sprint>(endpoints.sprints.create, { method: 'POST', body: JSON.stringify(body) })
      if (res.error) setSaveError(res.error)
      else { closeModal(); load() }
    } else if (editingId) {
      const res = await api(endpoints.sprints.byId(editingId), {
        method: 'PUT',
        body: JSON.stringify({ name: body.name, startDate: body.startDate, endDate: body.endDate })
      })
      if (res.error) setSaveError(res.error)
      else { closeModal(); load() }
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить спринт?')) return
    await api(endpoints.sprints.byId(id), { method: 'DELETE' })
    load()
  }

  if (loading) {
    return (
      <div className="crud-loading upzit-loading" data-testid="upzit-sprints-loading">
        Загрузка…
      </div>
    )
  }
  if (error) {
    return (
      <div className="crud-error upzit-error" data-testid="upzit-sprints-error">
        {error}
      </div>
    )
  }

  return (
    <div className="crud upzit-page upzit-page--sprints" data-testid="upzit-sprints-page">
      <div className="crud-head upzit-page-head">
        <h1 className="upzit-page-title">Спринты</h1>
        {canEdit && (
          <button
            type="button"
            onClick={openAdd}
            className="upzit-btn upzit-btn--add-sprint"
            data-testid="upzit-sprint-add-button"
          >
            Добавить спринт
          </button>
        )}
      </div>
      <div className="crud-filters upzit-filters" data-testid="upzit-sprints-filters">
        <label className="upzit-field">
          Проект
          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            data-testid="upzit-sprints-filter-project"
          >
            <option value="">Все</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      </div>
      <table className="crud-table upzit-table upzit-sprints-table" data-testid="upzit-sprints-table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Проект</th>
            <th>Начало</th>
            <th>Окончание</th>
            {canEdit && <th aria-label="Действия" />}
          </tr>
        </thead>
        <tbody>
          {list.map(s => (
            <tr key={s.id} data-testid={`upzit-sprint-row-${s.id}`} className="upzit-sprint-row">
              <td data-testid={`upzit-sprint-cell-name-${s.id}`}>{s.name}</td>
              <td>{s.projectName}</td>
              <td>{s.startDate}</td>
              <td>{s.endDate}</td>
              {canEdit && (
                <td className="upzit-row-actions">
                  <button
                    type="button"
                    className="btn-sm upzit-btn upzit-btn--edit-sprint"
                    data-testid={`upzit-sprint-edit-${s.id}`}
                    onClick={() => openEdit(s)}
                  >
                    Изменить
                  </button>
                  <button
                    type="button"
                    className="btn-sm danger upzit-btn upzit-btn--delete-sprint"
                    data-testid={`upzit-sprint-delete-${s.id}`}
                    onClick={() => handleDelete(s.id)}
                  >
                    Удалить
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {modal && (
        <div
          className="modal-overlay upzit-modal-overlay"
          data-testid="upzit-sprint-modal-overlay"
          onClick={closeModal}
        >
          <div
            className="modal upzit-modal upzit-sprint-modal"
            data-testid="upzit-sprint-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upzit-sprint-modal-title"
            onClick={e => e.stopPropagation()}
          >
            <h2 id="upzit-sprint-modal-title">{modal === 'add' ? 'Новый спринт' : 'Редактирование'}</h2>
            <form data-testid="upzit-sprint-form" onSubmit={handleSubmit}>
              <label className="upzit-field">
                Название
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  data-testid="upzit-sprint-input-name"
                />
              </label>
              <label className="upzit-field">
                Проект
                <select
                  value={form.projectId}
                  onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                  required
                  disabled={modal === 'edit'}
                  data-testid="upzit-sprint-select-project"
                >
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label className="upzit-field">
                Дата начала
                <input
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  required
                  data-testid="upzit-sprint-input-start"
                />
              </label>
              <label className="upzit-field">
                Дата окончания
                <input
                  type="date"
                  value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  required
                  data-testid="upzit-sprint-input-end"
                />
              </label>
              {saveError && (
                <div className="form-error upzit-form-error" data-testid="upzit-sprint-form-error">
                  {saveError}
                </div>
              )}
              <div className="modal-actions upzit-modal-actions">
                <button type="button" data-testid="upzit-sprint-cancel" onClick={closeModal}>
                  Отмена
                </button>
                <button type="submit" data-testid="upzit-sprint-save">
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
