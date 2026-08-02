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

  it('shows an enabled import entry point', async () => {
    renderIt(storage)
    const btn = await screen.findByRole('button', { name: /匯入測驗/ })
    expect(btn).toBeEnabled()
  })

  it('imports a grammar quiz bundle from JSON', async () => {
    const user = userEvent.setup()
    renderIt(storage)
    await screen.findByText(/尚無測驗/)

    const bundle = {
      format: 'english-app-grammar-quiz',
      version: 1,
      data: {
        id: 'src',
        name: '多益文法 Part 5 精選',
        language: 'en',
        questions: [
          {
            id: 'q1',
            type: 'multiple_choice',
            prompt: 'The report is due ___ Friday.',
            options: ['by', 'until', 'in', 'at'],
            correctIndex: 0,
            explanation: 'by + 期限',
            tags: [],
            stats: { correctCount: 0, incorrectCount: 0, lastReviewedAt: null },
          },
        ],
        tags: [],
        createdAt: 1,
        updatedAt: 1,
      },
      tags: [],
    }
    const file = new File([JSON.stringify(bundle)], 'quiz.json', { type: 'application/json' })
    await user.upload(screen.getByLabelText('選擇測驗 JSON 檔'), file)

    expect(await screen.findByRole('dialog', { name: '匯入測驗預覽' })).toBeInTheDocument()
    expect(screen.getByText(/多益文法 Part 5 精選 · 1 題/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '確認匯入' }))

    expect(await screen.findByText('多益文法 Part 5 精選')).toBeInTheDocument()
    const saved = await storage.listQuizzes()
    expect(saved).toHaveLength(1)
    expect(saved[0].id).not.toBe('src')
    const q = saved[0].questions[0]
    expect(q.type).toBe('multiple_choice')
    expect(q.type === 'multiple_choice' && q.options).toHaveLength(4)
  })

  it('rejects a non-quiz JSON without touching storage', async () => {
    const user = userEvent.setup()
    renderIt(storage)
    await screen.findByText(/尚無測驗/)
    const file = new File([JSON.stringify({ format: 'english-app-vocab-deck', version: 1 })], 'x.json', {
      type: 'application/json',
    })
    await user.upload(screen.getByLabelText('選擇測驗 JSON 檔'), file)

    expect(await screen.findByRole('alert')).toHaveTextContent(/不支援的檔案格式/)
    expect(await storage.listQuizzes()).toHaveLength(0)
  })
})
