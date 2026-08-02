/**
 * Anchor-driven state machine that turns extracted docx lines into
 * structured vocabulary entries. Unclassifiable lines are appended to the
 * current block — never dropped (they surface in `unclassified` for review
 * only when no entry is open yet).
 */

const BOOK_RE = /^C\d+$/
const NUMBERED_PASSAGE_RE = /^[一二三四五六七八九十]+、\s*(.+?)\s*(?:\((\d+\/\d+)\))?\s*$/
const ENTRY_RE = /^(\d+)\.\s*(.+)$/
const HEADWORD_RE = /^([^(（]+?)\s*[（(]([^)）]*)[)）]\s*(.*)$/

const MARKERS = [
  { re: /^精準字義[：:]\s*(.*)$/, section: 'definition', kind: 'text' },
  { re: /^💡.*[：:]\s*(.*)$/, section: 'synonyms', kind: 'list' },
  { re: /^🔄.*[：:]\s*(.*)$/, section: 'pos_variations', kind: 'list' },
  { re: /^⚠️\s*(.*?)[：:]\s*(.*)$/, section: 'confusables', kind: 'list' },
  { re: /^✍️\s*簡單造句[：:]\s*(.*)$/, section: 'example', kind: 'text' },
]

function newEntry(book, passage, rest, lineNo) {
  const entry = {
    book,
    passage,
    headword: '',
    pos: '',
    meaning_zh: '',
    definition: '',
    synonyms: [],
    pos_variations: [],
    confusables: [],
    example: '',
    lineNo,
  }
  const m = rest.match(HEADWORD_RE)
  if (m) {
    entry.headword = m[1].trim()
    entry.pos = m[2].trim()
    entry.meaning_zh = m[3].trim()
  } else {
    entry.headword = rest.trim()
  }
  return entry
}

export function parseEntries(lines) {
  let book = ''
  let passage = ''
  let lastWasBook = false
  let entry = null
  let section = null // { name, kind }
  const entries = []
  const unclassified = []

  const flush = () => {
    if (entry) entries.push(entry)
    entry = null
    section = null
  }

  lines.forEach((raw, i) => {
    const line = raw.trim()
    if (!line) return

    if (BOOK_RE.test(line)) {
      flush()
      book = line
      passage = ''
      lastWasBook = true
      return
    }

    const numbered = line.match(NUMBERED_PASSAGE_RE)
    if (numbered) {
      flush()
      passage = numbered[1].trim()
      lastWasBook = false
      return
    }

    const entryMatch = line.match(ENTRY_RE)
    if (entryMatch) {
      flush()
      entry = newEntry(book, passage, entryMatch[2], i + 1)
      lastWasBook = false
      return
    }

    // A bare line straight after a book heading is a passage title (e.g. C10 → "Stepwells")
    if (lastWasBook) {
      passage = line
      lastWasBook = false
      return
    }

    if (entry) {
      for (const { re, section: name, kind } of MARKERS) {
        const m = line.match(re)
        if (m) {
          section = { name, kind }
          const rest = (name === 'confusables' ? m[2] || m[1] : m[1] || '')
            .replace(/^[⚠️\s]+/u, '') // strip marker remnants from inline titles
            .trim()
          if (rest) appendToSection(entry, section, rest)
          return
        }
      }
      // continuation of the current section (or definition by default)
      appendToSection(entry, section ?? { name: 'definition', kind: 'text' }, line)
      return
    }

    unclassified.push({ lineNo: i + 1, line })
  })

  flush()
  return { entries, unclassified }
}

function appendToSection(entry, { name, kind }, text) {
  if (kind === 'list') {
    entry[name].push(text)
  } else if (name === 'definition') {
    entry.definition = entry.definition ? `${entry.definition} ${text}` : text
  } else if (name === 'example') {
    entry.example = entry.example ? `${entry.example} ${text}` : text
  }
}

/** Validate parsed entries; returns a list of human-readable problems. */
export function validateEntries(entries, expectedCount) {
  const problems = []
  if (expectedCount != null && entries.length !== expectedCount) {
    problems.push(`entry count ${entries.length} !== expected ${expectedCount}`)
  }
  for (const e of entries) {
    const where = `line ${e.lineNo} (${e.headword || '?'})`
    if (!e.headword) problems.push(`${where}: empty headword`)
    if (!e.meaning_zh) problems.push(`${where}: empty meaning_zh`)
    if (!e.passage) problems.push(`${where}: no passage heading in scope`)
  }
  return problems
}
