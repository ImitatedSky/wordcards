import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { StorageProvider } from '@/storage/StorageProvider'
import { IndexedDBStorage } from '@/storage/indexedDBStorage'
import { PracticeSession } from './PracticeSession'
import { newDeck, newCard } from '../factories'

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

  it('shows the pre-session options and starts a flip session', async () => {
    const user = userEvent.setup()
    const id = await seedDeckOf(2)
    renderAt(id)
    expect(await screen.findByRole('heading', { name: '練習設定' })).toBeInTheDocument()
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
    await user.click(screen.getByRole('button', { name: /我會/ }))
    await user.click(screen.getByRole('button', { name: '下一題' }))
    expect(await screen.findByRole('heading', { name: '本次結果' })).toBeInTheDocument()
    expect(screen.getByText('1 / 1')).toBeInTheDocument()
  })
})
