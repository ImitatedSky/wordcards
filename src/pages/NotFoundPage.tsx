import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-slate-600 mb-4">找不到這個頁面。</p>
        <Link to="/" className="text-sm text-slate-800 underline">回首頁</Link>
      </div>
    </div>
  )
}
