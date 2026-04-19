import { Link, NavLink, Outlet } from 'react-router-dom'
import { ErrorBoundary } from './components/common/ErrorBoundary'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <nav className="max-w-5xl mx-auto flex items-center justify-between px-6 py-3">
          <Link to="/" className="font-bold text-lg">EnglishProject</Link>
          <ul className="flex items-center gap-4 text-sm">
            {[
              { to: '/vocab', label: '單字' },
              { to: '/grammar', label: '文法' },
              { to: '/settings', label: '設定' },
            ].map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    'hover:text-slate-900 ' + (isActive ? 'text-slate-900 font-medium' : 'text-slate-500')
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  )
}
