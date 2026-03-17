import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import './Login.css'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [loginName, setLoginName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(loginName.trim(), password)
    setLoading(false)
    if (result.ok) navigate('/', { replace: true })
    else setError(result.error || 'Ошибка входа')
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>ИС УПЗ IT</h1>
        <p className="login-subtitle">Вход в систему</p>
        <form onSubmit={handleSubmit}>
          <label>
            Логин
            <input
              type="text"
              value={loginName}
              onChange={e => setLoginName(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label>
            Пароль
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" disabled={loading}>{loading ? 'Вход…' : 'Войти'}</button>
        </form>
        <p className="login-hint">Тестовые пользователи: admin, pm_sidorov, dev_kozlov, qa_novikova, viewer — пароль: password</p>
      </div>
    </div>
  )
}
