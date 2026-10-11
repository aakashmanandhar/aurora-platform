import {
  BrainCircuit,
  CloudDownload,
  Code,
  Database,
  GitBranch,
  Inbox,
  Layers,
  MonitorSmartphone,
  Server,
  ShieldCheck,
  Table2,
  TriangleAlert,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useCities, useHealth } from '../lib/api'
import { toDate } from '../lib/format'
import { Card } from './Card'

const REPO = 'https://github.com/aakashmanandhar/aurora-platform'

const STAGES: { icon: LucideIcon; name: string; tool: string }[] = [
  { icon: CloudDownload, name: 'Collect', tool: 'Open-Meteo API, Python' },
  { icon: Inbox, name: 'Land', tool: 'Unity Catalog volume' },
  { icon: Layers, name: 'Clean', tool: 'Lakeflow pipeline' },
  { icon: Table2, name: 'Model the data', tool: 'dbt, Delta Lake' },
  { icon: BrainCircuit, name: 'Forecast', tool: 'LightGBM, MLflow' },
  { icon: Server, name: 'Serve', tool: 'FastAPI, DuckDB' },
  { icon: MonitorSmartphone, name: 'Show', tool: 'React, TypeScript' },
]

const SECTIONS: { icon: LucideIcon; title: string; summary: string; points: [string, string][] }[] = [
  {
    icon: Database,
    title: 'The data',
    summary: 'Daily weather for 40 cities, from 1 January 1940 to a few days ago.',
    points: [
      ['Source', 'The Open-Meteo Historical Weather API, which is built on ERA5 reanalysis: a physically consistent reconstruction of past weather. City coordinates and elevation come from its geocoding API.'],
      ['What is collected', 'Five daily values per city: mean, highest and lowest temperature, total precipitation and the strongest wind gust. That is about 31,700 days per city.'],
      ['Working within limits', 'The free tier allows about 10,000 weighted calls a day, and one city\'s full history costs about 1,130. The pipeline therefore loads four new cities a day and refreshes the rest with a cheap 14-day request.'],
      ['Licence', 'Open-Meteo data is published under CC BY 4.0 and is credited on every page.'],
    ],
  },
  {
    icon: Layers,
    title: 'Ingestion and storage',
    summary: 'A medallion architecture on Databricks: raw, cleaned, then modelled.',
    points: [
      ['Extraction', 'Python jobs on serverless compute call the API and write the replies, unchanged, as JSON lines into a Unity Catalog volume. The job decides for itself which cities need a backfill, waits out per-minute limits and stops cleanly on daily ones.'],
      ['Bronze', 'A Lakeflow declarative pipeline uses Auto Loader to pick up new files and stores each reply whole in a VARIANT column, so nothing from the source is lost.'],
      ['Silver', 'The daily arrays are unpacked to one row per city and day. An AUTO CDC flow keyed on city and date keeps the newest version of each day, so re-runs and corrections replace rows and never duplicate them.'],
      ['Data quality at the door', 'Pipeline expectations drop rows with a missing key or an incomplete day before they reach the cleaned tables.'],
    ],
  },
  {
    icon: Table2,
    title: 'Modelling and data quality',
    summary: 'A star schema built with dbt, with 23 automated tests on every run.',
    points: [
      ['Star schema', 'Two dimensions (location and date) and a daily weather fact table, built incrementally with MERGE and stored with liquid clustering on city and date.'],
      ['Climate baseline', 'For every city and day of the year, the 1961 to 1990 average, spread and 90th percentile, smoothed over a 15-day window. This is the "usual" that everything is compared with.'],
      ['Anomalies', 'Each day is expressed as degrees above or below its baseline, with flags for hot days and for warm spells of three or more hot days in a row.'],
      ['Tests', 'Uniqueness, not-null and relationship tests on every key, plus a custom test for duplicate facts. A failing test stops the run before anything is published.'],
    ],
  },
  {
    icon: BrainCircuit,
    title: 'Machine learning',
    summary: 'A seven-day temperature forecast with a stated range, tested before it was trusted.',
    points: [
      ['What it predicts', 'How far the daily mean temperature will sit above or below normal, one to seven days ahead. The baseline is added back to give degrees Celsius.'],
      ['Features', 'Recent anomalies (today and 1, 2, 3 and 7 days back), 7- and 30-day averages, 7-day variability, recent rainfall, wind gusts, the daily temperature range, the time of year, latitude and elevation.'],
      ['Model', 'Gradient-boosted trees (LightGBM) trained as quantile regressions for the 10th, 50th and 90th percentiles. Together they give a most likely value and a range meant to hold the truth 80% of the time.'],
      ['Honest testing', 'Backtested on 2023, 2024 and 2025, each time trained only on data from before the test dates, and compared with three simple baselines. The results are on the dashboard, including where the model stops being useful.'],
      ['Lifecycle', 'Runs are tracked in MLflow. The model is registered in Unity Catalog, and a "champion" alias marks the version in use. A daily batch job loads the champion and writes forecasts back to the warehouse.'],
    ],
  },
  {
    icon: Server,
    title: 'Serving and the website',
    summary: 'Small files, a small API and no database server to run.',
    points: [
      ['Serving tables', 'dbt shapes five small tables for exactly what the page shows. They are exported as Parquet, about 80 KB in total.'],
      ['Delivery', 'The export job uploads the files to the site over HTTPS with a secret token. The site holds them aside, checks every file\'s row count against a manifest and only then switches over, so visitors never see a half-updated page.'],
      ['API', 'FastAPI reads the Parquet files in-process with DuckDB. The web server holds no Databricks credentials at all.'],
      ['Front end', 'React and TypeScript, built with Vite and styled with Tailwind CSS. The charts and the globe are drawn directly as SVG, and fonts are served from the site itself.'],
      ['Hosting', 'Two Docker containers behind nginx on a virtual server, with Cloudflare in front.'],
    ],
  },
  {
    icon: GitBranch,
    title: 'DataOps',
    summary: 'Everything is code, every change is reviewed, and production deploys itself.',
    points: [
      ['Continuous integration', 'Every pull request is linted with Ruff, compiled, validated against both environments and built as a front end by GitHub Actions. Nothing merges on a red check.'],
      ['Continuous deployment', 'Merging to main deploys jobs and pipelines to production with Databricks Asset Bundles.'],
      ['Two environments', 'Development and production are separate Unity Catalog catalogs built from the same code. Development uses a short city list and paused schedules, and cannot write to the live site.'],
      ['Infrastructure as code', 'Schemas and volumes are managed with Terraform, one workspace per environment.'],
      ['Orchestration', 'One job runs every day at 05:30 UTC: ingest, pipeline, dbt, scoring, export and delivery, in that order. A failure at any stage stops the chain.'],
      ['Secrets', 'Tokens live in a Databricks secret scope and in GitHub secrets, never in the repository.'],
    ],
  },
]

const STACK: [string, string[]][] = [
  ['Platform', ['Databricks Free Edition', 'Unity Catalog', 'Delta Lake', 'Serverless compute']],
  ['Pipelines', ['Lakeflow Declarative Pipelines', 'Auto Loader', 'dbt', 'SQL', 'PySpark']],
  ['Machine learning', ['LightGBM', 'MLflow', 'pandas', 'Quantile regression']],
  ['Serving', ['FastAPI', 'DuckDB', 'Parquet', 'Docker', 'nginx', 'Cloudflare']],
  ['Front end', ['React 19', 'TypeScript', 'Vite', 'Tailwind CSS 4', 'TanStack Query', 'd3-geo']],
  ['DataOps', ['GitHub Actions', 'Databricks Asset Bundles', 'Terraform', 'Ruff', 'Git']],
]

const LIMITS = [
  'The newest data is about five days old, because the historical archive is published with a delay.',
  'Reanalysis is a reconstruction on a grid, not a reading from a single weather station, so it can differ from local measurements, especially in early decades.',
  'The model learns from each city\'s own past and knows nothing about the atmosphere. That is why its advantage fades after a few days.',
  'Cities are added four a day, so some are still waiting for their history.',
]

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface px-5 py-4 ring-1 ring-rule">
      <dt className="text-sm text-graphite">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tracking-tight">{value}</dd>
    </div>
  )
}

export function About() {
  const cities = useCities()
  const health = useHealth()

  const total = cities.data?.length ?? 0
  const ready = cities.data?.filter((c) => c.has_history).length ?? 0
  const through = health.data?.data_through
  const days = through
    ? Math.round((toDate(through).getTime() - toDate('1940-01-01').getTime()) / 86_400_000) + 1
    : null
  const records = days ? Math.round((ready * days) / 1000) * 1000 : null

  return (
    <>
      <header className="grid gap-4">
        <h2 className="text-3xl font-semibold tracking-tight">How Aurora is built</h2>
        <p className="max-w-3xl text-lg text-pretty text-graphite">
          Aurora is an end-to-end data and machine-learning platform. Every day it collects new weather records,
          checks and models them, forecasts the week ahead and publishes this site, with no manual steps.
        </p>
        <p>
          <a
            href={REPO}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <Code className="size-4" aria-hidden="true" />
            View the code on GitHub
          </a>
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-4 @4xl:grid-cols-4">
        <Figure label="Cities loaded" value={total ? `${ready} of ${total}` : 'Loading'} />
        <Figure label="Daily weather records" value={records ? `About ${records.toLocaleString('en-GB')}` : 'Loading'} />
        <Figure label="Automated data tests" value="23 on every run" />
        <Figure label="Updated" value="Daily at 05:30 UTC" />
      </dl>

      <section aria-labelledby="pipeline-title" className="grid gap-3">
        <h3 id="pipeline-title" className="text-base font-semibold">
          The pipeline, from source to screen
        </h3>
        <ol className="grid grid-cols-2 gap-3 @2xl:grid-cols-4 @6xl:grid-cols-7">
          {STAGES.map((stage, i) => (
            <li key={stage.name} className="rounded-2xl bg-surface p-4 ring-1 ring-rule">
              <div className="flex items-center justify-between">
                <stage.icon className="size-5" aria-hidden="true" />
                <span className="font-condensed text-sm text-graphite">{i + 1}</span>
              </div>
              <p className="mt-3 font-semibold">{stage.name}</p>
              <p className="mt-0.5 text-sm text-graphite">{stage.tool}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-4 @4xl:grid-cols-2">
        {SECTIONS.map((section) => (
          <Card
            key={section.title}
            icon={<section.icon className="size-5" aria-hidden="true" />}
            title={section.title}
            takeaway={section.summary}
          >
            <dl className="grid gap-3 text-sm">
              {section.points.map(([term, text]) => (
                <div key={term}>
                  <dt className="font-medium text-ink">{term}</dt>
                  <dd className="mt-0.5 text-pretty text-graphite">{text}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </div>

      <Card icon={<Wrench className="size-5" aria-hidden="true" />} title="Tools and technologies">
        <div className="grid gap-5 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {STACK.map(([group, tools]) => (
            <div key={group}>
              <h4 className="text-sm font-medium">{group}</h4>
              <ul className="mt-2 flex flex-wrap gap-2">
                {tools.map((tool) => (
                  <li key={tool} className="rounded-full bg-paper px-3 py-1 text-sm text-ink ring-1 ring-rule">
                    {tool}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 @4xl:grid-cols-2">
        <Card
          icon={<TriangleAlert className="size-5" aria-hidden="true" />}
          title="Known limits"
          takeaway="What this site cannot tell you, stated plainly."
        >
          <ul className="grid list-disc gap-2 pl-5 text-sm text-graphite">
            {LIMITS.map((limit) => (
              <li key={limit} className="text-pretty">
                {limit}
              </li>
            ))}
          </ul>
        </Card>
        <Card
          icon={<ShieldCheck className="size-5" aria-hidden="true" />}
          title="Built to be checked"
          takeaway="Every claim on the dashboard can be traced to code."
        >
          <p className="text-sm text-pretty text-graphite">
            The pipelines, the dbt models and their tests, the training and backtest scripts, the API and this
            front end are all in one public repository, along with the history of how each was reviewed and merged.
          </p>
        </Card>
      </div>
    </>
  )
}
