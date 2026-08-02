import type { IStorage } from './IStorage'
import type { Card, Deck } from '@/types/deck'
import type { VocabDeckExport } from '@/types/import-export'

const VERSION_KEY = 'defaultLibrary.version'
const SEEDED_DECKS_KEY = 'defaultLibrary.seededDecks'

export type DefaultLibraryManifest = {
  format: 'english-app-default-library'
  version: string
  decks: Array<{ id: string; file: string; name: string; cardCount: number }>
}

export type LoadJson = (file: string) => Promise<unknown>

const fetchFromPublic: LoadJson = async (file) => {
  const res = await fetch(`${import.meta.env.BASE_URL}default-library/${file}`)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${file}`)
  return res.json()
}

function isUntouched(card: Card): boolean {
  return (
    card.tags.length === 0 &&
    card.stats.correctCount === 0 &&
    card.stats.incorrectCount === 0 &&
    card.stats.lastReviewedAt === null
  )
}

/**
 * 逐卡合併新版預設牌組:內容欄採新版,tags/stats 保留;新卡插入;
 * 新版移除的卡,未動過才刪(使用者自加的卡沒有 `<deckId>:` 前綴,一律保留)。
 * 牌組層 name/description/tags 不動 — 尊重使用者的改名。
 */
export function mergeDefaultDeck(existing: Deck, incoming: Deck): Deck {
  const prevById = new Map(existing.cards.map((c) => [c.id, c]))
  const incomingIds = new Set(incoming.cards.map((c) => c.id))

  const cards: Card[] = incoming.cards.map((card) => {
    const prev = prevById.get(card.id)
    return prev ? { ...card, tags: prev.tags, stats: prev.stats } : card
  })
  for (const card of existing.cards) {
    if (incomingIds.has(card.id)) continue
    const seededHere = card.id.startsWith(`${existing.id}:`)
    if (!seededHere || !isUntouched(card)) cards.push(card)
  }
  return { ...existing, cards }
}

/**
 * 種入/升級內建預設單字庫。meta `defaultLibrary.version` 與 manifest 不同時執行:
 * 沒種過的牌組整副插入、種過的逐卡合併、使用者刪除過的不復活。
 * 任何失敗都不擋 boot(meta 不更新,下次啟動重試)。
 */
export async function seedDefaultLibrary(
  storage: IStorage,
  loadJson: LoadJson = fetchFromPublic,
): Promise<void> {
  try {
    const manifest = (await loadJson('manifest.json')) as DefaultLibraryManifest
    if (manifest?.format !== 'english-app-default-library' || !manifest.version) {
      throw new Error('unrecognized manifest')
    }

    const currentVersion = await storage.getMeta<string>(VERSION_KEY)
    if (currentVersion === manifest.version) return

    const seeded = new Set((await storage.getMeta<string[]>(SEEDED_DECKS_KEY)) ?? [])
    const existingById = new Map((await storage.listDecks()).map((d) => [d.id, d]))
    const now = Date.now()

    for (const entry of manifest.decks) {
      const existing = existingById.get(entry.id)
      if (seeded.has(entry.id) && !existing) continue // 使用者刪過,不復活

      const bundle = (await loadJson(entry.file)) as VocabDeckExport
      if (bundle?.format !== 'english-app-vocab-deck') {
        throw new Error(`unrecognized bundle in ${entry.file}`)
      }

      if (existing) {
        await storage.saveDeck({ ...mergeDefaultDeck(existing, bundle.data), updatedAt: now })
      } else {
        await storage.saveDeck({ ...bundle.data, createdAt: now, updatedAt: now })
      }
      seeded.add(entry.id)
    }

    await storage.setMeta(SEEDED_DECKS_KEY, [...seeded])
    await storage.setMeta(VERSION_KEY, manifest.version)
  } catch (err) {
    // 離線或資源缺失時照常啟動;version 未更新,下次 boot 自動重試。
    console.warn('[default-library] seed skipped:', err)
  }
}
