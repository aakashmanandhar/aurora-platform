import { Hourglass } from 'lucide-react'
import type { City } from '../lib/api'
import { Notice } from './Notice'

type Props = {
  city: City
  ready: City[]
  onSelect: (id: number) => void
}

/** Shown for a city that is on the list but whose history has not been loaded yet. */
export function PendingCity({ city, ready, onSelect }: Props) {
  return (
    <Notice
      icon={<Hourglass className="size-5" aria-hidden="true" />}
      title={`${city.city}'s history is still loading`}
    >
      <p>
        Aurora loads 86 years of records for four more cities each day, so {city.city} will appear here over the
        coming days.
      </p>
      {ready.length > 0 && (
        <>
          <p className="mt-4 text-sm font-medium text-ink">Ready now</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {ready.map((c) => (
              <li key={c.location_id}>
                <button
                  type="button"
                  onClick={() => onSelect(c.location_id)}
                  className="rounded-full bg-paper px-3 py-1.5 text-sm text-ink ring-1 ring-rule hover:bg-rule/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  {c.city}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Notice>
  )
}
