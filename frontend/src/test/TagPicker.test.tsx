import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TagPicker } from '../components/TagPicker'
import type { TagResponse } from '../types/tag'

const tags: TagResponse[] = [
  { id: 't1', name: 'Bug', color: '#ff0000' },
  { id: 't2', name: 'Feature', color: '#00ff00' },
]

describe('TagPicker', () => {
  it('renders nothing when tags array is empty', () => {
    const { container } = render(<TagPicker tags={[]} selected={[]} onChange={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a chip for each tag', () => {
    render(<TagPicker tags={tags} selected={[]} onChange={vi.fn()} />)
    expect(screen.getByTestId('tag-chip-t1')).toBeTruthy()
    expect(screen.getByTestId('tag-chip-t2')).toBeTruthy()
    expect(screen.getByText('Bug')).toBeTruthy()
    expect(screen.getByText('Feature')).toBeTruthy()
  })

  it('calls onChange with tag added when unselected chip is clicked', () => {
    const onChange = vi.fn()
    render(<TagPicker tags={tags} selected={[]} onChange={onChange} />)
    fireEvent.click(screen.getByTestId('tag-chip-t1'))
    expect(onChange).toHaveBeenCalledWith(['t1'])
  })

  it('calls onChange with tag removed when already-selected chip is clicked', () => {
    const onChange = vi.fn()
    render(<TagPicker tags={tags} selected={['t1', 't2']} onChange={onChange} />)
    fireEvent.click(screen.getByTestId('tag-chip-t1'))
    expect(onChange).toHaveBeenCalledWith(['t2'])
  })

  it('active chip uses tag color as background (active branch)', () => {
    render(<TagPicker tags={tags} selected={['t1']} onChange={vi.fn()} />)
    const chip = screen.getByTestId('tag-chip-t1') as HTMLButtonElement
    // active = true → backgroundColor is the tag color (not transparent)
    expect(chip.style.backgroundColor).not.toBe('transparent')
    expect(chip.style.backgroundColor).not.toBe('')
  })

  it('inactive chip uses transparent background (inactive branch)', () => {
    render(<TagPicker tags={tags} selected={[]} onChange={vi.fn()} />)
    const chip = screen.getByTestId('tag-chip-t1') as HTMLButtonElement
    // active = false → backgroundColor is transparent
    expect(chip.style.backgroundColor).toBe('transparent')
  })

  it('preserves other selected tags when adding a new one', () => {
    const onChange = vi.fn()
    render(<TagPicker tags={tags} selected={['t2']} onChange={onChange} />)
    fireEvent.click(screen.getByTestId('tag-chip-t1'))
    expect(onChange).toHaveBeenCalledWith(['t2', 't1'])
  })
})
