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
      <header className="layout-header upzit-header">
        <nav className="layout-nav upzit-main-nav" data-testid="upzit-main-nav" aria-label="Основное меню">
          <NavLink
            to="/projects"
            className={({ isActive }) => `upzit-nav-link ${isActive ? 'active' : ''}`}
            data-testid="upzit-nav-projects"
          >
            Проекты
          </NavLink>
          <NavLink
            to="/tasks"
            className={({ isActive }) => `upzit-nav-link ${isActive ? 'active' : ''}`}
            data-testid="upzit-nav-tasks"
          >
            Задачи
          </NavLink>
          {showUsers && (
            <NavLink
              to="/users"
              className={({ isActive }) => `upzit-nav-link ${isActive ? 'active' : ''}`}
              data-testid="upzit-nav-users"
            >
              Пользователи
            </NavLink>
          )}
          <NavLink
            to="/sprints"
            className={({ isActive }) => `upzit-nav-link ${isActive ? 'active' : ''}`}
            data-testid="upzit-nav-sprints"
          >
            Спринты
          </NavLink>
          <NavLink
            to="/reports"
            className={({ isActive }) => `upzit-nav-link ${isActive ? 'active' : ''}`}
            data-testid="upzit-nav-reports"
          >
            Отчёты
          </NavLink>
        </nav>
        <div className="layout-user upzit-header-user">
          <span className="upzit-current-user" data-testid="upzit-current-user">
            {user?.fullName} ({user?.roleName})
          </span>
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
  )
}
