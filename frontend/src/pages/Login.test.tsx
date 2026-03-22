import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../AuthContext'
import Login from './Login'

function renderLogin() {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('Login page', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends POST to authentication endpoint with credentials', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        token: 'jwt',
        userId: 1,
        login: 'admin',
        fullName: 'Админ',
        roleName: 'Администратор',
        roleId: 1,
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    renderLogin()

    await user.type(screen.getByTestId('upzit-login-username'), 'admin')
    await user.type(screen.getByTestId('upzit-login-password'), 'password')
    await user.click(screen.getByTestId('upzit-login-submit'))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/authentication/login',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    )
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(JSON.parse(init.body as string)).toEqual({ login: 'admin', password: 'password' })
  })

  it('shows error message when login fails', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Неверный логин или пароль' }),
      })
    )

    renderLogin()

    await user.type(screen.getByTestId('upzit-login-username'), 'x')
    await user.type(screen.getByTestId('upzit-login-password'), 'y')
    await user.click(screen.getByTestId('upzit-login-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('upzit-login-error')).toHaveTextContent('Неверный логин или пароль')
    })
  })
})
