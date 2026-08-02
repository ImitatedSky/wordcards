import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { StorageProvider } from '@/storage/StorageProvider'
import { IndexedDBStorage } from '@/storage/indexedDBStorage'
import { DeckDetail } from './DeckDetail'
import { newDeck } from './factories'

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

async function seedDeck(storage: IndexedDBStorage, name = 'TestDeck') {
  const d = newDeck({ name })
  await storage.saveDeck(d)
  return d.id
}

function renderIt(storage: IndexedDBStorage, deckId: string) {
  return render(
    <MemoryRouter>
      <StorageProvider storage={storage}>
        <DeckDetail deckId={deckId} />
      </StorageProvider>
    </MemoryRouter>,
  )
}

describe('DeckDetail', () => {
  let storage: IndexedDBStorage

  beforeEach(async () => {
    storage = await freshStorage(null)
  })

  afterEach(async () => {
    await storage.close()
  })

  it('renders the deck header and empty card state', async () => {
    const id = await seedDeck(storage)
    renderIt(storage, id)
    expect(await screen.findByRole('heading', { name: 'TestDeck' })).toBeInTheDocument()
    expect(screen.getByText('這個牌組還沒有單字。')).toBeInTheDocument()
  })

  it('adds a card via the editor', async () => {
    const user = userEvent.setup()
    const id = await seedDeck(storage)
    renderIt(storage, id)
    await screen.findByRole('heading', { name: 'TestDeck' })
    await user.click(screen.getByRole('button', { name: '新增單字' }))
    await user.type(screen.getByLabelText('正面'), 'hello')
    await user.type(screen.getByLabelText('背面'), '你好')
    await user.click(screen.getByRole('button', { name: '儲存' }))
    expect(await screen.findByText('hello')).toBeInTheDocument()
    expect(screen.getByText('你好')).toBeInTheDocument()
  })

  it('deletes a card', async () => {
    const user = userEvent.setup()
    const id = await seedDeck(storage)
    renderIt(storage, id)
    await screen.findByRole('heading', { name: 'TestDeck' })
    await user.click(screen.getByRole('button', { name: '新增單字' }))
    await user.type(screen.getByLabelText('正面'), 'x')
    await user.type(screen.getByLabelText('背面'), 'y')
    await user.click(screen.getByRole('button', { name: '儲存' }))
    await screen.findByText('x')
    await user.click(screen.getByRole('button', { name: '刪除' }))
    expect(screen.queryByText('x')).not.toBeInTheDocument()
  })

  it('disables Start Practice when the deck has no cards', async () => {
    const id = await seedDeck(storage)
    renderIt(storage, id)
    await screen.findByRole('heading', { name: 'TestDeck' })
    expect(screen.getByRole('link', { name: /開始練習/ })).toHaveAttribute('aria-disabled', 'true')
  })

  async function seedDeckWithCard(storage: IndexedDBStorage) {
    const d = newDeck({ name: 'ViewDeck' })
    d.cards = [
      {
        id: 'c1',
        front: 'hello',
        back: '你好',
        example: 'Hello there.',
        notes: '【精準字義】打招呼',
        tags: [],
        stats: { correctCount: 0, incorrectCount: 0, lastReviewedAt: null },
      },
    ]
    await storage.saveDeck(d)
    return d.id
  }

  it('clicking a list row opens the full flashcard dialog', async () => {
    const user = userEvent.setup()
    const id = await seedDeckWithCard(storage)
    renderIt(storage, id)
    await screen.findByText('hello')

    await user.click(screen.getByRole('button', { name: 'hello' }))
    const dialog = screen.getByRole('dialog', { name: '單字卡：hello' })
    expect(dialog).toHaveTextContent('你好')
    expect(dialog).toHaveTextContent('【精準字義】打招呼')

    await user.click(screen.getByRole('button', { name: '關閉單字卡' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('grid view shows card blocks with working edit, delete, and open actions', async () => {
    const user = userEvent.setup()
    const id = await seedDeckWithCard(storage)
    renderIt(storage, id)
    await screen.findByText('hello')

    await user.click(screen.getByRole('button', { name: '卡片檢視' }))
    expect(screen.getByRole('button', { name: '卡片檢視' })).toHaveAttribute('aria-pressed', 'true')

    // block click opens the dialog
    await user.click(screen.getByRole('button', { name: '查看單字卡 hello' }))
    expect(screen.getByRole('dialog', { name: '單字卡：hello' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '關閉單字卡' }))

    // edit opens the editor prefilled
    await user.click(screen.getByRole('button', { name: '編輯' }))
    expect(screen.getByLabelText('正面')).toHaveValue('hello')
    await user.click(screen.getByRole('button', { name: '取消' }))

    // delete removes the block
    await user.click(screen.getByRole('button', { name: '刪除' }))
    expect(await screen.findByText('這個牌組還沒有單字。')).toBeInTheDocument()
  })
})
