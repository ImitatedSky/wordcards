import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import { HomePage } from './pages/HomePage'
import { VocabPage } from './pages/VocabPage'
import { DeckPage } from './pages/DeckPage'
import { PracticePage } from './pages/PracticePage'
import { GrammarPage } from './pages/GrammarPage'
import { QuizPage } from './pages/QuizPage'
import { QuizSessionPage } from './pages/QuizSessionPage'
import { SettingsPage } from './pages/SettingsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ConstructionPage } from './components/common/ConstructionPage'

// Vite base ('/wordcards/' 於 GitHub Pages) → router basename;測試環境為 '/'
const basename = import.meta.env.BASE_URL.replace(/\/+$/, '') || '/'

export const router = createBrowserRouter(
  [
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'vocab', element: <VocabPage /> },
      { path: 'vocab/:id', element: <DeckPage /> },
      { path: 'vocab/:id/practice', element: <PracticePage /> },
      { path: 'grammar', element: <GrammarPage /> },
      { path: 'grammar/:id', element: <QuizPage /> },
      { path: 'grammar/:id/quiz', element: <QuizSessionPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'stats', element: <ConstructionPage title="統計 Dashboard" description="每日練習、連續打卡、熟悉度 — 未來版本推出。" /> },
      { path: 'sync', element: <ConstructionPage title="雲端同步" description="跨裝置同步 — 未來版本推出。" /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  ],
  { basename },
)
