import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { StorageProvider } from '@/storage/StorageProvider'
import { IndexedDBStorage } from '@/storage/indexedDBStorage'
import { DeckList } from './DeckList'

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

function renderIt(storage: IndexedDBStorage) {
  return render(
    <MemoryRouter>
      <StorageProvider storage={storage}>
        <DeckList />
      </StorageProvider>
    </MemoryRouter>,
  )
}

describe('DeckList', () => {
  let storage: IndexedDBStorage

  beforeEach(async () => {
    storage = await freshStorage(null)
  })

  afterEach(async () => {
    await storage.close()
  })

  it('shows the empty state when there are no decks', async () => {
    renderIt(storage)
    expect(await screen.findByText(/尚無牌組/)).toBeInTheDocument()
  })

  it('creates a deck and shows it in the list', async () => {
    const user = userEvent.setup()
    renderIt(storage)
    await screen.findByText(/尚無牌組/)
    await user.click(screen.getByRole('button', { name: '新增牌組' }))
    await user.type(screen.getByLabelText('牌組名稱'), 'TOEIC')
    await user.click(screen.getByRole('button', { name: '建立' }))
    expect(await screen.findByText('TOEIC')).toBeInTheDocument()
  })

  it('shows an enabled import entry point', async () => {
    renderIt(storage)
    const btn = await screen.findByRole('button', { name: /匯入牌組/ })
    expect(btn).toBeEnabled()
  })

  it('deletes a deck after confirming the warning', async () => {
    const user = userEvent.setup()
    renderIt(storage)
    await screen.findByText(/尚無牌組/)
    await user.click(screen.getByRole('button', { name: '新增牌組' }))
    await user.type(screen.getByLabelText('牌組名稱'), '測試牌組')
    await user.click(screen.getByRole('button', { name: '建立' }))
    await screen.findByText('測試牌組')

    await user.click(screen.getByRole('button', { name: '刪除牌組 測試牌組' }))
    expect(screen.getByRole('dialog', { name: '刪除牌組確認' })).toHaveTextContent(/無法復原/)
    await user.click(screen.getByRole('button', { name: '刪除' }))

    expect(await screen.findByText(/尚無牌組/)).toBeInTheDocument()
    expect(await storage.listDecks()).toHaveLength(0)
  })

  it('cancelling the delete dialog keeps the deck', async () => {
    const user = userEvent.setup()
    renderIt(storage)
    await screen.findByText(/尚無牌組/)
    await user.click(screen.getByRole('button', { name: '新增牌組' }))
    await user.type(screen.getByLabelText('牌組名稱'), '留下來')
    await user.click(screen.getByRole('button', { name: '建立' }))
    await screen.findByText('留下來')

    await user.click(screen.getByRole('button', { name: '刪除牌組 留下來' }))
    await user.click(screen.getByRole('button', { name: '取消' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('留下來')).toBeInTheDocument()
    expect(await storage.listDecks()).toHaveLength(1)
  })
})
