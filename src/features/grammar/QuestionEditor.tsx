import { useState } from 'react'
import type { Question } from '@/types/quiz'

export type QuestionEditorInitial =
  | {
      type: 'multiple_choice'
      prompt: string
      options: string[]
      correctIndex: number
      explanation?: string
      notes?: string
    }
  | {
      type: 'fill_in_blank'
      prompt: string
      answers: string[]
      caseSensitive?: boolean
      explanation?: string
      notes?: string
    }

export type QuestionEditorOutput =
  | {
      type: 'multiple_choice'
      prompt: string
      options: string[]
      correctIndex: number
      explanation: string
      notes: string
    }
  | {
      type: 'fill_in_blank'
      prompt: string
      answers: string[]
      caseSensitive: boolean
      explanation: string
      notes: string
    }

type Props = {
  mode: 'create' | 'edit'
  initial?: QuestionEditorInitial
  onSave: (values: QuestionEditorOutput) => void
  onCancel: () => void
}

const DEFAULT_MC_OPTIONS = ['', '', '', '']
const DEFAULT_FIB_ANSWERS = ['']

export function QuestionEditor({ mode, initial, onSave, onCancel }: Props) {
  const [type, setType] = useState<Question['type']>(initial?.type ?? 'multiple_choice')
  const [prompt, setPrompt] = useState(initial?.prompt ?? '')
  const [explanation, setExplanation] = useState(initial?.explanation ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [options, setOptions] = useState<string[]>(
    initial?.type === 'multiple_choice' ? [...initial.options] : [...DEFAULT_MC_OPTIONS],
  )
  const [correctIndex, setCorrectIndex] = useState<number>(
    initial?.type === 'multiple_choice' ? initial.correctIndex : 0,
  )
  const [answers, setAnswers] = useState<string[]>(
    initial?.type === 'fill_in_blank' ? [...initial.answers] : [...DEFAULT_FIB_ANSWERS],
  )
  const [caseSensitive, setCaseSensitive] = useState<boolean>(
    initial?.type === 'fill_in_blank' ? initial.caseSensitive === true : false,
  )
  const [errors, setErrors] = useState<string[]>([])

  const typeLocked = mode === 'edit'

  function switchType(next: Question['type']) {
    if (typeLocked || next === type) return
    setType(next)
    if (next === 'multiple_choice') {
      setOptions([...DEFAULT_MC_OPTIONS])
      setCorrectIndex(0)
    } else {
      setAnswers([...DEFAULT_FIB_ANSWERS])
      setCaseSensitive(false)
    }
    setErrors([])
  }

  function updateOption(i: number, value: string) {
    setOptions((prev) => prev.map((v, idx) => (idx === i ? value : v)))
  }

  function addOption() {
    if (options.length >= 6) return
    setOptions((prev) => [...prev, ''])
  }

  function removeOption(i: number) {
    if (options.length <= 2) return
    setOptions((prev) => prev.filter((_, idx) => idx !== i))
    if (correctIndex === i) setCorrectIndex(0)
    else if (correctIndex > i) setCorrectIndex(correctIndex - 1)
  }

  function updateAnswer(i: number, value: string) {
    setAnswers((prev) => prev.map((v, idx) => (idx === i ? value : v)))
  }

  function addAnswer() {
    setAnswers((prev) => [...prev, ''])
  }

  function removeAnswer(i: number) {
    if (answers.length <= 1) return
    setAnswers((prev) => prev.filter((_, idx) => idx !== i))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: string[] = []
    if (!prompt.trim()) errs.push('題目 必填')
    if (type === 'multiple_choice') {
      const nonEmpty = options.filter((o) => o.trim().length > 0)
      if (nonEmpty.length < 2 || !options[correctIndex]?.trim()) {
        errs.push('至少 2 個非空選項，且正解必須非空')
      }
    } else {
      const nonEmpty = answers.filter((a) => a.trim().length > 0)
      if (nonEmpty.length < 1) errs.push('至少 1 個非空答案')
    }
    if (errs.length > 0) {
      setErrors(errs)
      return
    }
    setErrors([])

    if (type === 'multiple_choice') {
      onSave({
        type: 'multiple_choice',
        prompt: prompt.trim(),
        options,
        correctIndex,
        explanation,
        notes,
      })
    } else {
      onSave({
        type: 'fill_in_blank',
        prompt: prompt.trim(),
        answers,
        caseSensitive,
        explanation,
        notes,
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h2 className="text-lg font-semibold">{mode === 'create' ? '新增題目' : '編輯題目'}</h2>

      <fieldset className="flex gap-4">
        <legend className="sr-only">題型</legend>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="question-type"
            aria-label="選擇題"
            checked={type === 'multiple_choice'}
            disabled={typeLocked}
            onChange={() => switchType('multiple_choice')}
          />
          <span>選擇題</span>
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="question-type"
            aria-label="填空"
            checked={type === 'fill_in_blank'}
            disabled={typeLocked}
            onChange={() => switchType('fill_in_blank')}
          />
          <span>填空</span>
        </label>
      </fieldset>

      <label className="block">
        <span className="block text-sm">題目</span>
        <textarea
          aria-label="題目"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full rounded border px-2 py-1"
        />
      </label>

      {type === 'multiple_choice' && (
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="mc-correct"
                aria-label="此為正解"
                checked={correctIndex === i}
                onChange={() => setCorrectIndex(i)}
              />
              <input
                aria-label={`選項 ${i + 1}`}
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                className="flex-1 rounded border px-2 py-1"
              />
              <button
                type="button"
                onClick={() => removeOption(i)}
                disabled={options.length <= 2}
                className="rounded border px-2 py-1 text-sm disabled:opacity-50"
              >
                −
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addOption}
            disabled={options.length >= 6}
            className="rounded border px-2 py-1 text-sm disabled:opacity-50"
          >
            + 加選項
          </button>
        </div>
      )}

      {type === 'fill_in_blank' && (
        <div className="space-y-2">
          {answers.map((ans, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                aria-label={`答案 ${i + 1}`}
                value={ans}
                onChange={(e) => updateAnswer(i, e.target.value)}
                className="flex-1 rounded border px-2 py-1"
              />
              <button
                type="button"
                onClick={() => removeAnswer(i)}
                disabled={answers.length <= 1}
                className="rounded border px-2 py-1 text-sm disabled:opacity-50"
              >
                −
              </button>
            </div>
          ))}
          <button type="button" onClick={addAnswer} className="rounded border px-2 py-1 text-sm">
            + 加答案
          </button>
          <label className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              aria-label="區分大小寫"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
            />
            <span>區分大小寫</span>
          </label>
        </div>
      )}

      <label className="block">
        <span className="block text-sm">解說 (選填)</span>
        <textarea
          aria-label="解說"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          className="w-full rounded border px-2 py-1"
        />
      </label>
      <label className="block">
        <span className="block text-sm">備註 (選填)</span>
        <textarea
          aria-label="備註"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded border px-2 py-1"
        />
      </label>

      {errors.map((msg) => (
        <p key={msg} className="text-sm text-red-600">
          {msg}
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
