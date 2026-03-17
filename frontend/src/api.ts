const STORAGE_KEY = 'upzit_user'

function getToken(): string | null {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (!s) return null
    const u = JSON.parse(s)
    return u?.token ?? null
  } catch {
    return null
  }
}

const base = ''

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string; status: number }> {
  const token = getToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${base}${path}`, { ...options, headers })
  const text = await res.text()
  let data: T | { error?: string } | undefined
  try {
    data = text ? (JSON.parse(text) as T) : undefined
  } catch {
    data = undefined
  }
  const err = (data as { error?: string } | undefined)?.error
  if (!res.ok) {
    return { error: err || res.statusText || 'Ошибка запроса', status: res.status, data: data as T }
  }
  return { data: data as T, status: res.status }
}

export async function apiBlob(path: string): Promise<{ blob: Blob; filename: string; error?: string }> {
  const token = getToken()
  const headers: HeadersInit = {}
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${base}${path}`, { headers })
  if (!res.ok) {
    const text = await res.text()
    let err = 'Ошибка загрузки'
    try {
      const j = JSON.parse(text)
      if (j.error) err = j.error
    } catch {
      //
    }
    return { blob: new Blob(), filename: '', error: err }
  }
  const disposition = res.headers.get('Content-Disposition')
  let filename = 'report'
  if (disposition) {
    const m = disposition.match(/filename="?([^";]+)"?/)
    if (m) filename = m[1]
  }
  const blob = await res.blob()
  return { blob, filename }
}
