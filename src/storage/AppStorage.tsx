import { useEffect, useState, type ReactNode } from 'react'
import { IndexedDBStorage } from './indexedDBStorage'
import { StorageProvider } from './StorageProvider'
import { seedIfFirstRun } from './firstRunSeed'

type Props = { children: ReactNode }

export function AppStorage({ children }: Props) {
  const [storage, setStorage] = useState<IndexedDBStorage | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const s = new IndexedDBStorage()
    s.ready()
      .then(() => seedIfFirstRun(s))
      .then(() => setStorage(s))
      .catch(e => setError(e instanceof Error ? e : new Error(String(e))))
  }, [])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-semibold mb-2">無法開啟資料庫</h2>
          <p className="text-sm text-slate-600 font-mono break-words">{error.message}</p>
        </div>
      </div>
    )
  }

  if (!storage) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
        載入中…
      </div>
    )
  }

  return <StorageProvider storage={storage}>{children}</StorageProvider>
}
