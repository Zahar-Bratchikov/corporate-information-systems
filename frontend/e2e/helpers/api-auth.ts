import type { APIRequestContext } from '@playwright/test'
import { expect } from '@playwright/test'
import { endpoints } from '../../src/api/endpoints'

export async function obtainJwt(
  request: APIRequestContext,
  login: string,
  password: string
): Promise<string> {
  const res = await request.post(endpoints.authentication.signIn, {
    data: { login, password },
  })
  expect(res.status()).toBe(200)
  const json = (await res.json()) as { token?: string }
  expect(json.token).toBeTruthy()
  return json.token!
}

export function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` }
}
