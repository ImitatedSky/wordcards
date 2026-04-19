import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FavoriteStarButtons } from './FavoriteStarButtons'
import { BUILTIN_FAVORITE_ID, BUILTIN_STAR_ID } from '@/types/tag'

describe('FavoriteStarButtons', () => {
  it('reflects favorite/star state via aria-pressed', () => {
    render(
      <FavoriteStarButtons
        tags={[BUILTIN_FAVORITE_ID]}
        onToggle={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: /我的最愛/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /星號/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onToggle with the correct built-in id', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()
    render(<FavoriteStarButtons tags={[]} onToggle={onToggle} />)
    await user.click(screen.getByRole('button', { name: /我的最愛/ }))
    expect(onToggle).toHaveBeenCalledWith(BUILTIN_FAVORITE_ID)
    await user.click(screen.getByRole('button', { name: /星號/ }))
    expect(onToggle).toHaveBeenCalledWith(BUILTIN_STAR_ID)
  })
})
