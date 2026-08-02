import { Link, NavLink, Outlet } from 'react-router-dom'
import { BookOpen, GraduationCap, Home, Languages, Settings } from 'lucide-react'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { ThemeToggle } from './components/common/ThemeToggle'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: '首頁', icon: Home, end: true },
  { to: '/vocab', label: '單字', icon: BookOpen, end: false },
  { to: '/grammar', label: '文法', icon: GraduationCap, end: false },
  { to: '/settings', label: '設定', icon: Settings, end: false },
] as const

export default function App() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <nav aria-label="主導航" className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-1 py-1 font-heading text-lg font-bold tracking-tight transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Languages className="size-5" aria-hidden="true" />
            </span>
            EnglishProject
          </Link>

          <div className="flex items-center gap-1">
            {/* Desktop nav */}
            <ul className="hidden items-center gap-1 md:flex">
              {NAV_ITEMS.filter((i) => i.to !== '/').map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      cn(
                        'relative flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isActive
                          ? 'text-primary after:absolute after:inset-x-3 after:-bottom-2 after:h-0.5 after:rounded-full after:bg-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )
                    }
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <ThemeToggle />
          </div>
        </nav>
      </header>

      {/* Content — reserves space for the mobile bottom nav */}
      <main className="pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-10">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="底部導航"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="flex items-stretch">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-14 flex-col items-center justify-center gap-0.5 py-1.5 text-xs font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn('size-5 transition-transform', isActive && 'scale-110')} aria-hidden="true" />
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
