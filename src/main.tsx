import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { ThemeProvider } from 'next-themes'
import { router } from './router'
import { AppStorage } from './storage/AppStorage'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AppStorage>
        <RouterProvider router={router} />
      </AppStorage>
    </ThemeProvider>
  </React.StrictMode>,
)
