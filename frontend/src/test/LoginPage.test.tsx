import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LoginPage } from '../pages/LoginPage'

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

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('renders login form by default', () => {
    render(<LoginPage onLogin={vi.fn()} />)
    expect(screen.getByTestId('tab-login')).toBeTruthy()
    expect(screen.getByTestId('input-username')).toBeTruthy()
    expect(screen.getByTestId('input-password')).toBeTruthy()
    expect(screen.queryByTestId('input-email')).toBeNull()
  })

  it('switches to register tab and shows email field', () => {
    render(<LoginPage onLogin={vi.fn()} />)
    fireEvent.click(screen.getByTestId('tab-register'))
    expect(screen.getByTestId('input-email')).toBeTruthy()
  })

  it('switches back from register to login tab', () => {
    render(<LoginPage onLogin={vi.fn()} />)
    fireEvent.click(screen.getByTestId('tab-register'))
    expect(screen.getByTestId('input-email')).toBeTruthy()
    fireEvent.click(screen.getByTestId('tab-login'))
    expect(screen.queryByTestId('input-email')).toBeNull()
  })

  it('calls onLogin on successful login', async () => {
    mockFetch({ token: 'jwt', username: 'alice', timezone: 'UTC' })
    const onLogin = vi.fn()
    render(<LoginPage onLogin={onLogin} />)

    fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByTestId('input-password'), { target: { value: 'password1' } })
    fireEvent.click(screen.getByTestId('submit-button'))

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith('alice', 'UTC'))
  })

  it('shows error message on failed login', async () => {
    mockFetch('Invalid credentials', 401)
    render(<LoginPage onLogin={vi.fn()} />)

    fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByTestId('input-password'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByTestId('submit-button'))

    await waitFor(() => expect(screen.getByTestId('error-message')).toBeTruthy())
  })

  it('shows generic error for non-Error thrown value', async () => {
    // fetch itself rejects with a string (not an Error), bypassing apiRequest's error handling
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('network failure'))
    render(<LoginPage onLogin={vi.fn()} />)

    fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByTestId('input-password'), { target: { value: 'pw' } })
    fireEvent.click(screen.getByTestId('submit-button'))

    await waitFor(() => expect(screen.getByTestId('error-message').textContent).toBe('An error occurred'))
  })

  it('calls onLogin on successful register', async () => {
    mockFetch({ token: 'jwt', username: 'bob', timezone: 'UTC' })
    const onLogin = vi.fn()
    render(<LoginPage onLogin={onLogin} />)

    fireEvent.click(screen.getByTestId('tab-register'))
    fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'bob' } })
    fireEvent.change(screen.getByTestId('input-email'), { target: { value: 'bob@test.com' } })
    fireEvent.change(screen.getByTestId('input-password'), { target: { value: 'password1' } })
    fireEvent.click(screen.getByTestId('submit-button'))

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith('bob', 'UTC'))
  })

  it('shows the error message when fetch throws a plain Error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Connection refused')))
    render(<LoginPage onLogin={vi.fn()} />)
    fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByTestId('input-password'), { target: { value: 'pw' } })
    fireEvent.click(screen.getByTestId('submit-button'))
    await waitFor(() => expect(screen.getByTestId('error-message').textContent).toBe('Connection refused'))
  })

  it('shows loading state while submitting', async () => {
    let resolve!: (v: unknown) => void
    const fetchPromise = new Promise((r) => { resolve = r })
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(fetchPromise))
    render(<LoginPage onLogin={vi.fn()} />)

    fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByTestId('input-password'), { target: { value: 'pw' } })
    fireEvent.click(screen.getByTestId('submit-button'))

    expect(screen.getByTestId('submit-button').textContent).toBe('Please wait…')
    resolve({ ok: true, status: 200, json: async () => ({ token: 'x', username: 'alice', timezone: 'UTC' }) })
  })
})
