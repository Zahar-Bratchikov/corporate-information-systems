import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { api, apiBlob } from '../api'

const STORAGE_KEY = 'upzit_user'

describe('api()', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns parsed JSON data on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ name: 'OK' }),
      })
    )

    const result = await api<{ name: string }>('/api/projects')

    expect(result.status).toBe(200)
    expect(result.data).toEqual({ name: 'OK' })
    expect(result.error).toBeUndefined()
  })

  it('sends Authorization when token present in localStorage', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token: 'abc.jwt',
        userId: 1,
        login: 'u',
        fullName: 'U',
        roleName: 'R',
        roleId: 1,
      })
    )

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{}',
    })
    vi.stubGlobal('fetch', fetchMock)

    await api('/api/tasks')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/tasks',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer abc.jwt',
          'Content-Type': 'application/json',
        }),
      })
    )
  })

  it('returns error payload on non-OK response with JSON error field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => JSON.stringify({ error: 'Нет доступа' }),
      })
    )

    const result = await api('/api/users')

    expect(result.status).toBe(403)
    expect(result.error).toBe('Нет доступа')
  })
})

describe('apiBlob()', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('returns blob and filename from Content-Disposition', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: (name: string) =>
            name === 'Content-Disposition' ? 'attachment; filename="report.xlsx"' : null,
        },
        blob: async () => new Blob([new Uint8Array([1, 2])]),
      })
    )

    const result = await apiBlob('/api/reports/x')

    expect(result.error).toBeUndefined()
    expect(result.filename).toBe('report.xlsx')
    expect(result.blob.size).toBe(2)
  })

  it('returns error when response not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        text: async () => JSON.stringify({ error: 'Сбой отчёта' }),
      })
    )

    const result = await apiBlob('/api/reports/y')

    expect(result.error).toBe('Сбой отчёта')
    expect(result.filename).toBe('')
  })
})
