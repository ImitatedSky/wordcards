import { useState } from 'react'
import { useTags } from './hooks'
import { TagChip } from '@/components/common/TagChip'

export function TagManager() {
  const { tags, loading, create, rename, remove } = useTags()
  const [newName, setNewName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (loading) {
    return <p className="text-slate-500 text-sm">載入中…</p>
  }

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    setError(null)
    try {
      await create(name)
      setNewName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleRename = async (id: string) => {
    const name = renameValue.trim()
    if (!name) return
    setError(null)
    try {
      await rename(id, name)
      setRenamingId(null)
      setRenameValue('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleRemove = async (id: string) => {
    setError(null)
    try {
      await remove(id)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Tag 管理</h2>

      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="新增 tag 名稱"
          className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm"
          aria-label="新增 tag 名稱"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={!newName.trim()}
          className="px-3 py-1.5 rounded bg-slate-800 text-white text-sm disabled:opacity-50"
        >
          新增
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="space-y-2">
        {tags.map(tag => (
          <li key={tag.id} className="flex items-center gap-2">
            <TagChip tag={tag} />
            {renamingId === tag.id ? (
              <>
                <input
                  type="text"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  aria-label={`重新命名 ${tag.name}`}
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleRename(tag.id)}
                  className="text-sm text-slate-800 underline"
                >
                  儲存
                </button>
                <button
                  type="button"
                  onClick={() => { setRenamingId(null); setRenameValue('') }}
                  className="text-sm text-slate-500"
                >
                  取消
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => { setRenamingId(tag.id); setRenameValue(tag.name) }}
                className="text-sm text-slate-600 underline"
              >
                重新命名
              </button>
            )}
            {!tag.builtIn && (
              <button
                type="button"
                onClick={() => handleRemove(tag.id)}
                aria-label={`刪除 ${tag.name}`}
                className="text-sm text-red-600 underline ml-auto"
              >
                刪除
              </button>
            )}
            {tag.builtIn && (
              <span className="text-xs text-slate-400 ml-auto">內建</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
