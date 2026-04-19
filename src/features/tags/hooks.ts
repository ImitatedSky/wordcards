import { useCallback, useEffect, useState } from 'react'
import type { Tag } from '@/types/tag'
import { useStorage } from '@/storage/useStorage'
import { newId } from '@/utils/uuid'

export function useTags() {
  const storage = useStorage()
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const t = await storage.listTags()
    setTags(t.sort((a, b) => a.createdAt - b.createdAt))
    setLoading(false)
  }, [storage])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const create = useCallback(async (name: string, color?: string) => {
    const tag: Tag = {
      id: newId(),
      name,
      color,
      builtIn: false,
      createdAt: Date.now(),
    }
    await storage.saveTag(tag)
    await refresh()
    return tag
  }, [storage, refresh])

  const rename = useCallback(async (id: string, name: string) => {
    const existing = await storage.getTag(id)
    if (!existing) throw new Error(`Tag not found: ${id}`)
    await storage.saveTag({ ...existing, name })
    await refresh()
  }, [storage, refresh])

  const recolor = useCallback(async (id: string, color?: string) => {
    const existing = await storage.getTag(id)
    if (!existing) throw new Error(`Tag not found: ${id}`)
    await storage.saveTag({ ...existing, color })
    await refresh()
  }, [storage, refresh])

  const remove = useCallback(async (id: string) => {
    await storage.deleteTag(id)
    await refresh()
  }, [storage, refresh])

  return { tags, loading, create, rename, recolor, remove, refresh }
}
