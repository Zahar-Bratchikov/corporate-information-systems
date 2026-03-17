import { useState, useEffect } from 'react'
import { api } from '../api'
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
      api<Project[]>('/api/projects'),
      api<User[]>('/api/dictionaries/users')
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
      const res = await api<Project>('/api/projects', { method: 'POST', body: JSON.stringify(body) })
      if (res.error) setSaveError(res.error)
      else { closeModal(); load() }
    } else if (editingId) {
      const res = await api(`/api/projects/${editingId}`, { method: 'PUT', body: JSON.stringify(body) })
      if (res.error) setSaveError(res.error)
      else { closeModal(); load() }
    }
  }

  const handleDelete = async (id: number) => {
    if (!isAdmin || !confirm('Удалить проект?')) return
    await api(`/api/projects/${id}`, { method: 'DELETE' })
    load()
  }

  if (loading) return <div className="crud-loading">Загрузка…</div>
  if (error) return <div className="crud-error">{error}</div>

  return (
    <div className="crud">
      <div className="crud-head">
        <h1>Проекты</h1>
        {canEdit && <button type="button" onClick={openAdd}>Добавить проект</button>}
      </div>
      <table className="crud-table">
        <thead>
          <tr>
            <th>Наименование</th>
            <th>Код</th>
            <th>Дата релиза</th>
            <th>Ответственный</th>
            {canEdit && <th></th>}
          </tr>
        </thead>
        <tbody>
          {list.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.code}</td>
              <td>{p.releaseDate ?? '—'}</td>
              <td>{p.responsibleName ?? '—'}</td>
              {canEdit && (
                <td>
                  <button type="button" className="btn-sm" onClick={() => openEdit(p)}>Изменить</button>
                  {isAdmin && <button type="button" className="btn-sm danger" onClick={() => handleDelete(p.id)}>Удалить</button>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{modal === 'add' ? 'Новый проект' : 'Редактирование'}</h2>
            <form onSubmit={handleSubmit}>
              <label>Наименование <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></label>
              <label>Код <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required /></label>
              <label>Дата релиза <input type="date" value={form.releaseDate} onChange={e => setForm(f => ({ ...f, releaseDate: e.target.value }))} /></label>
              <label>Ответственный
                <select value={form.responsibleId} onChange={e => setForm(f => ({ ...f, responsibleId: e.target.value }))}>
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
