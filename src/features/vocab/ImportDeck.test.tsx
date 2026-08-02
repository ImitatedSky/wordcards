import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { StorageProvider } from '@/storage/StorageProvider'
import { IndexedDBStorage } from '@/storage/indexedDBStorage'
import { DeckList } from './DeckList'
import { newDeck, newCard } from './factories'
import { nextAvailableName, validateDeckBundle } from './importHelpers'

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

function bundleFile(over: Record<string, unknown> = {}, name = 'C5 · Test Deck'): File {
  const bundle = {
    format: 'english-app-vocab-deck',
    version: 1,
    data: {
      id: 'src-id',
      name,
      language: { front: 'en', back: 'zh' },
      cards: [
        {
          id: 'c1',
          front: 'Circumscribe (v.)',
          back: '限制',
          tags: [],
          stats: { correctCount: 3, incorrectCount: 1, lastReviewedAt: 123 },
        },
        {
          id: 'c2',
          front: 'Settle (v.)',
          back: '解決',
          tags: [],
          stats: { correctCount: 0, incorrectCount: 0, lastReviewedAt: null },
        },
      ],
      tags: [],
      createdAt: 1,
      updatedAt: 1,
    },
    tags: [],
    ...over,
  }
  return new File([JSON.stringify(bundle)], 'deck.json', { type: 'application/json' })
}

async function upload(file: File) {
  const user = userEvent.setup()
  const input = screen.getByLabelText('選擇牌組檔案（JSON、CSV、Excel 或 Markdown）')
  await user.upload(input, file)
  return user
}

// v1 legacy header (no antonyms column) — import must keep accepting it.
const CSV_HEADER =
  'book,passage,headword,pos,meaning_zh,definition_zh,synonyms,pos_variations,confusables,example_en,pronunciation,tags'

const CSV_HEADER_V2 =
  'book,passage,headword,pos,meaning_zh,definition_zh,synonyms,antonyms,pos_variations,confusables,example_en,pronunciation,tags'

const CSV_HEADER_V3 =
  'book,passage,headword,pos,meaning_zh,definition_zh,etymology,synonyms,antonyms,pos_variations,confusables,example_en,pronunciation,tags'

function csvFile(lines: string[], name = 'vocab.csv'): File {
  return new File([[CSV_HEADER, ...lines].join('\r\n')], name, { type: 'text/csv' })
}

describe('ImportDeck helpers', () => {
  it('validates format marker and version', () => {
    expect(validateDeckBundle({ format: 'nope' }).ok).toBe(false)
    expect(validateDeckBundle({ format: 'english-app-vocab-deck', version: 2 }).ok).toBe(false)
    expect(
      validateDeckBundle({
        format: 'english-app-vocab-deck',
        version: 1,
        data: { name: 'x', cards: [] },
      }).ok,
    ).toBe(true)
  })

  it('picks the next available suffixed name', () => {
    const names = new Set(['A', 'A (2)'])
    expect(nextAvailableName('B', names)).toBe('B')
    expect(nextAvailableName('A', names)).toBe('A (3)')
  })
})

describe('ImportDeck', () => {
  let storage: IndexedDBStorage

  beforeEach(async () => {
    storage = await freshStorage(null)
  })

  afterEach(async () => {
    await storage.close()
  })

  it('shows a preview for a valid file and imports on confirm', async () => {
    renderIt(storage)
    await screen.findByText(/尚無牌組/)
    const user = await upload(bundleFile())

    expect(await screen.findByRole('dialog', { name: '匯入預覽' })).toBeInTheDocument()
    expect(screen.getByText(/C5 · Test Deck · 2 張單字卡/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '確認匯入' }))
    expect(await screen.findByText('C5 · Test Deck')).toBeInTheDocument()

    const decks = await storage.listDecks()
    expect(decks).toHaveLength(1)
    expect(decks[0].id).not.toBe('src-id') // fresh deck id
    expect(decks[0].cards.map((c) => c.id)).not.toContain('c1') // fresh card ids
    expect(decks[0].cards[0].stats.correctCount).toBe(3) // stats preserved
  })

  it('rejects a wrong-format file without touching storage', async () => {
    renderIt(storage)
    await screen.findByText(/尚無牌組/)
    await upload(bundleFile({ format: 'other-app' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/不支援的檔案格式/)
    expect(await storage.listDecks()).toHaveLength(0)
  })

  it('rejects invalid JSON with a readable error', async () => {
    renderIt(storage)
    await screen.findByText(/尚無牌組/)
    await upload(new File(['{not json'], 'bad.json', { type: 'application/json' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/不是有效的 JSON/)
    expect(await storage.listDecks()).toHaveLength(0)
  })

  it('cancel leaves storage untouched', async () => {
    renderIt(storage)
    await screen.findByText(/尚無牌組/)
    const user = await upload(bundleFile())
    await screen.findByRole('dialog', { name: '匯入預覽' })

    await user.click(screen.getByRole('button', { name: '取消' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await storage.listDecks()).toHaveLength(0)
  })

  it('replace deletes the existing deck after a data-loss warning', async () => {
    const existing = newDeck({ name: 'C5 · Test Deck' })
    existing.cards.push(newCard({ front: 'old', back: '舊' }))
    await storage.saveDeck(existing)

    renderIt(storage)
    await screen.findByText('C5 · Test Deck')
    const user = await upload(bundleFile())

    expect(await screen.findByText(/將刪除原牌組的 1 張卡片與其練習統計/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '取代' }))

    await waitFor(async () => {
      const decks = await storage.listDecks()
      expect(decks).toHaveLength(1)
      expect(decks[0].id).not.toBe(existing.id)
      expect(decks[0].cards).toHaveLength(2)
    })
  })

  it('imports a CSV with two passages as two decks', async () => {
    renderIt(storage)
    await screen.findByText(/尚無牌組/)
    const user = await upload(
      csvFile([
        'C5,Alpha,Circumscribe,v.,限制,字根 circum-,Restrict (v.) 限制 | Limit (v.) 限制,,,The power was circumscribed.,,',
        'C5,Alpha,Settle,v.,解決,,,,,She settled the dispute.,,',
        'C10,Beta,Fundamental,adj.,基礎的,,,,,Water is fundamental.,,',
      ]),
    )

    expect(await screen.findByRole('dialog', { name: 'CSV 匯入預覽' })).toBeInTheDocument()
    expect(screen.getByText('C5 · Alpha')).toBeInTheDocument()
    expect(screen.getByText('C10 · Beta')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '確認匯入' }))
    await waitFor(async () => {
      const decks = await storage.listDecks()
      expect(decks).toHaveLength(2)
    })
    const decks = await storage.listDecks()
    const alpha = decks.find((d) => d.name === 'C5 · Alpha')
    expect(alpha?.cards).toHaveLength(2)
    expect(alpha?.cards[0].front).toBe('Circumscribe (v.)')
    expect(alpha?.cards[0].notes).toContain('【同義詞】\nRestrict (v.) 限制\nLimit (v.) 限制')
  })

  it('imports a multi-sheet Excel workbook as one deck per sheet', async () => {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    const mkRows = (book: string, words: string[]) => [
      CSV_HEADER.split(','),
      ...words.map((w) => [book, '', w, 'n.', `${w}中文`, '', '', '', '', '', '', '']),
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(mkRows('LV1', ['alpha', 'beta'])), 'LV1')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(mkRows('LV2', ['gamma'])), 'LV2')
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
    const file = new File([buf], 'levels.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    renderIt(storage)
    await screen.findByText(/尚無牌組/)
    const user = await upload(file)

    expect(await screen.findByRole('dialog', { name: 'CSV 匯入預覽' })).toBeInTheDocument()
    expect(screen.getByText('LV1')).toBeInTheDocument()
    expect(screen.getByText('LV2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '確認匯入' }))
    await waitFor(async () => {
      const saved = await storage.listDecks()
      expect(saved).toHaveLength(2)
    })
    const saved = await storage.listDecks()
    expect(saved.find((d) => d.name === 'LV1')?.cards).toHaveLength(2)
    expect(saved.find((d) => d.name === 'LV2')?.cards[0].front).toBe('gamma (n.)')
  })

  it('accepts the v2 header and renders antonyms into notes', async () => {
    renderIt(storage)
    await screen.findByText(/尚無牌組/)
    const user = await upload(
      new File(
        [
          [
            CSV_HEADER_V2,
            'LV6,,abundant,adj.,豐富的,,plentiful (adj.) 充足的,scarce (adj.) 稀少的,,,Fish are abundant in the lake.,,',
          ].join('\r\n'),
        ],
        'v2.csv',
        { type: 'text/csv' },
      ),
    )
    await user.click(await screen.findByRole('button', { name: '確認匯入' }))
    await waitFor(async () => expect(await storage.listDecks()).toHaveLength(1))
    const [deck] = await storage.listDecks()
    expect(deck.cards[0].notes).toContain('【反義詞】\nscarce (adj.) 稀少的')
    expect(deck.cards[0].example).toBe('Fish are abundant in the lake.')
  })

  it('accepts the v3 header and renders etymology into notes', async () => {
    renderIt(storage)
    await screen.findByText(/尚無牌組/)
    const user = await upload(
      new File(
        [
          [
            CSV_HEADER_V3,
            'LV6,,ascend,v.,上升,,a-(朝向) + scend(攀爬) → 向上爬,climb (v.) 攀登,descend (v.) 下降,,,The hikers ascended the trail.,,',
          ].join('\r\n'),
        ],
        'v3.csv',
        { type: 'text/csv' },
      ),
    )
    await user.click(await screen.findByRole('button', { name: '確認匯入' }))
    await waitFor(async () => expect(await storage.listDecks()).toHaveLength(1))
    const [deck] = await storage.listDecks()
    expect(deck.cards[0].notes).toContain('【字根字首】\na-(朝向) + scend(攀爬) → 向上爬')
    expect(deck.cards[0].notes?.indexOf('【字根字首】')).toBeLessThan(
      deck.cards[0].notes!.indexOf('【同義詞】'),
    )
  })

  it('imports a Markdown table, unescaping \\| inside list cells', async () => {
    const md = [
      '# 我的單字',
      '',
      '一些說明文字。',
      '',
      `| ${CSV_HEADER_V2.split(',').join(' | ')} |`,
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
      '| LV6 |  | abide | v. | 遵守 |  | obey (v.) 遵守 \\| comply (v.) 順從 | violate (v.) 違反 |  |  | All members must abide by the rules. |  |  |',
      '',
      '表格後的文字。',
    ].join('\n')
    renderIt(storage)
    await screen.findByText(/尚無牌組/)
    const user = await upload(new File([md], 'words.md', { type: 'text/markdown' }))

    expect(await screen.findByRole('dialog', { name: 'CSV 匯入預覽' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '確認匯入' }))
    await waitFor(async () => expect(await storage.listDecks()).toHaveLength(1))
    const [deck] = await storage.listDecks()
    expect(deck.name).toBe('LV6')
    expect(deck.cards[0].notes).toContain('【同義詞】\nobey (v.) 遵守\ncomply (v.) 順從')
    expect(deck.cards[0].notes).toContain('【反義詞】\nviolate (v.) 違反')
  })

  it('names the offending table when a Markdown file has a bad second table', async () => {
    const good = `| ${CSV_HEADER_V2.split(',').join(' | ')} |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n| LV1 |  | apple | n. | 蘋果 |  |  |  |  |  |  |  |  |`
    const bad = '| a | b |\n| --- | --- |\n| x | y |'
    renderIt(storage)
    await screen.findByText(/尚無牌組/)
    await upload(new File([`${good}\n\n${bad}`], 'words.md', { type: 'text/markdown' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/表格 2.*表頭不符/)
    expect(await storage.listDecks()).toHaveLength(0)
  })

  it('rejects a CSV with a wrong column count, naming the row', async () => {
    renderIt(storage)
    await screen.findByText(/尚無牌組/)
    await upload(csvFile(['C5,only,three']))

    expect(await screen.findByRole('alert')).toHaveTextContent(/第 2 列欄位數錯誤/)
    expect(await storage.listDecks()).toHaveLength(0)
  })

  it('rejects a CSV with a wrong header without touching storage', async () => {
    renderIt(storage)
    await screen.findByText(/尚無牌組/)
    await upload(new File(['a,b,c\r\nx,y,z'], 'bad.csv', { type: 'text/csv' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/表頭不符固定規格/)
    expect(await storage.listDecks()).toHaveLength(0)
  })

  it('CSV duplicate names: replace deletes only the collided deck', async () => {
    const existing = newDeck({ name: 'C5 · Alpha' })
    existing.cards.push(newCard({ front: 'old', back: '舊' }))
    await storage.saveDeck(existing)

    renderIt(storage)
    await screen.findByText('C5 · Alpha')
    const user = await upload(
      csvFile([
        'C5,Alpha,Circumscribe,v.,限制,,,,,,,',
        'C10,Beta,Fundamental,adj.,基礎的,,,,,,,',
      ]),
    )

    expect(await screen.findByText(/1 副牌組與現有牌組同名/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '取代同名' }))

    await waitFor(async () => {
      const decks = await storage.listDecks()
      expect(decks).toHaveLength(2)
      const alpha = decks.find((d) => d.name === 'C5 · Alpha')
      expect(alpha?.id).not.toBe(existing.id)
      expect(alpha?.cards).toHaveLength(1)
      expect(alpha?.cards[0].front).toBe('Circumscribe (v.)')
    })
  })

  it('CSV duplicate names: keep-both suffixes the collided deck', async () => {
    const existing = newDeck({ name: 'C5 · Alpha' })
    await storage.saveDeck(existing)

    renderIt(storage)
    await screen.findByText('C5 · Alpha')
    const user = await upload(csvFile(['C5,Alpha,Circumscribe,v.,限制,,,,,,,']))
    await user.click(await screen.findByRole('button', { name: '全部另存新名' }))

    expect(await screen.findByText('C5 · Alpha (2)')).toBeInTheDocument()
    const decks = await storage.listDecks()
    expect(decks).toHaveLength(2)
    expect(decks.find((d) => d.id === existing.id)?.name).toBe('C5 · Alpha')
  })

  it('keep-both saves under a suffixed name and leaves the original untouched', async () => {
    const existing = newDeck({ name: 'C5 · Test Deck' })
    await storage.saveDeck(existing)

    renderIt(storage)
    await screen.findByText('C5 · Test Deck')
    const user = await upload(bundleFile())
    await user.click(await screen.findByRole('button', { name: '另存新名' }))

    expect(await screen.findByText('C5 · Test Deck (2)')).toBeInTheDocument()
    const decks = await storage.listDecks()
    expect(decks).toHaveLength(2)
    const original = decks.find((d) => d.id === existing.id)
    expect(original?.name).toBe('C5 · Test Deck')
  })
})
