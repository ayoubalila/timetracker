import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { LiveTimer } from '../components/LiveTimer'

describe('LiveTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders initial elapsed time from startTime', () => {
    const startTime = new Date(Date.now() - 90000).toISOString() // 1m 30s ago
    render(<LiveTimer startTime={startTime} />)
    const timer = screen.getByTestId('live-timer')
    expect(timer.textContent).toMatch(/^00:01:3/)
  })

  it('increments every second', () => {
    const startTime = new Date(Date.now() - 60000).toISOString() // 1m ago
    render(<LiveTimer startTime={startTime} />)

    act(() => { vi.advanceTimersByTime(3000) })

    const timer = screen.getByTestId('live-timer')
    expect(timer.textContent).toMatch(/^00:01:0[3-9]|00:01:[1-5]/)
  })

  it('clamps elapsed to 0 if startTime is in the future', () => {
    const startTime = new Date(Date.now() + 10000).toISOString()
    render(<LiveTimer startTime={startTime} />)
    expect(screen.getByTestId('live-timer').textContent).toBe('00:00:00')
  })

  it('shows hours correctly for long tasks', () => {
    const startTime = new Date(Date.now() - 3661000).toISOString() // 1h 1m 1s ago
    render(<LiveTimer startTime={startTime} />)
    expect(screen.getByTestId('live-timer').textContent).toMatch(/^01:01:0/)
  })
})
