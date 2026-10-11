import { geoDistance, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import landTopology from 'world-atlas/land-110m.json'
import type { City } from '../lib/api'
import { describeAnomaly } from '../lib/format'
import { ANOMALY_GRADIENT, ANOMALY_LIMIT, anomalyColor } from '../lib/scale'

type Rotation = [number, number]

type Props = {
  cities: City[]
  selectedId: number | null
  onSelect: (id: number) => void
}

const SIZE = 480
const topology = landTopology as unknown as Topology<{ land: GeometryCollection }>
const LAND = feature(topology, topology.objects.land)
const GRATICULE = geoGraticule10()

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function Globe({ cities, selectedId, onSelect }: Props) {
  const [rotation, setRotationState] = useState<Rotation>([-15, -20])
  const rotationRef = useRef<Rotation>([-15, -20])
  const interacted = useRef(false)
  const hovering = useRef(false)
  const drag = useRef<{ x: number; y: number; from: Rotation } | null>(null)
  const [hovered, setHovered] = useState<City | null>(null)

  const setRotation = (next: Rotation) => {
    rotationRef.current = next
    setRotationState(next)
  }

  // Turn slowly until the visitor touches the globe or picks a city.
  useEffect(() => {
    if (reducedMotion()) return
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      if (interacted.current) return
      if (!hovering.current) {
        const [lambda, phi] = rotationRef.current
        setRotation([lambda + (now - last) * 0.004, phi])
      }
      last = now
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  const selected = cities.find((c) => c.location_id === selectedId) ?? null
  const selectedLon = selected?.longitude
  const selectedLat = selected?.latitude

  // When a city is chosen, turn the globe to face it by the shortest route.
  useEffect(() => {
    if (selectedLon === undefined || selectedLat === undefined) return
    interacted.current = true
    const from = rotationRef.current
    const target: Rotation = [-selectedLon, -selectedLat * 0.7]
    const turn = ((((target[0] - from[0]) % 360) + 540) % 360) - 180
    if (reducedMotion()) {
      setRotation([from[0] + turn, target[1]])
      return
    }
    let frame = 0
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 900)
      const eased = 1 - (1 - t) ** 3
      setRotation([from[0] + turn * eased, from[1] + (target[1] - from[1]) * eased])
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [selectedLon, selectedLat])

  const projection = useMemo(
    () =>
      geoOrthographic()
        .scale(SIZE / 2 - 8)
        .translate([SIZE / 2, SIZE / 2])
        .rotate([rotation[0], rotation[1]])
        .clipAngle(90),
    [rotation],
  )
  const path = useMemo(() => geoPath(projection), [projection])
  const centre: [number, number] = [-rotation[0], -rotation[1]]

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    interacted.current = true
    drag.current = { x: e.clientX, y: e.clientY, from: rotationRef.current }
  }
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return
    const { x, y, from } = drag.current
    const phi = Math.max(-60, Math.min(60, from[1] - (e.clientY - y) * 0.35))
    setRotation([from[0] + (e.clientX - x) * 0.35, phi])
  }
  const endDrag = () => {
    drag.current = null
  }

  const isVisible = (c: City) =>
    geoDistance([c.longitude, c.latitude], centre) <= Math.PI / 2 - 0.05
  const focus = (hovered && isVisible(hovered) ? hovered : null) ?? selected
  const caption = !focus
    ? 'Drag the globe to turn it. Select a city to see its story.'
    : focus.has_history && focus.anomaly_30d_c !== null
      ? `${focus.city}, ${focus.country}: ${describeAnomaly(focus.anomaly_30d_c)} over the last 30 days`
      : `${focus.city}, ${focus.country}: history still loading`

  return (
    <div className="relative mx-auto w-full max-w-[480px]">
      <div className="aurora-halo -z-10" aria-hidden="true" />
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="group"
        aria-label="Globe showing how far each city is from its usual temperature"
        className="w-full cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerEnter={() => {
          hovering.current = true
        }}
        onPointerLeave={() => {
          hovering.current = false
          setHovered(null)
          endDrag()
        }}
      >
        <defs>
          <radialGradient id="ocean" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#1b3a5c" />
            <stop offset="100%" stopColor="#0c1f38" />
          </radialGradient>
        </defs>
        <path d={path({ type: 'Sphere' }) ?? undefined} fill="url(#ocean)" stroke="rgba(255,255,255,0.2)" />
        <path d={path(GRATICULE) ?? undefined} fill="none" stroke="rgba(255,255,255,0.07)" />
        <path d={path(LAND) ?? undefined} fill="rgba(255,255,255,0.13)" stroke="rgba(255,255,255,0.28)" strokeWidth={0.5} />

        {cities.map((city) => {
          const point: [number, number] = [city.longitude, city.latitude]
          if (geoDistance(point, centre) > Math.PI / 2 - 0.05) return null
          const xy = projection(point)
          if (!xy) return null
          const isSelected = city.location_id === selectedId
          const known = city.has_history && city.anomaly_30d_c !== null
          return (
            <circle
              key={city.location_id}
              cx={xy[0]}
              cy={xy[1]}
              r={isSelected ? 8 : 6}
              fill={known ? anomalyColor(city.anomaly_30d_c!) : 'transparent'}
              stroke="white"
              strokeWidth={isSelected ? 2.5 : 1.25}
              role="button"
              tabIndex={0}
              aria-label={`${city.city}, ${city.country}`}
              aria-pressed={isSelected}
              className="cursor-pointer outline-none focus-visible:stroke-aurora-teal"
              onClick={() => onSelect(city.location_id)}
              onKeyDown={(e: KeyboardEvent<SVGCircleElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(city.location_id)
                }
              }}
              onPointerEnter={() => setHovered(city)}
              onPointerLeave={() => setHovered(null)}
            />
          )
        })}
      </svg>

      <p className="mt-4 min-h-10 text-center text-sm text-pretty text-white/80" aria-live="polite">
        {caption}
      </p>

      <div className="mx-auto mt-2 w-60 font-condensed text-xs text-white/60">
        <div className="h-1.5 rounded-full" style={{ background: ANOMALY_GRADIENT }} />
        <div className="mt-1.5 flex justify-between">
          <span>{ANOMALY_LIMIT} °C colder</span>
          <span>usual</span>
          <span>{ANOMALY_LIMIT} °C warmer</span>
        </div>
      </div>
    </div>
  )
}
