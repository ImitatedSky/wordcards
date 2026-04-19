import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagManager } from './TagManager'
import { StorageProvider } from '@/storage/StorageProvider'
import { IndexedDBStorage } from '@/storage/indexedDBStorage'
import { seedIfFirstRun } from '@/storage/firstRunSeed'

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
  await seedIfFirstRun(s)
  return s
}

function renderWithStorage(storage: IndexedDBStorage) {
  return render(
    <StorageProvider storage={storage}>
      <TagManager />
    </StorageProvider>,
  )
}

describe('TagManager', () => {
  let storage: IndexedDBStorage

  beforeEach(async () => {
    storage = await freshStorage(null)
  })

  afterEach(async () => {
    await storage.close()
  })

  it('shows built-in tags after seed', async () => {
    renderWithStorage(storage)
    expect(await screen.findByText('我的最愛')).toBeInTheDocument()
    expect(await screen.findByText('星號')).toBeInTheDocument()
  })

  it('creates a new tag', async () => {
    const user = userEvent.setup()
    renderWithStorage(storage)
    await screen.findByText('我的最愛')
    await user.type(screen.getByPlaceholderText('新增 tag 名稱'), 'TOEIC')
    await user.click(screen.getByRole('button', { name: '新增' }))
    expect(await screen.findByText('TOEIC')).toBeInTheDocument()
  })

  it('renames a non-built-in tag', async () => {
    const user = userEvent.setup()
    renderWithStorage(storage)
    await screen.findByText('我的最愛')
    await user.type(screen.getByPlaceholderText('新增 tag 名稱'), 'Old')
    await user.click(screen.getByRole('button', { name: '新增' }))
    await screen.findByText('Old')

    const renameButtons = screen.getAllByRole('button', { name: '重新命名' })
    await user.click(renameButtons[renameButtons.length - 1])
    const input = screen.getByLabelText('重新命名 Old')
    await user.clear(input)
    await user.type(input, 'New')
    await user.click(screen.getByRole('button', { name: '儲存' }))
    await waitFor(() => expect(screen.getByText('New')).toBeInTheDocument())
  })

  it('refuses to delete built-in tags (no delete button rendered)', async () => {
    renderWithStorage(storage)
    await screen.findByText('我的最愛')
    expect(screen.queryByRole('button', { name: '刪除 我的最愛' })).toBeNull()
    expect(screen.queryByRole('button', { name: '刪除 星號' })).toBeNull()
  })

  it('deletes a user tag', async () => {
    const user = userEvent.setup()
    renderWithStorage(storage)
    await screen.findByText('我的最愛')
    await user.type(screen.getByPlaceholderText('新增 tag 名稱'), 'Temp')
    await user.click(screen.getByRole('button', { name: '新增' }))
    await screen.findByText('Temp')
    await user.click(screen.getByRole('button', { name: '刪除 Temp' }))
    await waitFor(() => expect(screen.queryByText('Temp')).toBeNull())
  })
})
