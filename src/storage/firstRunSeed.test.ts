import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { IndexedDBStorage } from './indexedDBStorage'
import { seedIfFirstRun } from './firstRunSeed'
import { BUILTIN_FAVORITE_ID, BUILTIN_STAR_ID } from '@/types/tag'

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

describe('seedIfFirstRun', () => {
  let storage: IndexedDBStorage

  beforeEach(async () => {
    storage = await freshStorage(null)
  })

  afterEach(async () => {
    await storage.close()
  })

  it('seeds built-in tags on first run', async () => {
    await seedIfFirstRun(storage)
    const tags = await storage.listTags()
    const ids = tags.map(t => t.id).sort()
    expect(ids).toContain(BUILTIN_FAVORITE_ID)
    expect(ids).toContain(BUILTIN_STAR_ID)
  })

  it('marks meta.firstRunCompleted = true', async () => {
    await seedIfFirstRun(storage)
    expect(await storage.getMeta<boolean>('firstRunCompleted')).toBe(true)
  })

  it('does not re-seed on second run', async () => {
    await seedIfFirstRun(storage)
    // Rename a built-in tag to prove the second run doesn't overwrite it
    await storage.saveTag({
      id: BUILTIN_FAVORITE_ID,
      name: 'Renamed',
      icon: '❤️',
      builtIn: true,
      createdAt: 1,
    })
    await seedIfFirstRun(storage)
    const tag = await storage.getTag(BUILTIN_FAVORITE_ID)
    expect(tag?.name).toBe('Renamed')
  })

  it('is idempotent: concurrent calls do not duplicate tags', async () => {
    await Promise.all([seedIfFirstRun(storage), seedIfFirstRun(storage)])
    const favorites = (await storage.listTags()).filter(t => t.id === BUILTIN_FAVORITE_ID)
    expect(favorites.length).toBe(1)
  })
})
