import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import './Layout.css'

export default function Layout() {
  const { user, logout, isAdmin, isManager } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const showUsers = isAdmin || isManager

  return (
    <div className="layout upzit-app-shell" data-testid="upzit-app-shell">
      <aside className="layout-sidebar" aria-label="Боковая панель">
        <div className="layout-brand">
          <div className="layout-brand-mark" aria-hidden="true">
            У
          </div>
          <div className="layout-brand-text">
            <span className="layout-brand-title">УПЗ IT</span>
            <span className="layout-brand-sub">управление проектами</span>
          </div>
        </div>

        <nav className="layout-nav upzit-main-nav" data-testid="upzit-main-nav" aria-label="Основное меню">
          <NavLink
            end
            to="/projects"
            className={({ isActive }) => `upzit-nav-link ${isActive ? 'active' : ''}`}
            data-testid="upzit-nav-projects"
          >
            <span className="upzit-nav-icon" aria-hidden="true">◇</span>
            Проекты
          </NavLink>
          <NavLink
            to="/tasks"
            className={({ isActive }) => `upzit-nav-link ${isActive ? 'active' : ''}`}
            data-testid="upzit-nav-tasks"
          >
            <span className="upzit-nav-icon" aria-hidden="true">▢</span>
            Задачи
          </NavLink>
          {showUsers && (
            <NavLink
              to="/users"
              className={({ isActive }) => `upzit-nav-link ${isActive ? 'active' : ''}`}
              data-testid="upzit-nav-users"
            >
              <span className="upzit-nav-icon" aria-hidden="true">◎</span>
              Пользователи
            </NavLink>
          )}
          <NavLink
            to="/sprints"
            className={({ isActive }) => `upzit-nav-link ${isActive ? 'active' : ''}`}
            data-testid="upzit-nav-sprints"
          >
            <span className="upzit-nav-icon" aria-hidden="true">⬡</span>
            Спринты
          </NavLink>
          <NavLink
            to="/reports"
            className={({ isActive }) => `upzit-nav-link ${isActive ? 'active' : ''}`}
            data-testid="upzit-nav-reports"
          >
            <span className="upzit-nav-icon" aria-hidden="true">▦</span>
            Отчёты
          </NavLink>
        </nav>

        <div className="layout-sidebar-footer">
          <p className="layout-sidebar-hint">Роли и права применяются автоматически</p>
        </div>
      </aside>

      <div className="layout-workspace">
        <header className="layout-topbar upzit-header">
          <div className="layout-topbar-spacer" aria-hidden="true" />
          <div className="layout-user upzit-header-user">
            <div className="layout-user-avatar" aria-hidden="true">
              {(user?.fullName ?? '?').charAt(0).toUpperCase()}
            </div>
            <div className="layout-user-meta">
              <span className="upzit-current-user" data-testid="upzit-current-user">
                {user?.fullName}
              </span>
              <span className="layout-user-role">{user?.roleName}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="upzit-btn upzit-btn--logout"
              data-testid="upzit-logout-button"
            >
              Выход
            </button>
          </div>
        </header>

        <main className="layout-main upzit-main-content" data-testid="upzit-main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
