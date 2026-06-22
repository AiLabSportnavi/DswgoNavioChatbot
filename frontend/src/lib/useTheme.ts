import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'navio-theme'

/**
 * Widget colour theme (light / dark). The choice is persisted in localStorage and,
 * on first visit, seeded from the visitor's OS `prefers-color-scheme`. The returned
 * `theme` is meant to drive a `.theme-dark` class on the widget root — all colours
 * are CSS-variable tokens, so toggling that one class re-themes the whole widget.
 */
export function useTheme(): { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void } {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'light' || saved === 'dark') return saved
    } catch {
      /* localStorage can throw in privacy mode — fall through to the media query */
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore — preference simply won't persist */
    }
  }, [theme])

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])

  return { theme, toggle, setTheme }
}
