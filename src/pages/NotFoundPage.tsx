import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="text-center animate-in fade-in zoom-in-95">
        <Compass className="mx-auto size-12 text-muted-foreground/40" aria-hidden="true" />
        <h1 className="mt-4 font-heading text-5xl font-bold text-primary">404</h1>
        <p className="mt-2 text-muted-foreground">找不到這個頁面。</p>
        <Link to="/" className={buttonVariants({ variant: 'outline' }) + ' mt-6'}>
          回首頁
        </Link>
      </div>
    </div>
  )
}
