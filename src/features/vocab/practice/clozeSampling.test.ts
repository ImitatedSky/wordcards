import { describe, expect, it } from 'vitest'
import { blankExample, CLOZE_BLANK } from './clozeSampling'

describe('blankExample', () => {
  it('blanks the exact headword', () => {
    const result = blankExample('She achieved her goal of running a marathon.', 'goal')
    expect(result).not.toBeNull()
    expect(result!.blanked).toBe(`She achieved her ${CLOZE_BLANK} of running a marathon.`)
    expect(result!.answer).toBe('goal')
  })

  it('matches case-insensitively at sentence start', () => {
    const result = blankExample('Bees buzzed around the flowers.', 'bee')
    expect(result).not.toBeNull()
    expect(result!.answer).toBe('Bees')
    expect(result!.blanked).toBe(`${CLOZE_BLANK} buzzed around the flowers.`)
  })

  it('matches simple inflections (y → ies)', () => {
    const result = blankExample('She studies law at the university.', 'study')
    expect(result).not.toBeNull()
    expect(result!.answer).toBe('studies')
  })

  it('matches -ing form with dropped e', () => {
    const result = blankExample('They are making dumplings tonight.', 'make')
    expect(result).not.toBeNull()
    expect(result!.answer).toBe('making')
  })

  it('matches multi-word headwords as a phrase', () => {
    const result = blankExample('Please fill out the customs form.', 'fill out')
    expect(result).not.toBeNull()
    expect(result!.blanked).toBe(`Please ${CLOZE_BLANK} the customs form.`)
  })

  it('returns null when the word is absent from the sentence', () => {
    expect(blankExample('The weather is lovely today.', 'ocean')).toBeNull()
  })

  it('returns null for an empty example', () => {
    expect(blankExample('', 'goal')).toBeNull()
  })

  it('does not blank a substring inside another word', () => {
    // "art" must not match inside "start"
    expect(blankExample('The show will start soon.', 'art')).toBeNull()
  })
})
