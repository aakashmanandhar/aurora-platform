import { useId } from 'react'

/** Aurora's mark: a planet whose sky is lit by an aurora. The wave between them doubles as a data line. */
export function LogoMark({ className = 'size-7' }: { className?: string }) {
  const id = useId()
  const gradient = `${id}-sky`
  const clip = `${id}-planet`
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradient} x1="8" y1="40" x2="56" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1fc8a9" />
          <stop offset="1" stopColor="#7c5cff" />
        </linearGradient>
        <clipPath id={clip}>
          <circle cx="32" cy="32" r="26" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <path d="M0 0 H64 V31 C 54 29, 46 27, 36 35 C 24 45, 14 25, 0 38 Z" fill={`url(#${gradient})`} />
        <path d="M0 38 C 14 25, 24 45, 36 35 C 46 27, 54 29, 64 31 V64 H0 Z" fill="currentColor" />
      </g>
    </svg>
  )
}

/** The mark and the name together, as shown at the top of the rail. */
export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-xl font-semibold tracking-tight">Aurora</span>
    </span>
  )
}
