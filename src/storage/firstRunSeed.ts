import type { IStorage } from './IStorage'
import { BUILTIN_FAVORITE_ID, BUILTIN_STAR_ID } from '@/types/tag'

const FIRST_RUN_KEY = 'firstRunCompleted'

export async function seedIfFirstRun(storage: IStorage): Promise<void> {
  const done = await storage.getMeta<boolean>(FIRST_RUN_KEY)
  if (done === true) return

  const now = Date.now()

  // saveTag is an upsert, so concurrent calls converge on the same state.
  await storage.saveTag({
    id: BUILTIN_FAVORITE_ID,
    name: '我的最愛',
    icon: '❤️',
    builtIn: true,
    createdAt: now,
  })
  await storage.saveTag({
    id: BUILTIN_STAR_ID,
    name: '星號',
    icon: '⭐',
    builtIn: true,
    createdAt: now,
  })

  await storage.setMeta(FIRST_RUN_KEY, true)
}
