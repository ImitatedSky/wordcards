import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MatchMode } from './MatchMode'
import { newCard } from '../factories'

function makeCards() {
  return [
    newCard({ front: 'apple (n.)', back: '蘋果' }),
    newCard({ front: 'run (v.)', back: '跑' }),
    newCard({ front: 'happy (adj.)', back: '快樂的' }),
  ]
}

describe('MatchMode', () => {
  it('locks a correct pair and completes with all-correct verdicts', () => {
    const cards = makeCards()
    const onComplete = vi.fn()
    render(<MatchMode cards={cards} onComplete={onComplete} onNext={() => {}} isLast={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'apple' }))
    fireEvent.click(screen.getByRole('button', { name: '蘋果' }))
    expect(screen.getByRole('button', { name: /蘋果/ })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'run' }))
    fireEvent.click(screen.getByRole('button', { name: '跑' }))
    fireEvent.click(screen.getByRole('button', { name: 'happy' }))
    fireEvent.click(screen.getByRole('button', { name: '快樂的' }))

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith({
      [cards[0].id]: 'correct',
      [cards[1].id]: 'correct',
      [cards[2].id]: 'correct',
    })
    expect(screen.getByText(/本組完成/)).toBeInTheDocument()
  })

  it('a mismatched pair stays unlocked and marks that word incorrect', () => {
    const cards = makeCards()
    const onComplete = vi.fn()
    render(<MatchMode cards={cards} onComplete={onComplete} onNext={() => {}} isLast={false} />)

    // wrong: apple → 跑
    fireEvent.click(screen.getByRole('button', { name: 'apple' }))
    fireEvent.click(screen.getByRole('button', { name: '跑' }))
    expect(screen.getByRole('button', { name: 'apple' })).not.toBeDisabled()

    // now match everything
    fireEvent.click(screen.getByRole('button', { name: 'apple' }))
    fireEvent.click(screen.getByRole('button', { name: '蘋果' }))
    fireEvent.click(screen.getByRole('button', { name: 'run' }))
    fireEvent.click(screen.getByRole('button', { name: '跑' }))
    fireEvent.click(screen.getByRole('button', { name: 'happy' }))
    fireEvent.click(screen.getByRole('button', { name: '快樂的' }))

    expect(onComplete).toHaveBeenCalledWith({
      [cards[0].id]: 'incorrect',
      [cards[1].id]: 'correct',
      [cards[2].id]: 'correct',
    })
    // 一次配對 2 / 3
    expect(screen.getByText(/2 \/ 3/)).toBeInTheDocument()
  })

  it('the last chunk advances with 看結果', () => {
    const cards = [newCard({ front: 'sun (n.)', back: '太陽' })]
    const onNext = vi.fn()
    render(<MatchMode cards={cards} onComplete={() => {}} onNext={onNext} isLast={true} />)
    fireEvent.click(screen.getByRole('button', { name: 'sun' }))
    fireEvent.click(screen.getByRole('button', { name: '太陽' }))
    fireEvent.click(screen.getByRole('button', { name: /看結果/ }))
    expect(onNext).toHaveBeenCalled()
  })
})
