import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { StorageProvider } from '@/storage/StorageProvider'
import { IndexedDBStorage } from '@/storage/indexedDBStorage'
import { QuizSession } from './QuizSession'
import { newQuiz, newMcQuestion, newFibQuestion } from '../factories'

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

describe('QuizSession', () => {
  let storage: IndexedDBStorage

  beforeEach(async () => {
    storage = await freshStorage(null)
  })

  afterEach(async () => {
    await storage.close()
  })

  async function seedMixedQuiz() {
    const quiz = newQuiz({ name: 'Q' })
    quiz.questions = [
      newMcQuestion({ prompt: 'mc prompt', options: ['a', 'b'], correctIndex: 1 }),
      newFibQuestion({ prompt: 'fib prompt', answers: ['hello'] }),
    ]
    await storage.saveQuiz(quiz)
    return quiz.id
  }

  function renderAt(quizId: string) {
    return render(
      <MemoryRouter>
        <StorageProvider storage={storage}>
          <QuizSession quizId={quizId} />
        </StorageProvider>
      </MemoryRouter>,
    )
  }

  it('shows the pre-session options and starts a session', async () => {
    const user = userEvent.setup()
    const id = await seedMixedQuiz()
    renderAt(id)
    expect(await screen.findByRole('heading', { name: '測驗設定' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '開始' }))
    expect(await screen.findByText('mc prompt')).toBeInTheDocument()
  })

  it('runs through MC + FIB to finished and shows results', async () => {
    const user = userEvent.setup()
    const id = await seedMixedQuiz()
    renderAt(id)
    await screen.findByRole('heading', { name: '測驗設定' })
    const shuffle = screen.getByLabelText('隨機出題') as HTMLInputElement
    if (shuffle.checked) await user.click(shuffle)
    await user.click(screen.getByRole('button', { name: '100%' })) // run all questions
    await user.click(screen.getByRole('button', { name: '開始' }))

    await screen.findByText('mc prompt')
    await user.click(screen.getByRole('button', { name: 'b' }))
    await user.click(screen.getByRole('button', { name: '下一題' }))

    await screen.findByText('fib prompt')
    await user.type(screen.getByLabelText('填入答案'), 'hello')
    await user.click(screen.getByRole('button', { name: '送出' }))
    await user.click(screen.getByRole('button', { name: '下一題' }))

    expect(await screen.findByRole('heading', { name: '本次結果' })).toBeInTheDocument()
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
  })
})
