import { CalendarCheck, ChevronRight, MapPin } from 'lucide-react'
import { motion } from 'motion/react'
import { useCities, useHealth } from '../lib/api'
import { describeAnomaly, formatDate } from '../lib/format'
import { anomalyColor } from '../lib/scale'
import { Globe } from './Globe'

type Props = {
  selectedId: number | null
  onSelect: (id: number) => void
}

export function Hero({ selectedId, onSelect }: Props) {
  const cities = useCities()
  const health = useHealth()

  const withData = cities.data?.filter((c) => c.has_history && c.anomaly_30d_c !== null) ?? []
  // The three cities furthest from their normal right now.
  const standouts = [...withData]
    .sort((a, b) => Math.abs(b.anomaly_30d_c!) - Math.abs(a.anomaly_30d_c!))
    .slice(0, 3)
  const alphabetical = [...(cities.data ?? [])].sort((a, b) => a.city.localeCompare(b.city))

  return (
    <header className="relative isolate overflow-hidden bg-night text-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <nav className="flex h-16 items-center justify-between">
          <span className="text-xl font-semibold tracking-tight">Aurora</span>
          {health.data?.data_through && (
            <span className="flex items-center gap-2 font-condensed text-sm text-white/70">
              <CalendarCheck className="size-4" aria-hidden="true" />
              Data through {formatDate(health.data.data_through)}
            </span>
          )}
        </nav>

        <div className="grid items-start gap-12 pb-16 pt-10 lg:grid-cols-12 lg:pt-14">
          <div className="grid gap-8 lg:col-span-7">
            <div className="grid gap-5">
              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl">
                How is your city's climate changing, and what comes next?
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-pretty text-white/75">
                Aurora turns 86 years of weather records into a clear picture of how each city's
                climate is changing, and uses machine learning to show what comes next and how sure it is.
              </p>
            </div>

            {standouts.length > 0 && (
              <section aria-labelledby="standouts-title" className="max-w-xl">
                <h2 id="standouts-title" className="text-sm font-medium text-white/60">
                  Furthest from usual over the last 30 days
                </h2>
                <ul className="-mx-3 mt-2 grid gap-1">
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
                        className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aurora-teal aria-pressed:bg-white/10"
                      >
                        <span
                          className="size-3 shrink-0 rounded-full ring-1 ring-white/60"
                          style={{ background: anomalyColor(city.anomaly_30d_c!) }}
                          aria-hidden="true"
                        />
                        <span className="font-medium">{city.city}</span>
                        <span className="text-white/55">{city.country}</span>
                        <span className="ml-auto font-condensed text-white/85">
                          {describeAnomaly(city.anomaly_30d_c!)}
                        </span>
                        <ChevronRight className="size-4 text-white/40 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </button>
                    </motion.li>
                  ))}
                </ul>
              </section>
            )}

            {alphabetical.length > 0 && (
              <label className="flex max-w-xl items-center gap-3 text-sm text-white/70">
                <MapPin className="size-4 shrink-0" aria-hidden="true" />
                <span className="shrink-0">Or choose any city</span>
                <select
                  value={selectedId ?? ''}
                  onChange={(e) => e.target.value && onSelect(Number(e.target.value))}
                  className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/8 px-3 py-2 text-base text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aurora-teal"
                >
                  <option value="" className="text-ink">Select a city</option>
                  {alphabetical.map((city) => (
                    <option key={city.location_id} value={city.location_id} className="text-ink">
                      {city.city}, {city.country}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {cities.isError && (
              <p role="alert" className="max-w-2xl text-white/75">
                The city data could not be loaded. {cities.error.message} Try refreshing the page.
              </p>
            )}
          </div>

          <div className="lg:col-span-5">
            {cities.data && <Globe cities={cities.data} selectedId={selectedId} onSelect={onSelect} />}
          </div>
        </div>
      </div>
    </header>
  )
}
