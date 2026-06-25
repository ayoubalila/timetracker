import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loginApi, registerApi, logoutApi } from '../api/auth'
import { getToken, clearToken } from '../api/client'

function mockFetch(body: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    }),
  )
}

describe('loginApi', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('stores token and returns AuthResponse', async () => {
    mockFetch({ token: 'jwt-abc', username: 'alice' })

    const result = await loginApi('alice', 'password1')

    expect(result.token).toBe('jwt-abc')
    expect(result.username).toBe('alice')
    expect(getToken()).toBe('jwt-abc')
  })

  it('throws on 401', async () => {
    mockFetch('Invalid credentials', 401)

    await expect(loginApi('alice', 'wrong')).rejects.toThrow()
    expect(getToken()).toBeNull()
  })
})

describe('registerApi', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('stores token and returns AuthResponse', async () => {
    mockFetch({ token: 'jwt-reg', username: 'bob' })

    const result = await registerApi('bob', 'bob@test.com', 'password1')

    expect(result.username).toBe('bob')
    expect(getToken()).toBe('jwt-reg')
  })
})

describe('logoutApi', () => {
  it('clears the stored token', async () => {
    localStorage.setItem('tt_token', 'some-token')

    await logoutApi()

    expect(getToken()).toBeNull()
    clearToken()
  })
})
