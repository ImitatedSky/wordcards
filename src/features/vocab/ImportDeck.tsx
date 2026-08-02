import { useRef, useState } from 'react'
import { AlertTriangle, FileUp } from 'lucide-react'
import type { Deck } from '@/types/deck'
import type { VocabDeckExport } from '@/types/import-export'
import { Button } from '@/components/ui/button'
import { useStorage } from '@/storage/useStorage'
import { newId } from '@/utils/uuid'
import { csvToDecks, markdownToDecks, sheetsToDecks, type CsvImportResult } from './csvImport'
import { nextAvailableName, validateDeckBundle } from './importHelpers'

/** Parse an .xlsx file into per-sheet cell rows (lazy-loads the xlsx lib). */
async function readWorkbook(file: File): Promise<Array<{ name: string; rows: string[][] }>> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  return workbook.SheetNames.map((name) => ({
    name,
    rows: (
      XLSX.utils.sheet_to_json(workbook.Sheets[name], {
        header: 1,
        raw: false,
        defval: '',
      }) as unknown[][]
    ).map((row) => row.map((cell) => String(cell ?? ''))),
  }))
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'error'; message: string }
  | { kind: 'preview'; bundle: VocabDeckExport; duplicate: Deck | null }
  | { kind: 'csv-preview'; decks: Deck[]; collisions: Deck[] }

type Props = {
  decks: Deck[]
  onImported: () => void | Promise<void>
}

export function ImportDeck({ decks, onImported }: Props) {
  const storage = useStorage()
  const inputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [busy, setBusy] = useState(false)

  function showDeckPreview(result: CsvImportResult) {
    if (!result.ok) {
      setPhase({ kind: 'error', message: result.reason })
      return
    }
    const names = new Set(result.decks.map((d) => d.name))
    const collisions = decks.filter((d) => names.has(d.name))
    setPhase({ kind: 'csv-preview', decks: result.decks, collisions })
  }

  async function handleFile(file: File) {
    if (/\.xlsx?$/i.test(file.name)) {
      try {
        showDeckPreview(sheetsToDecks(await readWorkbook(file)))
      } catch {
        setPhase({ kind: 'error', message: '無法解析 Excel 檔案。' })
      }
      return
    }

    const text = await file.text()

    if (/\.csv$/i.test(file.name) || file.type === 'text/csv') {
      showDeckPreview(csvToDecks(text))
      return
    }

    if (/\.(md|markdown)$/i.test(file.name) || file.type === 'text/markdown') {
      showDeckPreview(markdownToDecks(text))
      return
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      setPhase({ kind: 'error', message: '無法解析檔案：不是有效的 JSON。' })
      return
    }
    const result = validateDeckBundle(parsed)
    if (!result.ok) {
      setPhase({ kind: 'error', message: result.reason })
      return
    }
    const duplicate = decks.find((d) => d.name === result.bundle.data.name) ?? null
    setPhase({ kind: 'preview', bundle: result.bundle, duplicate })
  }

  /** Persist with fresh deck/card ids, preserving card fields (incl. stats). */
  async function persist(bundle: VocabDeckExport, name: string) {
    const now = Date.now()
    const source = bundle.data
    await storage.saveDeck({
      ...source,
      id: newId(),
      name,
      cards: source.cards.map((c) => ({ ...c, id: newId() })),
      createdAt: now,
      updatedAt: now,
    })
  }

  async function confirmImport(mode: 'normal' | 'replace' | 'keep-both') {
    if (phase.kind !== 'preview') return
    setBusy(true)
    try {
      const { bundle, duplicate } = phase
      if (mode === 'replace' && duplicate) {
        await storage.deleteDeck(duplicate.id)
        await persist(bundle, bundle.data.name)
      } else if (mode === 'keep-both') {
        const names = new Set(decks.map((d) => d.name))
        await persist(bundle, nextAvailableName(bundle.data.name, names))
      } else {
        await persist(bundle, bundle.data.name)
      }
      setPhase({ kind: 'idle' })
      await onImported()
    } finally {
      setBusy(false)
    }
  }

  async function confirmCsvImport(mode: 'replace' | 'keep-both') {
    if (phase.kind !== 'csv-preview') return
    setBusy(true)
    try {
      const collidedNames = new Set(phase.collisions.map((d) => d.name))
      const takenNames = new Set(decks.map((d) => d.name))

      for (const deck of phase.decks) {
        if (collidedNames.has(deck.name) && mode === 'replace') {
          const existing = decks.find((d) => d.name === deck.name)
          if (existing) await storage.deleteDeck(existing.id)
          await storage.saveDeck(deck)
        } else {
          const name = nextAvailableName(deck.name, takenNames)
          takenNames.add(name)
          await storage.saveDeck({ ...deck, name })
        }
      }
      setPhase({ kind: 'idle' })
      await onImported()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".json,.csv,.xlsx,.md,.markdown,application/json,text/csv,text/markdown,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        aria-label="選擇牌組檔案（JSON、CSV、Excel 或 Markdown）"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void handleFile(file)
        }}
      />
      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
        <FileUp data-icon="inline-start" aria-hidden="true" />
        匯入牌組
      </Button>

      {phase.kind === 'error' && (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md rounded-xl border border-destructive/40 bg-card p-4 shadow-lg animate-in fade-in slide-in-from-bottom-2 md:bottom-8"
        >
          <p className="flex items-start gap-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {phase.message}
          </p>
          <div className="mt-3 flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setPhase({ kind: 'idle' })}>
              知道了
            </Button>
          </div>
        </div>
      )}

      {phase.kind === 'preview' && (
        <div
          role="dialog"
          aria-label="匯入預覽"
          className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md rounded-xl border border-border bg-card p-5 shadow-lg animate-in fade-in slide-in-from-bottom-2 md:bottom-8"
        >
          <h2 className="font-heading font-semibold">匯入預覽</h2>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            {phase.bundle.data.name} · {phase.bundle.data.cards.length} 張單字卡
          </p>

          {phase.duplicate ? (
            <>
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                已存在同名牌組。「取代」將刪除原牌組的 {phase.duplicate.cards.length}{' '}
                張卡片與其練習統計，無法復原。
              </p>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <Button type="button" variant="ghost" disabled={busy} onClick={() => setPhase({ kind: 'idle' })}>
                  取消
                </Button>
                <Button type="button" variant="outline" disabled={busy} onClick={() => void confirmImport('keep-both')}>
                  另存新名
                </Button>
                <Button type="button" variant="destructive" disabled={busy} onClick={() => void confirmImport('replace')}>
                  取代
                </Button>
              </div>
            </>
          ) : (
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" disabled={busy} onClick={() => setPhase({ kind: 'idle' })}>
                取消
              </Button>
              <Button type="button" disabled={busy} onClick={() => void confirmImport('normal')}>
                確認匯入
              </Button>
            </div>
          )}
        </div>
      )}

      {phase.kind === 'csv-preview' && (
        <div
          role="dialog"
          aria-label="CSV 匯入預覽"
          className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md rounded-xl border border-border bg-card p-5 shadow-lg animate-in fade-in slide-in-from-bottom-2 md:bottom-8"
        >
          <h2 className="font-heading font-semibold">CSV 匯入預覽</h2>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm text-muted-foreground tabular-nums">
            {phase.decks.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{d.name}</span>
                <span className="shrink-0">{d.cards.length} 張</span>
              </li>
            ))}
          </ul>

          {phase.collisions.length > 0 && (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {phase.collisions.length} 副牌組與現有牌組同名。「取代同名」將刪除原牌組（含練習統計，無法復原）；「全部另存新名」會以「名稱
              (2)」保留兩者。
            </p>
          )}

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setPhase({ kind: 'idle' })}>
              取消
            </Button>
            {phase.collisions.length > 0 ? (
              <>
                <Button type="button" variant="outline" disabled={busy} onClick={() => void confirmCsvImport('keep-both')}>
                  全部另存新名
                </Button>
                <Button type="button" variant="destructive" disabled={busy} onClick={() => void confirmCsvImport('replace')}>
                  取代同名
                </Button>
              </>
            ) : (
              <Button type="button" disabled={busy} onClick={() => void confirmCsvImport('keep-both')}>
                確認匯入
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
