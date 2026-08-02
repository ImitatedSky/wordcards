import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { SessionSizeField } from './SessionSizeField'
import {
  DEFAULT_SESSION_SIZE,
  resolveSessionLimit,
  type SessionSize,
} from './sessionLimit'

function Harness({ total }: { total: number }) {
  const [size, setSize] = useState<SessionSize>(DEFAULT_SESSION_SIZE)
  return (
    <>
      <SessionSizeField total={total} value={size} onChange={setSize} />
      <output aria-label="resolved">{String(resolveSessionLimit(size, total) ?? 'all')}</output>
    </>
  )
}

describe('resolveSessionLimit', () => {
  it('converts percentages of the pool, 100% meaning no limit', () => {
    expect(resolveSessionLimit({ kind: 'pct', pct: 25 }, 132)).toBe(33)
    expect(resolveSessionLimit({ kind: 'pct', pct: 50 }, 20)).toBe(10)
    expect(resolveSessionLimit({ kind: 'pct', pct: 100 }, 20)).toBeUndefined()
    expect(resolveSessionLimit({ kind: 'pct', pct: 25 }, 1)).toBe(1) // floor of 1
  })

  it('delegates manual values to the clamped parser', () => {
    expect(resolveSessionLimit({ kind: 'manual', value: '7' }, 20)).toBe(7)
    expect(resolveSessionLimit({ kind: 'manual', value: '999' }, 20)).toBe(20)
    expect(resolveSessionLimit({ kind: 'manual', value: '' }, 20)).toBeUndefined()
  })
})

describe('SessionSizeField', () => {
  it('defaults to 25% and shows the computed count in the input', () => {
    render(<Harness total={132} />)
    expect(screen.getByRole('button', { name: '25%' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('題目數量')).toHaveValue(33)
    expect(screen.getByLabelText('resolved')).toHaveTextContent('33')
  })

  it('quick buttons switch the percentage', async () => {
    const user = userEvent.setup()
    render(<Harness total={132} />)
    await user.click(screen.getByRole('button', { name: '50%' }))
    expect(screen.getByLabelText('題目數量')).toHaveValue(66)
    await user.click(screen.getByRole('button', { name: '100%' }))
    expect(screen.getByLabelText('題目數量')).toHaveValue(132)
    expect(screen.getByLabelText('resolved')).toHaveTextContent('all')
  })

  it('typing switches to manual mode and deselects the quick buttons', async () => {
    const user = userEvent.setup()
    render(<Harness total={132} />)
    const input = screen.getByLabelText('題目數量')
    await user.clear(input)
    await user.type(input, '12')
    expect(input).toHaveValue(12)
    expect(screen.getByLabelText('resolved')).toHaveTextContent('12')
    for (const name of ['25%', '50%', '75%', '100%']) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false')
    }
  })
})
