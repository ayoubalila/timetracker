import { describe, it, expect, vi, afterEach } from 'vitest'
import { toDatetimeLocalInTz } from '../utils/timezone'

describe('toDatetimeLocalInTz', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('falls back to "00" when the formatter omits a date part', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function () {
      return {
        formatToParts: () => [
          { type: 'year', value: '2026' },
          { type: 'month', value: '07' },
          { type: 'hour', value: '10' },
          { type: 'minute', value: '30' },
        ],
      } as unknown as Intl.DateTimeFormat
    } as unknown as typeof Intl.DateTimeFormat)

    const result = toDatetimeLocalInTz('2026-07-01T10:30:00Z', 'UTC')
    expect(result).toBe('2026-07-00T10:30')
  })
})
