import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { AppStorage } from './storage/AppStorage'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppStorage>
      <RouterProvider router={router} />
    </AppStorage>
  </React.StrictMode>,
)
