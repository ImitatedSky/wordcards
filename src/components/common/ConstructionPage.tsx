import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'

type Props = {
  title: string
  description?: string
}

export function ConstructionPage({ title, description }: Props) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md text-center animate-in fade-in zoom-in-95">
        {/* 🚧 marker is part of the routing spec for placeholder pages */}
        <div className="mb-4 text-5xl" aria-hidden="true">🚧</div>
        <h1 className="mb-2 text-2xl font-semibold">{title}</h1>
        <p className="mb-6 text-muted-foreground">
          {description ?? '此功能尚未開放，未來版本會推出。'}
        </p>
        <Link to="/" className={buttonVariants({ variant: 'outline' })}>
          回到首頁
        </Link>
      </div>
    </div>
  )
}
