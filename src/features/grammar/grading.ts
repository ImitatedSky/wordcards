import type { Question } from '@/types/quiz'

export type AnswerInput =
  | { kind: 'mc'; optionIndex: number }
  | { kind: 'fib'; text: string }

export function gradeAnswer(question: Question, input: AnswerInput): 'correct' | 'incorrect' {
  if (question.type === 'multiple_choice') {
    if (input.kind !== 'mc') return 'incorrect'
    return input.optionIndex === question.correctIndex ? 'correct' : 'incorrect'
  }

  if (input.kind !== 'fib') return 'incorrect'
  const typed = input.text.trim()
  if (typed.length === 0) return 'incorrect'
  const caseSensitive = question.caseSensitive === true
  const normalizedInput = caseSensitive ? typed : typed.toLowerCase()
  for (const answer of question.answers) {
    const trimmed = answer.trim()
    const normalizedAnswer = caseSensitive ? trimmed : trimmed.toLowerCase()
    if (normalizedAnswer === normalizedInput) return 'correct'
  }
  return 'incorrect'
}
