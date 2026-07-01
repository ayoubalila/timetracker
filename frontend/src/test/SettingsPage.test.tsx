import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SettingsPage } from '../pages/SettingsPage'

function renderSettings(onLogout = vi.fn()) {
  return render(
    <MemoryRouter>
      <SettingsPage username="alice" onLogout={onLogout} />
    </MemoryRouter>,
  )
}

function mockFetch(body: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: async () => body,
      text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    }),
  )
}

describe('SettingsPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('renders the change password form', () => {
    renderSettings()
    expect(screen.getByTestId('change-password-form')).toBeTruthy()
    expect(screen.getByTestId('current-password-input')).toBeTruthy()
    expect(screen.getByTestId('new-password-input')).toBeTruthy()
    expect(screen.getByTestId('confirm-password-input')).toBeTruthy()
    expect(screen.getByTestId('change-password-submit')).toBeTruthy()
  })

  it('shows error when new passwords do not match', async () => {
    renderSettings()
    fireEvent.change(screen.getByTestId('current-password-input'), { target: { value: 'oldpass1' } })
    fireEvent.change(screen.getByTestId('new-password-input'), { target: { value: 'newpass1' } })
    fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'different' } })
    fireEvent.submit(screen.getByTestId('change-password-form'))

    expect(screen.getByTestId('settings-error').textContent).toContain('do not match')
  })

  it('does not call API when passwords do not match', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    renderSettings()
    fireEvent.change(screen.getByTestId('new-password-input'), { target: { value: 'newpass1' } })
    fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'mismatch' } })
    fireEvent.submit(screen.getByTestId('change-password-form'))

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows success message after successful password change', async () => {
    mockFetch({ message: 'Password changed successfully' })

    renderSettings()
    fireEvent.change(screen.getByTestId('current-password-input'), { target: { value: 'oldpass1' } })
    fireEvent.change(screen.getByTestId('new-password-input'), { target: { value: 'newpass1' } })
    fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'newpass1' } })
    fireEvent.submit(screen.getByTestId('change-password-form'))

    await waitFor(() => expect(screen.getByTestId('settings-success')).toBeTruthy())
    expect(screen.getByTestId('settings-success').textContent).toContain('Password changed')
  })

  it('clears form fields after successful password change', async () => {
    mockFetch({ message: 'Password changed successfully' })

    renderSettings()
    fireEvent.change(screen.getByTestId('current-password-input'), { target: { value: 'oldpass1' } })
    fireEvent.change(screen.getByTestId('new-password-input'), { target: { value: 'newpass1' } })
    fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'newpass1' } })
    fireEvent.submit(screen.getByTestId('change-password-form'))

    await waitFor(() => screen.getByTestId('settings-success'))
    expect((screen.getByTestId('current-password-input') as HTMLInputElement).value).toBe('')
    expect((screen.getByTestId('new-password-input') as HTMLInputElement).value).toBe('')
    expect((screen.getByTestId('confirm-password-input') as HTMLInputElement).value).toBe('')
  })

  it('shows error message when API call fails', async () => {
    mockFetch('Current password is incorrect', false, 400)

    renderSettings()
    fireEvent.change(screen.getByTestId('current-password-input'), { target: { value: 'wrongpass' } })
    fireEvent.change(screen.getByTestId('new-password-input'), { target: { value: 'newpass1' } })
    fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'newpass1' } })
    fireEvent.submit(screen.getByTestId('change-password-form'))

    await waitFor(() => expect(screen.getByTestId('settings-error')).toBeTruthy())
    expect(screen.getByTestId('settings-error').textContent).toContain('Current password is incorrect')
  })

  it('calls logout handler when logout button clicked', () => {
    const onLogout = vi.fn()
    renderSettings(onLogout)
    fireEvent.click(screen.getByTestId('logout-button'))
    expect(onLogout).toHaveBeenCalledOnce()
  })

  it('renders nav links to dashboard, projects, and settings', () => {
    renderSettings()
    expect(screen.getByTestId('nav-dashboard')).toBeTruthy()
    expect(screen.getByTestId('nav-projects')).toBeTruthy()
    expect(screen.getByTestId('nav-settings')).toBeTruthy()
  })
})
