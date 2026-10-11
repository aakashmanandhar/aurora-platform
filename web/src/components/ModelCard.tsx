import { ShieldCheck } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useSkill } from '../lib/api'
import type { SkillRow } from '../lib/api'
import { Card } from './Card'
import { SKILL_COLORS, SkillChart } from './SkillChart'

function Key({ style, label }: { style: CSSProperties; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="inline-block w-5" style={style} aria-hidden="true" />
      {label}
    </span>
  )
}

const percent = (row: SkillRow) => Math.round(row.skill_vs_recent_normal * 100)

export function ModelCard() {
  const skill = useSkill()
  if (!skill.data || skill.data.length < 2) return null

  const rows = skill.data
  const first = rows[0]
  const last = rows[rows.length - 1]
  const coverage = Math.round((rows.reduce((sum, r) => sum + r.coverage_80, 0) / rows.length) * 100)

  return (
    <Card
      icon={<ShieldCheck className="size-5" aria-hidden="true" />}
      title="Can you trust the forecast?"
      takeaway={
        <>
          Tested on {first.first_test_year} to {first.last_test_year}, weather it had never seen. One day ahead it
          beat a simple guess by <strong className="font-semibold text-ink">{percent(first)}%</strong>, and seven
          days ahead by only {percent(last)}%.
        </>
      }
    >
      <div className="grid gap-2">
        <SkillChart rows={rows} height={200} />
        <p className="flex flex-wrap gap-x-5 gap-y-1 font-condensed text-xs text-graphite">
          <Key style={{ borderTop: `2.5px solid ${SKILL_COLORS.model}` }} label="Aurora's model" />
          <Key style={{ borderTop: `2px solid ${SKILL_COLORS.typical}` }} label="Guessing typical recent weather" />
          <Key style={{ borderTop: `2px dashed ${SKILL_COLORS.noChange}` }} label="Assuming no change" />
        </p>
        <p className="text-xs text-graphite">
          Its ranges held the real temperature {coverage}% of the time. They are built to hold it 80% of the time.
        </p>
      </div>
    </Card>
  )
}
