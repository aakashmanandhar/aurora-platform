import type { ReactNode } from 'react'

type Props = {
  icon: ReactNode
  title: string
  takeaway?: ReactNode
  children: ReactNode
  className?: string
}

/** One panel of the dashboard: a title, a one-sentence takeaway and its content. */
export function Card({ icon, title, takeaway, children, className = '' }: Props) {
  return (
    <section className={`flex flex-col rounded-2xl bg-surface p-5 ring-1 ring-rule ${className}`}>
      <h3 className="flex items-center gap-2 text-base font-semibold">
        {icon}
        {title}
      </h3>
      {takeaway && <p className="mt-1 text-sm text-pretty text-graphite">{takeaway}</p>}
      <div className="mt-4 flex-1">{children}</div>
    </section>
  )
}
