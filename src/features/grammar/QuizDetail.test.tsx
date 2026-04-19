import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { StorageProvider } from '@/storage/StorageProvider'
import { IndexedDBStorage } from '@/storage/indexedDBStorage'
import { QuizDetail } from './QuizDetail'
import { newQuiz } from './factories'

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

async function seedQuiz(storage: IndexedDBStorage, name = 'TestQuiz') {
  const q = newQuiz({ name })
  await storage.saveQuiz(q)
  return q.id
}

function renderIt(storage: IndexedDBStorage, quizId: string) {
  return render(
    <MemoryRouter>
      <StorageProvider storage={storage}>
        <QuizDetail quizId={quizId} />
      </StorageProvider>
    </MemoryRouter>,
  )
}

describe('QuizDetail', () => {
  let storage: IndexedDBStorage

  beforeEach(async () => {
    storage = await freshStorage(null)
  })

  afterEach(async () => {
    await storage.close()
  })

  it('renders the quiz header and empty question state', async () => {
    const id = await seedQuiz(storage)
    renderIt(storage, id)
    expect(await screen.findByRole('heading', { name: 'TestQuiz' })).toBeInTheDocument()
    expect(screen.getByText('這個測驗還沒有題目。')).toBeInTheDocument()
  })

  it('adds an MC question via the editor', async () => {
    const user = userEvent.setup()
    const id = await seedQuiz(storage)
    renderIt(storage, id)
    await screen.findByRole('heading', { name: 'TestQuiz' })
    await user.click(screen.getByRole('button', { name: '新增題目' }))
    await user.type(screen.getByLabelText('題目'), 'She ___ to school.')
    const opts = screen.getAllByLabelText(/^選項 \d+$/)
    await user.type(opts[0], 'go')
    await user.type(opts[1], 'goes')
    await user.click(screen.getAllByLabelText('此為正解')[1])
    await user.click(screen.getByRole('button', { name: '儲存' }))
    expect(await screen.findByText('She ___ to school.')).toBeInTheDocument()
    expect(screen.getByText(/正解：goes/)).toBeInTheDocument()
  })

  it('adds a FIB question via the editor', async () => {
    const user = userEvent.setup()
    const id = await seedQuiz(storage)
    renderIt(storage, id)
    await screen.findByRole('heading', { name: 'TestQuiz' })
    await user.click(screen.getByRole('button', { name: '新增題目' }))
    await user.click(screen.getByLabelText('填空'))
    await user.type(screen.getByLabelText('題目'), 'The sky ___ blue.')
    await user.type(screen.getByLabelText('答案 1'), 'is')
    await user.click(screen.getByRole('button', { name: '儲存' }))
    expect(await screen.findByText('The sky ___ blue.')).toBeInTheDocument()
    expect(screen.getByText(/答案：is/)).toBeInTheDocument()
  })

  it('deletes a question', async () => {
    const user = userEvent.setup()
    const id = await seedQuiz(storage)
    renderIt(storage, id)
    await screen.findByRole('heading', { name: 'TestQuiz' })
    await user.click(screen.getByRole('button', { name: '新增題目' }))
    await user.click(screen.getByLabelText('填空'))
    await user.type(screen.getByLabelText('題目'), 'p')
    await user.type(screen.getByLabelText('答案 1'), 'a')
    await user.click(screen.getByRole('button', { name: '儲存' }))
    await screen.findByText('p')
    await user.click(screen.getByRole('button', { name: '刪除' }))
    expect(screen.queryByText('p')).not.toBeInTheDocument()
  })

  it('disables Start Quiz when the quiz has no questions', async () => {
    const id = await seedQuiz(storage)
    renderIt(storage, id)
    await screen.findByRole('heading', { name: 'TestQuiz' })
    expect(screen.getByRole('link', { name: /開始測驗/ })).toHaveAttribute('aria-disabled', 'true')
  })
})
