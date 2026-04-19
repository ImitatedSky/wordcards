import type { ReactNode } from 'react'
import type { IStorage } from './IStorage'
import { StorageContext } from './useStorage'

type Props = {
  storage: IStorage
  children: ReactNode
}

export function StorageProvider({ storage, children }: Props) {
  return <StorageContext.Provider value={storage}>{children}</StorageContext.Provider>
}
