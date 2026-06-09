import { useEffect, useState } from 'react'

/**
 * Tiny zero-dependency hash router.
 *   #/                  → landing
 *   #/chatbots          → hub gallery
 *   #/chatbots/<id>     → bot detail / preview
 */
export type Route =
  | { name: 'landing' }
  | { name: 'hub' }
  | { name: 'detail'; id: string }

function readRoute(): Route {
  const hash = window.location.hash.replace(/^#/, '')
  const parts = hash.split('/').filter(Boolean) // '/chatbots/navio' → ['chatbots','navio']
  if (parts[0] === 'chatbots') {
    return parts[1] ? { name: 'detail', id: parts[1] } : { name: 'hub' }
  }
  return { name: 'landing' }
}

export function navigate(to: string) {
  const target = to.startsWith('/') ? to : `/${to}`
  if (window.location.hash.replace(/^#/, '') !== target) {
    window.location.hash = target
  }
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(readRoute)

  useEffect(() => {
    const onChange = () => setRoute(readRoute())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}
