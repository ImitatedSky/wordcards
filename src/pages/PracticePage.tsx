import { useParams } from 'react-router-dom'

export function PracticePage() {
  const { id } = useParams()
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">練習 {id}</h1>
      <p className="text-slate-500">此頁由後續 Vocab 計畫實作。</p>
    </div>
  )
}
