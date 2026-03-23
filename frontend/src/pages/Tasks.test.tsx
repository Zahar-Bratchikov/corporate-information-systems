import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../AuthContext'
import Tasks from './Tasks'

describe('Tasks page', () => {
  beforeEach(() => {
    localStorage.setItem(
      'upzit_user',
      JSON.stringify({
        token: 'jwt',
        userId: 1,
        login: 'admin',
        fullName: 'Админ',
        roleName: 'Администратор',
        roleId: 1,
      })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('renders Kanban board with test ids', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      const ok = true
      const status = 200

      if (url === '/api/tasks') {
        return {
          ok,
          status,
          text: async () =>
            JSON.stringify([
              {
                id: 1,
                title: 'Задача 1',
                dueDate: null,
                typeId: 1,
                typeName: 'Фича',
                priorityId: 1,
                priorityName: 'Низкий',
                statusId: 1,
                statusName: 'Новый',
                projectId: 1,
                projectName: 'Проект A',
                sprintId: null,
                sprintName: null,
                assigneeId: 10,
                assigneeName: 'Петров',
              },
              {
                id: 2,
                title: 'Задача 2',
                dueDate: '2026-03-30',
                typeId: 1,
                typeName: 'Баг',
                priorityId: 3,
                priorityName: 'Высокий',
                statusId: 2,
                statusName: 'В работе',
                projectId: 1,
                projectName: 'Проект A',
                sprintId: null,
                sprintName: null,
                assigneeId: null,
                assigneeName: null,
              },
            ]),
        }
      }

      if (url === '/api/projects') {
        return {
          ok,
          status,
          text: async () => JSON.stringify([{ id: 1, name: 'Проект A', code: 'A', releaseDate: null, responsibleId: null, responsibleName: null }]),
        }
      }

      if (url === '/api/reference-data/users') {
        return {
          ok,
          status,
          text: async () =>
            JSON.stringify([
              { id: 10, fullName: 'Петров' },
              { id: 11, fullName: 'Иванов' },
            ]),
        }
      }

      if (url === '/api/sprints') {
        return {
          ok,
          status,
          text: async () => JSON.stringify([]),
        }
      }

      if (url === '/api/reference-data/task-types') {
        return { ok, status, text: async () => JSON.stringify([{ id: 1, name: 'Фича' }, { id: 2, name: 'Баг' }]) }
      }

      if (url === '/api/reference-data/task-statuses') {
        return {
          ok,
          status,
          text: async () =>
            JSON.stringify([
              { id: 1, name: 'Новый' },
              { id: 2, name: 'В работе' },
              { id: 3, name: 'Готово' },
            ]),
        }
      }

      if (url === '/api/reference-data/priorities') {
        return {
          ok,
          status,
          text: async () => JSON.stringify([{ id: 1, name: 'Низкий' }, { id: 3, name: 'Высокий' }]),
        }
      }

      return { ok: false, status: 404, text: async () => JSON.stringify({ error: 'Not found' }) }
    })

    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()

    render(
      <BrowserRouter>
        <AuthProvider>
          <Tasks />
        </AuthProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('upzit-tasks-table')).toBeInTheDocument()
    })

    const kanbanBtn = screen.getByTestId('upzit-tasks-view-kanban-button')
    await user.click(kanbanBtn)

    await waitFor(() => {
      expect(screen.getByTestId('upzit-kanban-board')).toBeInTheDocument()
    })

    expect(screen.getByTestId('upzit-kanban-column-1')).toBeInTheDocument()
    expect(screen.getByTestId('upzit-kanban-column-2')).toBeInTheDocument()
    expect(screen.getByTestId('upzit-kanban-column-3')).toBeInTheDocument()

    expect(screen.getByTestId('upzit-kanban-column-count-1')).toHaveTextContent('1')
    expect(screen.getByTestId('upzit-kanban-column-count-2')).toHaveTextContent('1')
    expect(screen.getByTestId('upzit-kanban-column-count-3')).toHaveTextContent('0')

    expect(screen.getByTestId('upzit-kanban-card-1')).toBeInTheDocument()
    expect(screen.getByTestId('upzit-kanban-card-2')).toBeInTheDocument()

    const statusSelect1 = screen.getByTestId('upzit-kanban-card-status-select-1') as HTMLSelectElement
    expect(statusSelect1.value).toBe('1')
  })
})

