export const CLOZE_BLANK = '____'

/** Inflected forms of a headword we can spot inside an example sentence. */
function formsOf(word: string): string[] {
  const w = word.toLowerCase()
  const forms = [w, `${w}s`, `${w}es`, `${w}ed`, `${w}d`, `${w}ing`]
  if (w.endsWith('y')) forms.push(`${w.slice(0, -1)}ies`, `${w.slice(0, -1)}ied`)
  if (w.endsWith('e')) forms.push(`${w.slice(0, -1)}ing`)
  const last = w.at(-1)
  if (last) forms.push(`${w}${last}ing`, `${w}${last}ed`) // run → running
  return forms
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export type ClozeBlank = {
  /** Sentence with the headword replaced by CLOZE_BLANK. */
  blanked: string
  /** The exact form that was removed (may be inflected, e.g. "studies"). */
  answer: string
}

/**
 * Blank out the headword (or a simple inflected form) in the example sentence.
 * Returns null when the word can't be located — callers should fall back to
 * another question type for that card.
 */
export function blankExample(example: string, headword: string): ClozeBlank | null {
  const head = headword.trim()
  if (!head || !example.trim()) return null
  // Multi-word headwords ("fill out", "dress code") match as a phrase only.
  const candidates = head.includes(' ') ? [head.toLowerCase()] : formsOf(head)
  candidates.sort((a, b) => b.length - a.length) // longest-first: "studies" before "study"
  for (const form of candidates) {
    const match = new RegExp(`\\b${escapeRegExp(form)}\\b`, 'i').exec(example)
    if (match) {
      return {
        blanked:
          example.slice(0, match.index) + CLOZE_BLANK + example.slice(match.index + match[0].length),
        answer: match[0],
      }
    }
  }
  return null
}
