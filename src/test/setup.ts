import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { configure } from '@testing-library/react'

// findBy* default timeout (1s) is too tight when 23 jsdom suites run in
// parallel workers; storage roundtrips intermittently exceed it.
configure({ asyncUtilTimeout: 4000 })

// jsdom has no matchMedia. Report reduced-motion as active so animated
// components (count-up, flips) render final states synchronously in tests.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
