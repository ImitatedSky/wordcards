import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { StorageProvider } from '@/storage/StorageProvider'
import { IndexedDBStorage } from '@/storage/indexedDBStorage'
import { QuizList } from './QuizList'

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
        <QuizList />
      </StorageProvider>
    </MemoryRouter>,
  )
}

describe('QuizList', () => {
  let storage: IndexedDBStorage

  beforeEach(async () => {
    storage = await freshStorage(null)
  })

  afterEach(async () => {
    await storage.close()
  })

  it('shows the empty state when there are no quizzes', async () => {
    renderIt(storage)
    expect(await screen.findByText(/尚無測驗/)).toBeInTheDocument()
  })

  it('creates a quiz and shows it in the list', async () => {
    const user = userEvent.setup()
    renderIt(storage)
    await screen.findByText(/尚無測驗/)
    await user.click(screen.getByRole('button', { name: '新增測驗' }))
    await user.type(screen.getByLabelText('測驗名稱'), 'Present Simple')
    await user.click(screen.getByRole('button', { name: '建立' }))
    expect(await screen.findByText('Present Simple')).toBeInTheDocument()
  })

  it('shows the import button as disabled with a tooltip', async () => {
    renderIt(storage)
    const btn = await screen.findByRole('button', { name: /匯入/ })
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('title')
  })
})
