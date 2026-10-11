import { CalendarCheck, ChevronRight, LayoutDashboard, Workflow } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useCities, useHealth } from '../lib/api'
import { describeAnomaly, formatDate } from '../lib/format'
import { anomalyColor } from '../lib/scale'
import type { View } from '../lib/useHashView'
import { Credits } from './Credits'
import { Globe } from './Globe'

type Props = {
  view: View
  selectedId: number | null
  onSelect: (id: number) => void
}

function Tab({ href, current, icon, label }: { href: string; current: boolean; icon: ReactNode; label: string }) {
  return (
    <a
      href={href}
      aria-current={current ? 'page' : undefined}
      className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 font-medium text-white/65 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aurora-teal aria-[current=page]:bg-white/12 aria-[current=page]:text-white"
    >
      {icon}
      {label}
    </a>
  )
}

export function Sidebar({ view, selectedId, onSelect }: Props) {
  const cities = useCities()
  const health = useHealth()

  // The three cities furthest from their normal right now.
  const standouts = [...(cities.data ?? [])]
    .filter((c) => c.has_history && c.anomaly_30d_c !== null)
    .sort((a, b) => Math.abs(b.anomaly_30d_c!) - Math.abs(a.anomaly_30d_c!))
    .slice(0, 3)

  return (
    <aside className="relative isolate overflow-hidden bg-night text-white lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto">
      <div className="flex min-h-full flex-col gap-5 p-6">
        <div className="flex items-center justify-between">
          <span className="text-xl font-semibold tracking-tight">Aurora</span>
          {health.data?.data_through && (
            <span className="flex items-center gap-2 font-condensed text-sm text-white/65">
              <CalendarCheck className="size-4" aria-hidden="true" />
              Data through {formatDate(health.data.data_through)}
            </span>
          )}
        </div>

        <nav aria-label="Views" className="grid grid-cols-2 gap-1 rounded-xl bg-white/6 p-1 text-sm">
          <Tab
            href="#dashboard"
            current={view === 'dashboard'}
            icon={<LayoutDashboard className="size-4" aria-hidden="true" />}
            label="Dashboard"
          />
          <Tab
            href="#about"
            current={view === 'about'}
            icon={<Workflow className="size-4" aria-hidden="true" />}
            label="How it's built"
          />
        </nav>

        <div className="grid gap-3">
          <h1 className="text-2xl font-semibold leading-snug tracking-tight text-balance">
            How is your city's climate changing, and what comes next?
          </h1>
          <p className="text-sm leading-relaxed text-pretty text-white/70">
            Aurora turns 86 years of weather records into a clear picture of each city's climate, and uses
            machine learning to show what comes next and how sure it is.
          </p>
        </div>

        {cities.data && (
          <div className="mx-auto w-full max-w-[300px]">
            <Globe cities={cities.data} selectedId={selectedId} onSelect={onSelect} />
          </div>
        )}

        {standouts.length > 0 && (
          <section aria-labelledby="standouts-title">
            <h2 id="standouts-title" className="text-sm font-medium text-white/60">
              Furthest from usual over the last 30 days
            </h2>
            <ul className="-mx-3 mt-2 grid gap-0.5">
              {standouts.map((city, i) => (
                <motion.li
                  key={city.location_id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08, ease: 'easeOut' }}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(city.location_id)}
                    aria-pressed={view === 'dashboard' && city.location_id === selectedId}
                    className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-white/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aurora-teal aria-pressed:bg-white/10"
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full ring-1 ring-white/60"
                      style={{ background: anomalyColor(city.anomaly_30d_c) }}
                      aria-hidden="true"
                    />
                    <span className="font-medium">{city.city}</span>
                    <span className="ml-auto font-condensed text-white/80">{describeAnomaly(city.anomaly_30d_c!)}</span>
                    <ChevronRight className="size-4 text-white/40 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </button>
                </motion.li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-auto">
          <Credits />
        </div>
      </div>
    </aside>
  )
}
