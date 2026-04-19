import { createContext, useContext } from 'react'
import type { IStorage } from './IStorage'

export const StorageContext = createContext<IStorage | null>(null)

export function useStorage(): IStorage {
  const s = useContext(StorageContext)
  if (!s) {
    throw new Error('useStorage must be called within a <StorageProvider>')
  }
  return s
}
