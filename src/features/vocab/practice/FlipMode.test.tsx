import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FlipMode } from './FlipMode'
import { newCard } from '../factories'

const card = newCard({ front: 'Circumscribe (v.)', back: '限制' })

function renderIt(onSubmit = vi.fn(), phase: 'prompting' | 'revealed' = 'prompting') {
  render(<FlipMode card={card} phase={phase} onSubmit={onSubmit} onNext={() => {}} />)
  return onSubmit
}

function dragCard(dx: number, dy: number) {
  const surface = screen.getByText('Circumscribe (v.)').closest('.touch-none')!
  fireEvent.pointerDown(surface, { clientX: 200, clientY: 200, pointerId: 1 })
  fireEvent.pointerMove(surface, { clientX: 200 + dx, clientY: 200 + dy, pointerId: 1 })
  fireEvent.pointerUp(surface, { pointerId: 1 })
}

describe('FlipMode', () => {
  it('orders the buttons 不會 (left) / 不確定 (middle) / 會 (right)', () => {
    renderIt()
    const labels = screen.getAllByRole('button').map((b) => b.textContent)
    expect(labels).toEqual(['不會', '不確定', '會'])
  })

  it('submits each verdict from its button', async () => {
    const user = userEvent.setup()
    const onSubmit = renderIt()
    await user.click(screen.getByRole('button', { name: '不確定' }))
    expect(onSubmit).toHaveBeenLastCalledWith('uncertain')
    await user.click(screen.getByRole('button', { name: '會' }))
    expect(onSubmit).toHaveBeenLastCalledWith('correct')
    await user.click(screen.getByRole('button', { name: '不會' }))
    expect(onSubmit).toHaveBeenLastCalledWith('incorrect')
  })

  it('drag right past the threshold submits 會', () => {
    const onSubmit = renderIt()
    dragCard(120, 10)
    expect(onSubmit).toHaveBeenCalledWith('correct')
  })

  it('drag left past the threshold submits 不會', () => {
    const onSubmit = renderIt()
    dragCard(-120, -10)
    expect(onSubmit).toHaveBeenCalledWith('incorrect')
  })

  it('drag up past the threshold submits 不確定', () => {
    const onSubmit = renderIt()
    dragCard(5, -120)
    expect(onSubmit).toHaveBeenCalledWith('uncertain')
  })

  it('a small drag snaps back without submitting', () => {
    const onSubmit = renderIt()
    dragCard(30, -20)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('dragging does nothing once revealed', () => {
    const onSubmit = renderIt(vi.fn(), 'revealed')
    dragCard(150, 0)
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
