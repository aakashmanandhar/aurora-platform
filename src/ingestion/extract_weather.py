"""Pull daily weather per location from Open-Meteo and land the raw replies.

Locations that already have history get a cheap recent-days update. Locations
without history get a full backfill, limited per run because one full-history
request counts as roughly 1,100 calls against the free API allowance.
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import time
from datetime import date, datetime, timedelta, timezone

import requests
from pyspark.errors import AnalysisException
from pyspark.sql import SparkSession

ARCHIVE = "https://archive-api.open-meteo.com/v1/archive"
DAILY_VARS = [
    "temperature_2m_max",
    "temperature_2m_min",
    "temperature_2m_mean",
    "precipitation_sum",
    "wind_gusts_10m_max",
]
ARCHIVE_LAG_DAYS = 6


class RateLimitError(RuntimeError):
    """The API refused a request because a call limit was reached."""


def latest_locations(landing: str) -> list[dict]:
    """Read the most recent locations file from the landing volume."""
    files = sorted(glob.glob(os.path.join(landing, "locations", "locations_*.json")))
    if not files:
        raise FileNotFoundError("No locations file found. Run extract_locations first.")
    with open(files[-1], encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def rate_limit_reason(response: requests.Response) -> str:
    """Return the API's own explanation for a refused request, if it gave one."""
    try:
        return str(response.json().get("reason", response.text[:200]))
    except ValueError:
        return response.text[:200]


def fetch(loc: dict, start: str, end: str) -> dict:
    """Request daily weather for one location, waiting out per-minute limits only."""
    params = {
        "latitude": loc["latitude"],
        "longitude": loc["longitude"],
        "start_date": start,
        "end_date": end,
        "daily": ",".join(DAILY_VARS),
        "timezone": "auto",
    }
    reason = "unknown"
    for attempt in range(4):
        r = requests.get(ARCHIVE, params=params, timeout=120)
        if r.status_code == 429:
            reason = rate_limit_reason(r)
            print(f"Rate limited for location {loc['id']} (attempt {attempt + 1}): {reason}")
            if "minutely" not in reason.lower():
                # Hourly and daily limits will not clear during a job run, so stop now.
                break
            time.sleep(60)
            continue
        r.raise_for_status()
        return r.json()
    raise RateLimitError(f"location {loc['id']}: {reason}")


def locations_with_history(spark: SparkSession, catalog: str, history_start: str) -> set[int]:
    """Ask silver which locations already hold data reaching back to the history start."""
    try:
        rows = spark.sql(
            f"""
            SELECT location_id
            FROM {catalog}.silver.weather_daily
            GROUP BY location_id
            HAVING min(weather_date) <= date_add(DATE'{history_start}', 31)
            """
        ).collect()
    except AnalysisException:
        print("Silver table not found: treating every location as new.")
        return set()
    return {int(r["location_id"]) for r in rows}


def land(out_dir: str, loc: dict, start: str, end: str, run_ts: str, payload: dict) -> None:
    """Write one raw API reply, wrapped with what was asked for and when."""
    record = {
        "location_id": loc["id"],
        "requested_start": start,
        "requested_end": end,
        "extracted_at": run_ts,
        "payload": payload,
    }
    out_path = os.path.join(out_dir, f"weather_{loc['id']}_{run_ts}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(record, f)
    print(f"{loc['name']}: {len(payload['daily']['time'])} days -> {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--landing", required=True)
    parser.add_argument("--catalog", required=True)
    parser.add_argument("--history-start", default="1940-01-01")
    parser.add_argument("--lookback-days", type=int, default=14)
    parser.add_argument("--max-backfills", type=int, default=4)
    args = parser.parse_args()

    end_date = datetime.now(timezone.utc).date() - timedelta(days=ARCHIVE_LAG_DAYS)
    end = end_date.isoformat()
    recent_start = (end_date - timedelta(days=args.lookback_days)).isoformat()
    date.fromisoformat(args.history_start)  # fail early on a malformed date

    run_ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_dir = os.path.join(args.landing, "openmeteo_daily")
    os.makedirs(out_dir, exist_ok=True)

    spark = SparkSession.builder.getOrCreate()
    locations = latest_locations(args.landing)
    known = locations_with_history(spark, args.catalog, args.history_start)
    current = [loc for loc in locations if loc["id"] in known]
    new = [loc for loc in locations if loc["id"] not in known]
    print(f"{len(current)} locations have history, {len(new)} need a backfill")

    # Cheap updates first, so a backfill hitting a limit cannot block the daily refresh.
    for loc in current:
        land(out_dir, loc, recent_start, end, run_ts, fetch(loc, recent_start, end))
        time.sleep(1)

    done = 0
    for loc in new[: args.max_backfills]:
        try:
            payload = fetch(loc, args.history_start, end)
        except RateLimitError as exc:
            print(f"Backfill paused: {exc}")
            break
        land(out_dir, loc, args.history_start, end, run_ts, payload)
        done += 1
        time.sleep(1)

    print(f"Done: {len(current)} updated, {done} backfilled, {len(new) - done} still waiting")


if __name__ == "__main__":
    main()
