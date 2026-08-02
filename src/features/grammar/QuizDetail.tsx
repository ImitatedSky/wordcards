import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, Plus } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Question } from '@/types/quiz'
import { useQuiz } from './hooks'
import { QuestionTable } from './QuestionTable'
import {
  QuestionEditor,
  type QuestionEditorInitial,
  type QuestionEditorOutput,
} from './QuestionEditor'
import { newMcQuestion, newFibQuestion } from './factories'

type Props = {
  quizId: string
}

type EditorState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; questionId: string }

function toInitial(q: Question): QuestionEditorInitial {
  if (q.type === 'multiple_choice') {
    return {
      type: 'multiple_choice',
      prompt: q.prompt,
      options: [...q.options],
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      notes: q.notes,
    }
  }
  return {
    type: 'fill_in_blank',
    prompt: q.prompt,
    answers: [...q.answers],
    caseSensitive: q.caseSensitive,
    explanation: q.explanation,
    notes: q.notes,
  }
}

export function QuizDetail({ quizId }: Props) {
  const { quiz, loading, addQuestion, updateQuestion, deleteQuestion, toggleBuiltInTag } =
    useQuiz(quizId)
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' })

  if (loading) return <p>載入中…</p>
  if (!quiz) return <p>找不到測驗。</p>

  const quizDisabled = quiz.questions.length === 0
  const editingQuestion =
    editor.mode === 'edit'
      ? quiz.questions.find((q) => q.id === editor.questionId)
      : undefined

  async function handleSave(values: QuestionEditorOutput) {
    if (editor.mode === 'create') {
      if (values.type === 'multiple_choice') {
        await addQuestion(
          newMcQuestion({
            prompt: values.prompt,
            options: values.options,
            correctIndex: values.correctIndex,
            explanation: values.explanation || undefined,
            notes: values.notes || undefined,
          }),
        )
      } else {
        await addQuestion(
          newFibQuestion({
            prompt: values.prompt,
            answers: values.answers,
            caseSensitive: values.caseSensitive || undefined,
            explanation: values.explanation || undefined,
            notes: values.notes || undefined,
          }),
        )
      }
    } else if (editor.mode === 'edit') {
      if (values.type === 'multiple_choice') {
        await updateQuestion(editor.questionId, {
          prompt: values.prompt,
          options: values.options,
          correctIndex: values.correctIndex,
          explanation: values.explanation || undefined,
          notes: values.notes || undefined,
        })
      } else {
        await updateQuestion(editor.questionId, {
          prompt: values.prompt,
          answers: values.answers,
          caseSensitive: values.caseSensitive,
          explanation: values.explanation || undefined,
          notes: values.notes || undefined,
        })
      }
    }
    setEditor({ mode: 'closed' })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{quiz.name}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">{quiz.questions.length} 題</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setEditor({ mode: 'create' })}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            新增題目
          </Button>
          <Link
            to={`/grammar/${quiz.id}/quiz`}
            aria-disabled={quizDisabled}
            onClick={(e) => {
              if (quizDisabled) e.preventDefault()
            }}
            className={cn(
              buttonVariants({ variant: 'default' }),
              quizDisabled && 'pointer-events-auto cursor-not-allowed opacity-50',
            )}
          >
            <Play data-icon="inline-start" aria-hidden="true" />
            開始測驗
          </Link>
        </div>
      </div>

      <QuestionTable
        questions={quiz.questions}
        onEdit={(questionId) => setEditor({ mode: 'edit', questionId })}
        onDelete={(questionId) => void deleteQuestion(questionId)}
        onToggleBuiltIn={(questionId, builtinId) => void toggleBuiltInTag(questionId, builtinId)}
      />

      {editor.mode !== 'closed' && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm animate-in fade-in slide-in-from-top-2">
          <QuestionEditor
            mode={editor.mode}
            initial={editingQuestion ? toInitial(editingQuestion) : undefined}
            onSave={handleSave}
            onCancel={() => setEditor({ mode: 'closed' })}
          />
        </div>
      )}
    </div>
  )
}
