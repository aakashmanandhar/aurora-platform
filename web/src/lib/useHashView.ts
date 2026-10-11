import { useSyncExternalStore } from 'react'

export type View = 'dashboard' | 'about'

const subscribe = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

const read = (): View => (window.location.hash === '#about' ? 'about' : 'dashboard')

/** Which view is showing, taken from the address so that it can be linked to and bookmarked. */
export const useHashView = () => useSyncExternalStore(subscribe, read)
