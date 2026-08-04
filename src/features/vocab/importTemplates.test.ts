import { describe, expect, it } from 'vitest'
import { csvToDecks, markdownToDecks } from './csvImport'
import { validateDeckBundle } from './importHelpers'
import { deckCsvTemplate, deckJsonTemplate, deckMarkdownTemplate } from './importTemplates'
import { quizJsonTemplate, validateQuizBundle } from '@/features/grammar/quizImportHelpers'

// Templates exist to rescue a failed import — each one must itself import cleanly.
describe('import templates round-trip through their own importers', () => {
  it('CSV template parses into decks', () => {
    const result = csvToDecks(deckCsvTemplate())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.decks).toHaveLength(1)
      expect(result.decks[0].cards).toHaveLength(2)
      expect(result.decks[0].cards[0].front).toContain('abandon')
    }
  })

  it('Markdown template parses into decks (escaped pipes survive)', () => {
    const result = markdownToDecks(deckMarkdownTemplate())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.decks[0].cards).toHaveLength(2)
      // synonyms use "|" separators — they must round-trip through the \| escape
      expect(result.decks[0].cards[0].notes).toContain('desert (v.) 遺棄')
    }
  })

  it('deck JSON template validates as a vocab bundle', () => {
    const result = validateDeckBundle(JSON.parse(deckJsonTemplate()))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.bundle.data.cards).toHaveLength(2)
    }
  })

  it('quiz JSON template validates as a grammar bundle', () => {
    const result = validateQuizBundle(JSON.parse(quizJsonTemplate()))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.bundle.data.questions).toHaveLength(2)
    }
  })

  it('CSV template starts with a UTF-8 BOM for Excel', () => {
    expect(deckCsvTemplate().charCodeAt(0)).toBe(0xfeff)
  })
})
