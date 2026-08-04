import { useRef, useState } from 'react'
import { AlertTriangle, FileDown, FileUp } from 'lucide-react'
import type { Quiz } from '@/types/quiz'
import type { GrammarQuizExport } from '@/types/import-export'
import { Button } from '@/components/ui/button'
import { useStorage } from '@/storage/useStorage'
import { newId } from '@/utils/uuid'
import { downloadTextFile } from '@/utils/download'
import { nextAvailableName } from '@/features/vocab/importHelpers'
import { quizJsonTemplate, validateQuizBundle } from './quizImportHelpers'

type Phase =
  | { kind: 'idle' }
  | { kind: 'error'; message: string }
  | { kind: 'preview'; bundle: GrammarQuizExport; duplicate: Quiz | null }

type Props = {
  quizzes: Quiz[]
  onImported: () => void | Promise<void>
}

export function ImportQuiz({ quizzes, onImported }: Props) {
  const storage = useStorage()
  const inputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [busy, setBusy] = useState(false)

  async function handleFile(file: File) {
    let parsed: unknown
    try {
      parsed = JSON.parse(await file.text())
    } catch {
      setPhase({ kind: 'error', message: '無法解析檔案：不是有效的 JSON。' })
      return
    }
    const result = validateQuizBundle(parsed)
    if (!result.ok) {
      setPhase({ kind: 'error', message: result.reason })
      return
    }
    const duplicate = quizzes.find((q) => q.name === result.bundle.data.name) ?? null
    setPhase({ kind: 'preview', bundle: result.bundle, duplicate })
  }

  /** Persist with fresh quiz/question ids, preserving fields (incl. stats). */
  async function persist(bundle: GrammarQuizExport, name: string) {
    const now = Date.now()
    const source = bundle.data
    await storage.saveQuiz({
      ...source,
      id: newId(),
      name,
      questions: source.questions.map((q) => ({ ...q, id: newId() })),
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
        await storage.deleteQuiz(duplicate.id)
        await persist(bundle, bundle.data.name)
      } else if (mode === 'keep-both') {
        const names = new Set(quizzes.map((q) => q.name))
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

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        aria-label="選擇測驗 JSON 檔"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void handleFile(file)
        }}
      />
      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
        <FileUp data-icon="inline-start" aria-hidden="true" />
        匯入測驗
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
          <p className="mt-2 text-sm text-muted-foreground">
            要不要下載 JSON 模板？照模板格式填好再匯入就能成功。
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setPhase({ kind: 'idle' })}>
              知道了
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => downloadTextFile('文法測驗模板.json', quizJsonTemplate(), 'application/json')}
            >
              <FileDown data-icon="inline-start" aria-hidden="true" />
              下載模板
            </Button>
          </div>
        </div>
      )}

      {phase.kind === 'preview' && (
        <div
          role="dialog"
          aria-label="匯入測驗預覽"
          className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md rounded-xl border border-border bg-card p-5 shadow-lg animate-in fade-in slide-in-from-bottom-2 md:bottom-8"
        >
          <h2 className="font-heading font-semibold">匯入測驗預覽</h2>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            {phase.bundle.data.name} · {phase.bundle.data.questions.length} 題
          </p>

          {phase.duplicate ? (
            <>
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                已存在同名測驗。「取代」將刪除原測驗的 {phase.duplicate.questions.length}{' '}
                題與其作答統計，無法復原。
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
    </>
  )
}
