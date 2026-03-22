import { useState, useEffect } from 'react'
import { api } from '../api'
import { endpoints } from '../api/endpoints'
import { useAuth } from '../AuthContext'
import './Crud.css'

interface Project {
  id: number
  name: string
  code: string
  releaseDate: string | null
  responsibleId: number | null
  responsibleName: string | null
}

interface User { id: number; login: string; fullName: string; roleId: number; roleName: string }

export default function Projects() {
  const { canEdit, isAdmin } = useAuth()
  const [list, setList] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', code: '', releaseDate: '', responsibleId: '' })
  const [saveError, setSaveError] = useState('')

  const load = async () => {
    setLoading(true)
    const [r1, r2] = await Promise.all([
      api<Project[]>(endpoints.projects.list),
      api<User[]>(endpoints.referenceData.usersForSelect)
    ])
    if (r1.data) setList(r1.data)
    if (r2.data) setUsers(r2.data)
    setError(r1.error || r2.error || '')
    setLoading(false)
  }

  useEffect(() => { load() }, [canEdit])

  const openAdd = () => {
    setForm({ name: '', code: '', releaseDate: '', responsibleId: '' })
    setSaveError('')
    setModal('add')
  }
  const openEdit = (p: Project) => {
    setEditingId(p.id)
    setForm({
      name: p.name,
      code: p.code,
      releaseDate: p.releaseDate?.slice(0, 10) ?? '',
      responsibleId: p.responsibleId?.toString() ?? ''
    })
    setSaveError('')
    setModal('edit')
  }
  const closeModal = () => { setModal(null); setEditingId(null) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveError('')
    const body = {
      name: form.name.trim(),
      code: form.code.trim(),
      releaseDate: form.releaseDate || null,
      responsibleId: form.responsibleId ? parseInt(form.responsibleId, 10) : null
    }
    if (modal === 'add') {
      const res = await api<Project>(endpoints.projects.list, { method: 'POST', body: JSON.stringify(body) })
      if (res.error) setSaveError(res.error)
      else { closeModal(); load() }
    } else if (editingId) {
      const res = await api(endpoints.projects.byId(editingId), { method: 'PUT', body: JSON.stringify(body) })
      if (res.error) setSaveError(res.error)
      else { closeModal(); load() }
    }
  }

  const handleDelete = async (id: number) => {
    if (!isAdmin || !confirm('Удалить проект?')) return
    await api(endpoints.projects.byId(id), { method: 'DELETE' })
    load()
  }

  if (loading) {
    return (
      <div className="crud-loading upzit-loading" data-testid="upzit-projects-loading">
        Загрузка…
      </div>
    )
  }
  if (error) {
    return (
      <div className="crud-error upzit-error" data-testid="upzit-projects-error">
        {error}
      </div>
    )
  }

  return (
    <div className="crud upzit-page upzit-page--projects" data-testid="upzit-projects-page">
      <div className="crud-head upzit-page-head">
        <h1 className="upzit-page-title">Проекты</h1>
        {canEdit && (
          <button
            type="button"
            onClick={openAdd}
            className="upzit-btn upzit-btn--add-project"
            data-testid="upzit-project-add-button"
          >
            Добавить проект
          </button>
        )}
      </div>
      <table className="crud-table upzit-table upzit-projects-table" data-testid="upzit-projects-table">
        <thead>
          <tr>
            <th>Наименование</th>
            <th>Код</th>
            <th>Дата релиза</th>
            <th>Ответственный</th>
            {canEdit && <th aria-label="Действия" />}
          </tr>
        </thead>
        <tbody>
          {list.map(p => (
            <tr key={p.id} data-testid={`upzit-project-row-${p.id}`} className="upzit-project-row">
              <td data-testid={`upzit-project-cell-name-${p.id}`}>{p.name}</td>
              <td data-testid={`upzit-project-cell-code-${p.id}`}>{p.code}</td>
              <td>{p.releaseDate ?? '—'}</td>
              <td>{p.responsibleName ?? '—'}</td>
              {canEdit && (
                <td className="upzit-row-actions">
                  <button
                    type="button"
                    className="btn-sm upzit-btn upzit-btn--edit-project"
                    data-testid={`upzit-project-edit-${p.id}`}
                    onClick={() => openEdit(p)}
                  >
                    Изменить
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      className="btn-sm danger upzit-btn upzit-btn--delete-project"
                      data-testid={`upzit-project-delete-${p.id}`}
                      onClick={() => handleDelete(p.id)}
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
          data-testid="upzit-project-modal-overlay"
          onClick={closeModal}
        >
          <div
            className="modal upzit-modal upzit-project-modal"
            data-testid="upzit-project-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upzit-project-modal-title"
            onClick={e => e.stopPropagation()}
          >
            <h2 id="upzit-project-modal-title">{modal === 'add' ? 'Новый проект' : 'Редактирование'}</h2>
            <form data-testid="upzit-project-form" onSubmit={handleSubmit}>
              <label className="upzit-field">
                Наименование
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  data-testid="upzit-project-input-name"
                />
              </label>
              <label className="upzit-field">
                Код
                <input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  required
                  data-testid="upzit-project-input-code"
                />
              </label>
              <label className="upzit-field">
                Дата релиза
                <input
                  type="date"
                  value={form.releaseDate}
                  onChange={e => setForm(f => ({ ...f, releaseDate: e.target.value }))}
                  data-testid="upzit-project-input-release-date"
                />
              </label>
              <label className="upzit-field">
                Ответственный
                <select
                  value={form.responsibleId}
                  onChange={e => setForm(f => ({ ...f, responsibleId: e.target.value }))}
                  data-testid="upzit-project-select-responsible"
                >
                  <option value="">—</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                </select>
              </label>
              {saveError && (
                <div className="form-error upzit-form-error" data-testid="upzit-project-form-error">
                  {saveError}
                </div>
              )}
              <div className="modal-actions upzit-modal-actions">
                <button type="button" data-testid="upzit-project-cancel" onClick={closeModal}>
                  Отмена
                </button>
                <button type="submit" data-testid="upzit-project-save">
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
