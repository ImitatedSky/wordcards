import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagChip } from './TagChip'
import type { Tag } from '@/types/tag'

function makeTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: 't1',
    name: 'TOEIC',
    builtIn: false,
    createdAt: 1,
    ...overrides,
  }
}

describe('TagChip', () => {
  it('renders tag name', () => {
    render(<TagChip tag={makeTag({ name: 'Business' })} />)
    expect(screen.getByText('Business')).toBeInTheDocument()
  })

  it('renders icon when present', () => {
    render(<TagChip tag={makeTag({ icon: '🔥' })} />)
    expect(screen.getByText('🔥')).toBeInTheDocument()
  })

  it('calls onRemove when remove button is clicked', async () => {
    const onRemove = vi.fn()
    const user = userEvent.setup()
    render(<TagChip tag={makeTag({ id: 'abc' })} onRemove={onRemove} />)
    await user.click(screen.getByRole('button', { name: /移除/i }))
    expect(onRemove).toHaveBeenCalledWith('abc')
  })

  it('does not render remove button when onRemove is absent', () => {
    render(<TagChip tag={makeTag()} />)
    expect(screen.queryByRole('button', { name: /移除/i })).toBeNull()
  })
})
