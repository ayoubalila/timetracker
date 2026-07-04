import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Toaster } from '../components/Toaster'
import { toast } from '../lib/toast'

describe('Toaster', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when no toasts are present', () => {
    render(<Toaster />)
    expect(screen.queryByTestId('toaster')).toBeNull()
  })

  it('shows an error toast when toast() is called', async () => {
    render(<Toaster />)
    toast('Something went wrong', 'error')
    await waitFor(() => expect(screen.getByTestId('toaster')).toBeTruthy())
    expect(screen.getByRole('alert').textContent).toBe('Something went wrong')
  })

  it('shows a success toast', async () => {
    render(<Toaster />)
    toast('Saved!', 'success')
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.getByRole('alert').textContent).toBe('Saved!')
  })

  it('shows an info toast', async () => {
    render(<Toaster />)
    toast('Just so you know', 'info')
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.getByRole('alert').textContent).toBe('Just so you know')
  })

  it('defaults to error type when type is not specified', async () => {
    render(<Toaster />)
    toast('Default error')
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    const alert = screen.getByRole('alert')
    expect(alert.className).toContain('bg-red-600')
  })

  it('removes the toast after 4 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<Toaster />)
    toast('Temporary message')
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    vi.advanceTimersByTime(4001)
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })

  it('shows multiple toasts simultaneously', async () => {
    render(<Toaster />)
    toast('First')
    toast('Second')
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert')
      expect(alerts.length).toBe(2)
    })
  })
})
