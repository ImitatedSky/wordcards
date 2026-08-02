import { describe, it, expect } from 'vitest'
import { buildDecks, buildLibrary, bundleDeck, MANIFEST_FORMAT } from './build-default-library.mjs'

const sources = (over = {}) => ({
  six: [
    { Word: 'banana', PartsOfSpeech: ['n.'], Level: '1' },
    { Word: 'Apple', PartsOfSpeech: ['n.'], Level: '1' },
    { Word: 'run', PartsOfSpeech: ['v.', 'n.'], Level: '2' },
  ],
  meanings: { banana: '香蕉', apple: '蘋果', run: '跑' },
  enrich: { apple: { syn: 'Fruit (n.) 水果', ex: 'An apple a day.' } },
  supplement: [{ word: 'yonder', pos: 'adv.', zh: '在那邊' }],
  toeic: [{ word: 'invoice', pos: 'n.', zh: '發票' }],
  ...over,
})

describe('buildDecks', () => {
  it('derives deterministic card ids from deck id + lowercased headword', () => {
    const decks = buildDecks(sources())
    const lv1 = decks.find((d) => d.id === 'default-lv1')
    expect(lv1.cards.map((c) => c.id)).toEqual(['default-lv1:apple', 'default-lv1:banana'])
    expect(decks.find((d) => d.id === 'default-toeic-1000').cards[0].id).toBe(
      'default-toeic-1000:invoice',
    )
  })

  it('sorts cards A→Z and formats front as "word (pos)"', () => {
    const lv1 = buildDecks(sources()).find((d) => d.id === 'default-lv1')
    expect(lv1.cards.map((c) => c.front)).toEqual(['Apple (n.)', 'banana (n.)'])
    expect(lv1.cards[0].back).toBe('蘋果')
  })

  it('merges enrichment into example and notes', () => {
    const apple = buildDecks(sources())
      .find((d) => d.id === 'default-lv1')
      .cards.find((c) => c.id === 'default-lv1:apple')
    expect(apple.example).toBe('An apple a day.')
    expect(apple.notes).toContain('【同義詞】')
    expect(apple.notes).toContain('Fruit (n.) 水果')
  })

  it('throws on case-insensitive duplicate headwords within a deck', () => {
    const dup = sources({
      six: [
        { Word: 'internet', PartsOfSpeech: ['n.'], Level: '2' },
        { Word: 'Internet', PartsOfSpeech: ['n.'], Level: '2' },
      ],
      meanings: { internet: '網路' },
    })
    expect(() => buildDecks(dup)).toThrow(/default-lv2.*internet/)
  })

  it('throws when a word has no meaning entry', () => {
    expect(() => buildDecks(sources({ meanings: { apple: '蘋果', run: '跑' } }))).toThrow(
      /missing meaning for banana/,
    )
  })
})

describe('bundleDeck', () => {
  it('emits an english-app-vocab-deck bundle with zeroed timestamps', () => {
    const deck = buildDecks(sources())[0]
    const bundle = bundleDeck(deck)
    expect(bundle.format).toBe('english-app-vocab-deck')
    expect(bundle.version).toBe(1)
    expect(bundle.data.createdAt).toBe(0)
    expect(bundle.data.updatedAt).toBe(0)
    expect(bundle.data.language).toEqual({ front: 'en', back: 'zh' })
  })
})

describe('buildLibrary', () => {
  it('is deterministic: same sources produce identical files and version', () => {
    const a = buildLibrary(sources())
    const b = buildLibrary(sources())
    expect(a.manifest).toEqual(b.manifest)
    expect(a.files).toEqual(b.files)
  })

  it('changes the manifest version when any word content changes', () => {
    const a = buildLibrary(sources())
    const b = buildLibrary(sources({ meanings: { banana: '香蕉！', apple: '蘋果', run: '跑' } }))
    expect(b.manifest.version).not.toBe(a.manifest.version)
  })

  it('lists every non-empty deck with id, file, name and cardCount', () => {
    const { manifest } = buildLibrary(sources())
    expect(manifest.format).toBe(MANIFEST_FORMAT)
    // LV1, LV2, supplement, toeic — empty levels are skipped
    expect(manifest.decks.map((d) => d.id)).toEqual([
      'default-lv1',
      'default-lv2',
      'default-supplement-7000',
      'default-toeic-1000',
    ])
    const lv1 = manifest.decks.find((d) => d.id === 'default-lv1')
    expect(lv1).toEqual({ id: 'default-lv1', file: 'lv1.json', name: '高中7000 LV1', cardCount: 2 })
  })
})
