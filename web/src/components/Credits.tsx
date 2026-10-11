import { Globe as GlobeIcon } from 'lucide-react'
import type { ReactNode } from 'react'

const LINKS: { href: string; label: string; icon: ReactNode }[] = [
  {
    href: 'https://aakashmanandhar.tech/',
    label: 'Website',
    icon: <GlobeIcon className="size-4" aria-hidden="true" />,
  },
  {
    href: 'https://www.linkedin.com/in/aakashmanandhar/',
    label: 'LinkedIn',
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    href: 'https://github.com/aakashmanandhar',
    label: 'GitHub',
    icon: (
      <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden="true">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
      </svg>
    ),
  },
]

/** Who built the site, and where the weather data comes from. */
export function Credits() {
  return (
    <footer className="grid gap-3 border-t border-white/10 pt-5">
      <p className="text-sm text-white/70">
        Designed and developed by <span className="font-semibold text-white">Aakash Manandhar</span>
      </p>
      <ul className="flex flex-wrap gap-2">
        {LINKS.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 ring-1 ring-white/15 transition-colors hover:bg-white/8 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aurora-teal"
            >
              {link.icon}
              {link.label}
            </a>
          </li>
        ))}
      </ul>
      <p className="font-condensed text-xs leading-relaxed text-white/50">
        Weather data by{' '}
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-white focus-visible:outline-2 focus-visible:outline-aurora-teal"
        >
          Open-Meteo.com
        </a>
        , licensed CC BY 4.0. Map outlines from Natural Earth.
      </p>
    </footer>
  )
}
