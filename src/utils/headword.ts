import type { Card } from '@/types/deck'

/** "Circumscribe (v.)" → "Circumscribe" */
export function headwordOf(card: Card): string {
  return card.front.replace(/\s*[（(].*[)）]\s*$/, '')
}
