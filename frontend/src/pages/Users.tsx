import { useState, useEffect } from 'react'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import './Crud.css'

interface User {
  id: number
  login: string
  fullName: string
  roleId: number
  roleName: string | null
}

interface Role { id: number; name: string }

export default function Users() {
  const { user: currentUser, isAdmin } = useAuth()
  const [list, setList] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ login: '', password: '', fullName: '', roleId: '3', newPassword: '' })
  const [saveError, setSaveError] = useState('')

  const load = async () => {
    setLoading(true)
    const [rList, rRoles] = await Promise.all([
      api<User[]>('/api/users'),
      api<Role[]>('/api/dictionaries/roles')
    ])
    if (rList.data) setList(rList.data)
    if (rRoles.data) setRoles(rRoles.data)
    setError(rList.error || rRoles.error || '')
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setForm({ login: '', password: '', fullName: '', roleId: '3', newPassword: '' })
    setSaveError('')
    setModal('add')
  }
  const openEdit = (u: User) => {
    setEditingId(u.id)
    setForm({ login: u.login, password: '', fullName: u.fullName, roleId: u.roleId.toString(), newPassword: '' })
    setSaveError('')
    setModal('edit')
  }
  const closeModal = () => { setModal(null); setEditingId(null) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveError('')
    if (modal === 'add') {
      const res = await api<User>('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          login: form.login.trim(),
          password: form.password,
          fullName: form.fullName.trim(),
          roleId: parseInt(form.roleId, 10)
        })
      })
      if (res.error) setSaveError(res.error)
      else { closeModal(); load() }
    } else if (editingId) {
      const body: { fullName?: string; roleId?: number; newPassword?: string } = {
        fullName: form.fullName.trim(),
        roleId: parseInt(form.roleId, 10)
      }
      if (form.newPassword) body.newPassword = form.newPassword
      const res = await api(`/api/users/${editingId}`, { method: 'PUT', body: JSON.stringify(body) })
      if (res.error) setSaveError(res.error)
      else { closeModal(); load() }
    }
  }

  const handleDelete = async (id: number) => {
    if (id === currentUser?.userId) { setSaveError('Нельзя удалить самого себя'); return }
    if (!confirm('Удалить пользователя?')) return
    await api(`/api/users/${id}`, { method: 'DELETE' })
    load()
  }

  if (!isAdmin) return <div className="crud-error">Доступ запрещён</div>
  if (loading) return <div className="crud-loading">Загрузка…</div>
  if (error) return <div className="crud-error">{error}</div>

  return (
    <div className="crud">
      <div className="crud-head">
        <h1>Пользователи</h1>
        <button type="button" onClick={openAdd}>Добавить пользователя</button>
      </div>
      <table className="crud-table">
        <thead>
          <tr>
            <th>Логин</th>
            <th>ФИО</th>
            <th>Роль</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.map(u => (
            <tr key={u.id}>
              <td>{u.login}</td>
              <td>{u.fullName}</td>
              <td>{u.roleName}</td>
              <td>
                <button type="button" className="btn-sm" onClick={() => openEdit(u)}>Изменить</button>
                <button type="button" className="btn-sm danger" onClick={() => handleDelete(u.id)} disabled={u.id === currentUser?.userId}>Удалить</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{modal === 'add' ? 'Новый пользователь' : 'Редактирование'}</h2>
            <form onSubmit={handleSubmit}>
              <label>Логин <input value={form.login} onChange={e => setForm(f => ({ ...f, login: e.target.value }))} required disabled={modal === 'edit'} /></label>
              {modal === 'add' && <label>Пароль <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required /></label>}
              {modal === 'edit' && <label>Новый пароль (оставьте пустым, чтобы не менять) <input type="password" value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} /></label>}
              <label>ФИО <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} required /></label>
              <label>Роль
                <select value={form.roleId} onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))}>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
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
