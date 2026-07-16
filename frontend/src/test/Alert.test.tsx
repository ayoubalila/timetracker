import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Alert } from '../components/Alert'

describe('Alert', () => {
  it('renders error variant with alert role', () => {
    render(<Alert variant="error" message="Something failed" testId="alert-msg" />)
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByTestId('alert-msg').textContent).toBe('Something failed')
  })

  it('renders success variant with status role', () => {
    render(<Alert variant="success" message="Saved" testId="alert-msg" />)
    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.getByTestId('alert-msg').textContent).toBe('Saved')
  })
})
