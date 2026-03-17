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
    <div className="layout">
      <header className="layout-header">
        <nav className="layout-nav">
          <NavLink to="/projects" className={({ isActive }) => isActive ? 'active' : ''}>Проекты</NavLink>
          <NavLink to="/tasks" className={({ isActive }) => isActive ? 'active' : ''}>Задачи</NavLink>
          {showUsers && <NavLink to="/users" className={({ isActive }) => isActive ? 'active' : ''}>Пользователи</NavLink>}
          <NavLink to="/sprints" className={({ isActive }) => isActive ? 'active' : ''}>Спринты</NavLink>
          <NavLink to="/reports" className={({ isActive }) => isActive ? 'active' : ''}>Отчёты</NavLink>
        </nav>
        <div className="layout-user">
          <span>{user?.fullName} ({user?.roleName})</span>
          <button type="button" onClick={handleLogout}>Выход</button>
        </div>
      </header>
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  )
}
