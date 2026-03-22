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
    <div className="login-page upzit-page upzit-page--login" data-testid="upzit-login-page">
      <div className="login-card upzit-login-card">
        <h1 className="upzit-login-title">ИС УПЗ IT</h1>
        <p className="login-subtitle upzit-login-subtitle">Вход в систему</p>
        <form className="upzit-login-form" data-testid="upzit-login-form" onSubmit={handleSubmit}>
          <label className="upzit-field upzit-field--login">
            Логин
            <input
              type="text"
              value={loginName}
              onChange={e => setLoginName(e.target.value)}
              autoComplete="username"
              required
              className="upzit-input upzit-input--login"
              data-testid="upzit-login-username"
            />
          </label>
          <label className="upzit-field upzit-field--password">
            Пароль
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="upzit-input upzit-input--password"
              data-testid="upzit-login-password"
            />
          </label>
          {error && (
            <div className="login-error upzit-login-error" role="alert" data-testid="upzit-login-error">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="upzit-btn upzit-btn--primary upzit-login-submit"
            data-testid="upzit-login-submit"
          >
            {loading ? 'Вход…' : 'Войти'}
          </button>
        </form>
        <p className="login-hint upzit-login-hint" data-testid="upzit-login-hint">
          Тестовые пользователи: admin, pm_sidorov, dev_kozlov, qa_novikova, viewer — пароль: password
        </p>
      </div>
    </div>
  )
}
