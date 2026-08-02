import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { FloatingWords, type FloatingWordItem } from './FloatingWords'

const item = (over: Partial<FloatingWordItem['card']> = {}): FloatingWordItem => ({
  deckId: 'd1',
  deckName: 'C5 · Test',
  card: {
    id: over.id ?? 'c1',
    front: 'Circumscribe (v.)',
    back: '限制、約束',
    example: 'The power was circumscribed.',
    notes: '【精準字義】\n字根 circum- 環繞',
    tags: [],
    stats: { correctCount: 0, incorrectCount: 0, lastReviewedAt: null },
    ...over,
  },
})

function renderIt(items: FloatingWordItem[]) {
  return render(
    <MemoryRouter>
      <FloatingWords pool={items} />
    </MemoryRouter>,
  )
}

describe('FloatingWords', () => {
  it('renders each word without its part-of-speech suffix', () => {
    renderIt([item(), item({ id: 'c2', front: 'Settle (v.)' })])
    expect(screen.getByRole('button', { name: '單字：Circumscribe' })).toHaveTextContent('Circumscribe')
    expect(screen.getByRole('button', { name: '單字：Settle' })).toBeInTheDocument()
  })

  it('opens the word card on click, showing meaning, example, and notes', async () => {
    const user = userEvent.setup()
    renderIt([item()])
    await user.click(screen.getByRole('button', { name: '單字：Circumscribe' }))

    const dialog = screen.getByRole('dialog', { name: '單字卡：Circumscribe' })
    expect(dialog).toHaveTextContent('限制、約束')
    expect(dialog).toHaveTextContent('The power was circumscribed.')
    expect(dialog).toHaveTextContent('【精準字義】')
    expect(screen.getByRole('link', { name: /練習這副牌組/ })).toHaveAttribute(
      'href',
      '/vocab/d1/practice',
    )
  })

  it('closes the card via the close button', async () => {
    const user = userEvent.setup()
    renderIt([item()])
    await user.click(screen.getByRole('button', { name: '單字：Circumscribe' }))
    await user.click(screen.getByRole('button', { name: '關閉單字卡' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
