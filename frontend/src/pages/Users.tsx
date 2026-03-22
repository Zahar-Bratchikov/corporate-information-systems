import { useState, useEffect } from 'react'
import { api } from '../api'
import { endpoints } from '../api/endpoints'
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
      api<User[]>(endpoints.users.list),
      api<Role[]>(endpoints.referenceData.roles)
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
      const res = await api<User>(endpoints.users.create, {
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
      const res = await api(endpoints.users.byId(editingId), { method: 'PUT', body: JSON.stringify(body) })
      if (res.error) setSaveError(res.error)
      else { closeModal(); load() }
    }
  }

  const handleDelete = async (id: number) => {
    if (id === currentUser?.userId) { setSaveError('Нельзя удалить самого себя'); return }
    if (!confirm('Удалить пользователя?')) return
    await api(endpoints.users.byId(id), { method: 'DELETE' })
    load()
  }

  if (!isAdmin) {
    return (
      <div className="crud-error upzit-error" data-testid="upzit-users-forbidden">
        Доступ запрещён
      </div>
    )
  }
  if (loading) {
    return (
      <div className="crud-loading upzit-loading" data-testid="upzit-users-loading">
        Загрузка…
      </div>
    )
  }
  if (error) {
    return (
      <div className="crud-error upzit-error" data-testid="upzit-users-error">
        {error}
      </div>
    )
  }

  return (
    <div className="crud upzit-page upzit-page--users" data-testid="upzit-users-page">
      <div className="crud-head upzit-page-head">
        <h1 className="upzit-page-title">Пользователи</h1>
        <button
          type="button"
          onClick={openAdd}
          className="upzit-btn upzit-btn--add-user"
          data-testid="upzit-user-add-button"
        >
          Добавить пользователя
        </button>
      </div>
      <table className="crud-table upzit-table upzit-users-table" data-testid="upzit-users-table">
        <thead>
          <tr>
            <th>Логин</th>
            <th>ФИО</th>
            <th>Роль</th>
            <th aria-label="Действия" />
          </tr>
        </thead>
        <tbody>
          {list.map(u => (
            <tr key={u.id} data-testid={`upzit-user-row-${u.id}`} className="upzit-user-row">
              <td data-testid={`upzit-user-cell-login-${u.id}`}>{u.login}</td>
              <td>{u.fullName}</td>
              <td>{u.roleName}</td>
              <td className="upzit-row-actions">
                <button
                  type="button"
                  className="btn-sm upzit-btn upzit-btn--edit-user"
                  data-testid={`upzit-user-edit-${u.id}`}
                  onClick={() => openEdit(u)}
                >
                  Изменить
                </button>
                <button
                  type="button"
                  className="btn-sm danger upzit-btn upzit-btn--delete-user"
                  data-testid={`upzit-user-delete-${u.id}`}
                  onClick={() => handleDelete(u.id)}
                  disabled={u.id === currentUser?.userId}
                >
                  Удалить
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modal && (
        <div
          className="modal-overlay upzit-modal-overlay"
          data-testid="upzit-user-modal-overlay"
          onClick={closeModal}
        >
          <div
            className="modal upzit-modal upzit-user-modal"
            data-testid="upzit-user-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upzit-user-modal-title"
            onClick={e => e.stopPropagation()}
          >
            <h2 id="upzit-user-modal-title">{modal === 'add' ? 'Новый пользователь' : 'Редактирование'}</h2>
            <form data-testid="upzit-user-form" onSubmit={handleSubmit}>
              <label className="upzit-field">
                Логин
                <input
                  value={form.login}
                  onChange={e => setForm(f => ({ ...f, login: e.target.value }))}
                  required
                  disabled={modal === 'edit'}
                  data-testid="upzit-user-input-login"
                />
              </label>
              {modal === 'add' && (
                <label className="upzit-field">
                  Пароль
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required
                    data-testid="upzit-user-input-password"
                  />
                </label>
              )}
              {modal === 'edit' && (
                <label className="upzit-field">
                  Новый пароль (оставьте пустым, чтобы не менять)
                  <input
                    type="password"
                    value={form.newPassword}
                    onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                    data-testid="upzit-user-input-new-password"
                  />
                </label>
              )}
              <label className="upzit-field">
                ФИО
                <input
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  required
                  data-testid="upzit-user-input-fullname"
                />
              </label>
              <label className="upzit-field">
                Роль
                <select
                  value={form.roleId}
                  onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))}
                  data-testid="upzit-user-select-role"
                >
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </label>
              {saveError && (
                <div className="form-error upzit-form-error" data-testid="upzit-user-form-error">
                  {saveError}
                </div>
              )}
              <div className="modal-actions upzit-modal-actions">
                <button type="button" data-testid="upzit-user-cancel" onClick={closeModal}>
                  Отмена
                </button>
                <button type="submit" data-testid="upzit-user-save">
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
