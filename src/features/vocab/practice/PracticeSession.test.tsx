import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { StorageProvider } from '@/storage/StorageProvider'
import { IndexedDBStorage } from '@/storage/indexedDBStorage'
import { PracticeSession } from './PracticeSession'
import { parseSessionLimit } from './sessionLimit'
import { newDeck, newCard } from '../factories'

describe('parseSessionLimit', () => {
  it('returns undefined for empty/invalid input (= practice all)', () => {
    expect(parseSessionLimit('', 10)).toBeUndefined()
    expect(parseSessionLimit('  ', 10)).toBeUndefined()
    expect(parseSessionLimit('abc', 10)).toBeUndefined()
    expect(parseSessionLimit('0', 10)).toBeUndefined()
    expect(parseSessionLimit('-3', 10)).toBeUndefined()
  })

  it('clamps to the deck size and floors decimals', () => {
    expect(parseSessionLimit('5', 10)).toBe(5)
    expect(parseSessionLimit('99', 10)).toBe(10)
    expect(parseSessionLimit('2.7', 10)).toBe(2)
  })
})

async function freshStorage(previous: IndexedDBStorage | null): Promise<IndexedDBStorage> {
  if (previous) await previous.close()
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('english-app')
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('deleteDatabase blocked'))
  })
  const s = new IndexedDBStorage()
  await s.ready()
  return s
}

describe('PracticeSession', () => {
  let storage: IndexedDBStorage

  beforeEach(async () => {
    storage = await freshStorage(null)
  })

  afterEach(async () => {
    await storage.close()
  })

  async function seedDeckOf(n: number) {
    const d = newDeck({ name: 'P' })
    d.cards = Array.from({ length: n }, (_, i) =>
      newCard({ front: `f${i}`, back: `b${i}` }),
    )
    await storage.saveDeck(d)
    return d.id
  }

  function renderAt(deckId: string) {
    return render(
      <MemoryRouter>
        <StorageProvider storage={storage}>
          <PracticeSession deckId={deckId} />
        </StorageProvider>
      </MemoryRouter>,
    )
  }

  it('can select multiple decks and practice their combined pool', async () => {
    const user = userEvent.setup()
    const id = await seedDeckOf(2) // deck 'P', pre-selected via the route
    const other = newDeck({ name: 'Q' })
    other.cards = Array.from({ length: 3 }, (_, i) => newCard({ front: `q${i}`, back: `qb${i}` }))
    await storage.saveDeck(other)

    renderAt(id)
    await screen.findByRole('heading', { name: '練習設定' })
    expect(await screen.findByText(/已選 1 副牌組 · 共 2 張/)).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: '牌組 Q' }))
    expect(screen.getByText(/已選 2 副牌組 · 共 5 張/)).toBeInTheDocument()

    const shuffle = screen.getByLabelText('隨機出題') as HTMLInputElement
    if (shuffle.checked) await user.click(shuffle)
    await user.click(screen.getByRole('button', { name: '100%' })) // practice all 5
    await user.click(screen.getByRole('button', { name: '開始' }))

    await screen.findByText('f0')
    expect(screen.getByRole('progressbar', { name: '練習進度' })).toHaveAttribute(
      'aria-valuemax',
      '5',
    )
  })

  it('mixing two modes shows the ratio split and switches modes mid-session', async () => {
    const user = userEvent.setup()
    const id = await seedDeckOf(4)
    renderAt(id)
    await screen.findByRole('heading', { name: '練習設定' })

    // click 選擇題 as the second mode → ratio picker appears with the split hint
    await user.click(screen.getByRole('checkbox', { name: '選擇題' }))
    expect(screen.getByRole('radiogroup', { name: '模式比例' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '100%' })) // practice all 4
    await user.click(screen.getByRole('radio', { name: '50%' }))
    expect(screen.getByText('翻牌 (自評) 前 2 題 → 選擇題 後 2 題')).toBeInTheDocument()

    const shuffle = screen.getByLabelText('隨機出題') as HTMLInputElement
    if (shuffle.checked) await user.click(shuffle)
    await user.click(screen.getByRole('button', { name: '開始' }))

    // first segment is flip (self-assessment buttons)
    await screen.findByText('f0')
    expect(screen.getByRole('button', { name: '會' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '會' }))
    await user.click(screen.getByRole('button', { name: '下一題' }))
    await screen.findByText('f1')
    await user.click(screen.getByRole('button', { name: '會' }))
    await user.click(screen.getByRole('button', { name: '下一題' }))

    // third question switches to multiple choice (options, no self-assessment)
    await screen.findByText('這個單字的意思是？')
    expect(screen.queryByRole('button', { name: '會' })).not.toBeInTheDocument()
  })

  it('limits the queue to the requested 題目數量', async () => {
    const user = userEvent.setup()
    const id = await seedDeckOf(5)
    renderAt(id)
    await screen.findByRole('heading', { name: '練習設定' })
    const shuffle = screen.getByLabelText('隨機出題') as HTMLInputElement
    if (shuffle.checked) await user.click(shuffle) // deterministic order
    await user.clear(screen.getByLabelText('題目數量'))
    await user.type(screen.getByLabelText('題目數量'), '2')
    await user.click(screen.getByRole('button', { name: '開始' }))

    // Queue is limited to 2 of 5: first card in deck order, progress total = 2.
    await screen.findByText('f0')
    const progress = screen.getByRole('progressbar', { name: '練習進度' })
    expect(progress).toHaveAttribute('aria-valuemax', '2')
    expect(progress).toHaveAttribute('aria-valuenow', '1')
  })

  it('shows the pre-session options and starts a flip session', async () => {
    const user = userEvent.setup()
    const id = await seedDeckOf(2)
    renderAt(id)
    expect(await screen.findByRole('heading', { name: '練習設定' })).toBeInTheDocument()
    const shuffle = screen.getByLabelText('隨機出題') as HTMLInputElement
    if (shuffle.checked) await user.click(shuffle)
    await user.click(screen.getByRole('button', { name: '開始' }))
    expect(await screen.findByText('f0')).toBeInTheDocument()
  })

  it('runs a flip session to finish and shows the results', async () => {
    const user = userEvent.setup()
    const id = await seedDeckOf(1)
    renderAt(id)
    await screen.findByRole('heading', { name: '練習設定' })
    await user.click(screen.getByRole('button', { name: '開始' }))
    await screen.findByText('f0')
    await user.click(screen.getByRole('button', { name: '會' }))
    await user.click(screen.getByRole('button', { name: '下一題' }))
    expect(await screen.findByRole('heading', { name: '本次結果' })).toBeInTheDocument()
    expect(screen.getByText('1 / 1')).toBeInTheDocument()
    // every practiced word is listed with its verdict
    expect(screen.getByText(/本次練習的單字/)).toBeInTheDocument()
    expect(screen.getByText('f0')).toBeInTheDocument()
    expect(screen.getByText('b0')).toBeInTheDocument()
    // clicking a listed word opens its full flashcard
    await user.click(screen.getByRole('button', { name: /f0/ }))
    expect(screen.getByRole('dialog', { name: '單字卡：f0' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '關閉單字卡' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
