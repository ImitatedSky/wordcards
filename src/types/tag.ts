export type Tag = {
  id: string
  name: string
  color?: string
  icon?: string
  builtIn: boolean
  createdAt: number
}

export const BUILTIN_FAVORITE_ID = 'builtin-favorite'
export const BUILTIN_STAR_ID = 'builtin-star'
