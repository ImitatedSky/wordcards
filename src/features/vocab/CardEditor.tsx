import { useState } from 'react'

export type CardEditorValues = {
  front: string
  back: string
  example: string
  pronunciation: string
  notes: string
}

type Props = {
  mode: 'create' | 'edit'
  initial?: Partial<CardEditorValues>
  onSave: (values: CardEditorValues) => void
  onCancel: () => void
}

export function CardEditor({ mode, initial, onSave, onCancel }: Props) {
  const [front, setFront] = useState(initial?.front ?? '')
  const [back, setBack] = useState(initial?.back ?? '')
  const [example, setExample] = useState(initial?.example ?? '')
  const [pronunciation, setPronunciation] = useState(initial?.pronunciation ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [errors, setErrors] = useState<string[]>([])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: string[] = []
    if (!front.trim()) errs.push('正面 必填')
    if (!back.trim()) errs.push('背面 必填')
    if (errs.length > 0) {
      setErrors(errs)
      return
    }
    setErrors([])
    onSave({ front: front.trim(), back: back.trim(), example, pronunciation, notes })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h2 className="text-lg font-semibold">{mode === 'create' ? '新增單字' : '編輯單字'}</h2>
      <label className="block">
        <span className="block text-sm">正面</span>
        <input
          aria-label="正面"
          value={front}
          onChange={(e) => setFront(e.target.value)}
          className="w-full rounded border px-2 py-1"
        />
      </label>
      <label className="block">
        <span className="block text-sm">背面</span>
        <input
          aria-label="背面"
          value={back}
          onChange={(e) => setBack(e.target.value)}
          className="w-full rounded border px-2 py-1"
        />
      </label>
      <label className="block">
        <span className="block text-sm">例句</span>
        <input
          aria-label="例句"
          value={example}
          onChange={(e) => setExample(e.target.value)}
          className="w-full rounded border px-2 py-1"
        />
      </label>
      <label className="block">
        <span className="block text-sm">發音</span>
        <input
          aria-label="發音"
          value={pronunciation}
          onChange={(e) => setPronunciation(e.target.value)}
          className="w-full rounded border px-2 py-1"
        />
      </label>
      <label className="block">
        <span className="block text-sm">備註</span>
        <textarea
          aria-label="備註"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded border px-2 py-1"
        />
      </label>
      {errors.map((e) => (
        <p key={e} className="text-sm text-red-600">
          {e}
        </p>
      ))}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="rounded px-3 py-1 border">
          取消
        </button>
        <button type="submit" className="rounded px-3 py-1 bg-slate-800 text-white">
          儲存
        </button>
      </div>
    </form>
  )
}
