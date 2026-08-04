import { downloadTextFile } from '@/utils/download'
import { CSV_COLUMNS } from './csvImport'

/** Which template to offer when an import fails, by failed file type. */
export type DeckTemplateKind = 'csv' | 'json' | 'md' | 'xlsx'

/** Two sample rows in the fixed 14-column master schema (kept comma/quote-free
    so the CSV stays trivially valid). */
const SAMPLE_ROWS: string[][] = [
  [
    'B1',
    'L1',
    'abandon',
    'v.',
    '拋棄；放棄',
    '徹底放棄某人、某物或某計畫',
    'a-(離開) + bandon(控制) → 脫離控制 → 拋棄',
    'desert (v.) 遺棄 | give up (phr.) 放棄',
    'keep (v.) 保留',
    'abandonment (n.) 拋棄',
    'abundant (adj.) 豐富的',
    'They abandoned the car in the snow.',
    'əˈbændən',
    '動詞',
  ],
  [
    'B1',
    'L1',
    'benefit',
    'n.',
    '好處；利益',
    '',
    '',
    'advantage (n.) 優勢 | gain (n.) 利益',
    'harm (n.) 害處',
    'beneficial (adj.) 有益的',
    '',
    'Exercise benefits both body and mind.',
    'ˈbɛnəfɪt',
    '',
  ],
]

export function deckCsvTemplate(): string {
  const lines = [CSV_COLUMNS.join(','), ...SAMPLE_ROWS.map((r) => r.join(','))]
  return '﻿' + lines.join('\r\n') + '\r\n' // BOM so Excel opens UTF-8 correctly
}

export function deckMarkdownTemplate(): string {
  // Cell-internal pipes (synonym separators) must be escaped in Markdown tables.
  const esc = (cell: string) => cell.replace(/\|/g, '\\|')
  const row = (cells: readonly string[]) => `| ${cells.map(esc).join(' | ')} |`
  return [
    row(CSV_COLUMNS),
    `| ${CSV_COLUMNS.map(() => '---').join(' | ')} |`,
    ...SAMPLE_ROWS.map(row),
    '',
  ].join('\n')
}

export function deckJsonTemplate(): string {
  const now = Date.now()
  const bundle = {
    format: 'english-app-vocab-deck',
    version: 1,
    exportedAt: now,
    data: {
      id: 'template-deck',
      name: '範例牌組',
      description: '把 cards 換成你的單字後匯入。',
      language: { front: 'en', back: 'zh' },
      cards: SAMPLE_ROWS.map((r, i) => ({
        id: `template-card-${i + 1}`,
        front: `${r[2]} (${r[3]})`,
        back: r[4],
        example: r[11],
        pronunciation: r[12],
        notes: '',
        tags: [],
        stats: { correctCount: 0, incorrectCount: 0, lastReviewedAt: null },
      })),
      tags: [],
      createdAt: now,
      updatedAt: now,
    },
  }
  return JSON.stringify(bundle, null, 2)
}

async function downloadXlsxTemplate(): Promise<void> {
  const XLSX = await import('xlsx')
  const sheet = XLSX.utils.aoa_to_sheet([[...CSV_COLUMNS], ...SAMPLE_ROWS])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, '單字')
  XLSX.writeFile(workbook, '單字牌組模板.xlsx')
}

/** Download the import template matching the failed file type. */
export async function downloadDeckTemplate(kind: DeckTemplateKind): Promise<void> {
  switch (kind) {
    case 'csv':
      downloadTextFile('單字牌組模板.csv', deckCsvTemplate(), 'text/csv')
      break
    case 'md':
      downloadTextFile('單字牌組模板.md', deckMarkdownTemplate(), 'text/markdown')
      break
    case 'json':
      downloadTextFile('單字牌組模板.json', deckJsonTemplate(), 'application/json')
      break
    case 'xlsx':
      await downloadXlsxTemplate()
      break
  }
}
