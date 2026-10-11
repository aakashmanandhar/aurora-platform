import { useReducedMotion } from 'motion/react'
import type { PointerEvent } from 'react'
import type { YearRow } from '../lib/api'
import { describeVsAverage } from '../lib/format'
import { CHART, YEAR_LIMIT, anomalyColor } from '../lib/scale'
import { useElementWidth } from '../lib/useElementWidth'

const AXIS = 26
/** Matches the bar chart's left margin, so each year sits directly above its bar. */
const LEFT = 44

type Props = {
  years: YearRow[]
  height?: number
  showAxis?: boolean
  active: YearRow | null
  onActive: (year: YearRow | null) => void
}

export function WarmingStripes({ years, height: HEIGHT = 150, showAxis = true, active, onActive }: Props) {
  const [frame, width] = useElementWidth<HTMLDivElement>()
  const reduceMotion = useReducedMotion()
  const total = HEIGHT + (showAxis ? AXIS : 0)

  if (width === 0 || years.length === 0) {
    return <div ref={frame} style={{ height: total }} />
  }

  const band = (width - LEFT) / years.length
  const x = (i: number) => LEFT + i * band
  const first = years[0].year
  const last = years[years.length - 1].year

  const pick = (event: PointerEvent<SVGSVGElement>) => {
    const px = event.clientX - event.currentTarget.getBoundingClientRect().left
    const index = Math.min(years.length - 1, Math.max(0, Math.floor((px - LEFT) / band)))
    if (years[index] !== active) onActive(years[index])
  }

  return (
    <div ref={frame}>
      <svg
        width={width}
        height={total}
        role="img"
        aria-label={`One coloured stripe per year from ${first} to ${last}, blue for colder and red for warmer than the 1961 to 1990 average`}
        className="block"
        style={{ touchAction: 'pan-y' }}
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={() => onActive(null)}
      >
        {years.map((d, i) => (
          <rect
            key={d.year}
            x={x(i)}
            y={0}
            width={band + 0.6}
            height={HEIGHT}
            fill={anomalyColor(d.anomaly_c, YEAR_LIMIT)}
            className={reduceMotion ? undefined : 'stripe-in'}
            style={reduceMotion ? undefined : { animationDelay: `${i * 9}ms` }}
          />
        ))}
        {active && (
          <rect
            x={x(active.year - first)}
            y={1}
            width={band}
            height={HEIGHT - 2}
            fill="none"
            stroke={CHART.ink}
            strokeWidth={2}
            pointerEvents="none"
          />
        )}
        {years.map((d, i) =>
          showAxis && d.year % 20 === 0 ? (
            <text
              key={d.year}
              x={x(i) + band / 2}
              y={HEIGHT + 18}
              textAnchor="middle"
              className="fill-graphite font-condensed text-[13px]"
            >
              {d.year}
            </text>
          ) : null,
        )}
      </svg>
      <p className="mt-1 min-h-5 text-xs text-graphite" style={{ paddingLeft: LEFT }}>
        {active ? (
          <span className="text-sm text-ink">
            {active.year} was {describeVsAverage(active.anomaly_c)}.
          </span>
        ) : (
          `Each stripe is one year, from ${first} to ${last}. Point at a year to read it.`
        )}
      </p>
    </div>
  )
}
