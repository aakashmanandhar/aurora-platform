import type { ReactNode } from 'react'

type Props = {
  icon: ReactNode
  title: string
  children?: ReactNode
  action?: { label: string; onClick: () => void }
  role?: 'alert' | 'status'
}

/** A panel that explains a state the dashboard is in: loading, waiting or failed. */
export function Notice({ icon, title, children, action, role = 'status' }: Props) {
  return (
    <div role={role} className="rounded-2xl bg-surface p-6 ring-1 ring-rule">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {icon}
        {title}
      </h2>
      {children && <div className="mt-2 max-w-prose text-pretty text-graphite">{children}</div>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
