import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">EnglishProject</h1>
      <p className="text-slate-600 mb-6">
        歡迎。這是一個可擴充的英文學習 App（未來支援多語言）。
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/vocab"
          className="block rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
        >
          <div className="font-semibold">單字卡</div>
          <div className="text-sm text-slate-500">管理牌組並練習</div>
        </Link>
        <Link
          to="/grammar"
          className="block rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
        >
          <div className="font-semibold">文法測驗</div>
          <div className="text-sm text-slate-500">管理題組並作答</div>
        </Link>
      </div>
    </div>
  )
}
