import { CalendarCheck, ChevronRight } from 'lucide-react'
import { motion } from 'motion/react'
import { useCities, useHealth } from '../lib/api'
import { describeAnomaly, formatDate } from '../lib/format'
import { anomalyColor } from '../lib/scale'
import { Globe } from './Globe'

type Props = {
  selectedId: number | null
  onSelect: (id: number) => void
}

export function Sidebar({ selectedId, onSelect }: Props) {
  const cities = useCities()
  const health = useHealth()

  // The three cities furthest from their normal right now.
  const standouts = [...(cities.data ?? [])]
    .filter((c) => c.has_history && c.anomaly_30d_c !== null)
    .sort((a, b) => Math.abs(b.anomaly_30d_c!) - Math.abs(a.anomaly_30d_c!))
    .slice(0, 3)

  return (
    <aside className="relative isolate overflow-hidden bg-night text-white lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto">
      <div className="grid gap-6 p-6">
        <div className="flex items-center justify-between">
          <span className="text-xl font-semibold tracking-tight">Aurora</span>
          {health.data?.data_through && (
            <span className="flex items-center gap-2 font-condensed text-sm text-white/65">
              <CalendarCheck className="size-4" aria-hidden="true" />
              Data through {formatDate(health.data.data_through)}
            </span>
          )}
        </div>

        <div className="grid gap-3">
          <h1 className="text-2xl font-semibold leading-snug tracking-tight text-balance">
            How is your city's climate changing, and what comes next?
          </h1>
          <p className="text-sm leading-relaxed text-pretty text-white/70">
            Aurora turns 86 years of weather records into a clear picture of each city's climate, and uses
            machine learning to show what comes next and how sure it is.
          </p>
        </div>

        {cities.data && <Globe cities={cities.data} selectedId={selectedId} onSelect={onSelect} />}

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
                    aria-pressed={city.location_id === selectedId}
                    className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-white/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aurora-teal aria-pressed:bg-white/10"
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full ring-1 ring-white/60"
                      style={{ background: anomalyColor(city.anomaly_30d_c!) }}
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

        {cities.isError && (
          <p role="alert" className="text-sm text-white/75">
            The city data could not be loaded. {cities.error.message} Try refreshing the page.
          </p>
        )}
      </div>
    </aside>
  )
}
