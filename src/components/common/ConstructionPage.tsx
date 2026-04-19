import { Link } from 'react-router-dom'

type Props = {
  title: string
  description?: string
}

export function ConstructionPage({ title, description }: Props) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">🚧</div>
        <h1 className="text-2xl font-semibold text-slate-800 mb-2">{title}</h1>
        <p className="text-slate-600 mb-6">
          {description ?? '此功能尚未開放，未來版本會推出。'}
        </p>
        <Link to="/" className="text-sm text-slate-800 underline">回到首頁</Link>
      </div>
    </div>
  )
}
