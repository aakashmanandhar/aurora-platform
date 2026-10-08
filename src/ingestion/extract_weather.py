"""Pull daily weather per location from Open-Meteo and land the raw replies."""
from __future__ import annotations

import argparse
import glob
import json
import os
import time
from datetime import datetime, timedelta, timezone

import requests

ARCHIVE = "https://archive-api.open-meteo.com/v1/archive"
DAILY_VARS = [
    "temperature_2m_max",
    "temperature_2m_min",
    "temperature_2m_mean",
    "precipitation_sum",
    "wind_gusts_10m_max",
]
ARCHIVE_LAG_DAYS = 6


def latest_locations(landing: str) -> list[dict]:
    """Read the most recent locations file from the landing volume."""
    files = sorted(glob.glob(os.path.join(landing, "locations", "locations_*.json")))
    if not files:
        raise FileNotFoundError("No locations file found. Run extract_locations first.")
    with open(files[-1], encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def fetch(loc: dict, start: str, end: str) -> dict:
    """Request daily weather for one location, backing off if rate limited."""
    params = {
        "latitude": loc["latitude"],
        "longitude": loc["longitude"],
        "start_date": start,
        "end_date": end,
        "daily": ",".join(DAILY_VARS),
        "timezone": "auto",
    }
    for attempt in range(4):
        r = requests.get(ARCHIVE, params=params, timeout=120)
        if r.status_code == 429:
            time.sleep(30 * (attempt + 1))
            continue
        r.raise_for_status()
        return r.json()
    raise RuntimeError(f"Rate limited after retries for location {loc['id']}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--landing", default="/Volumes/aurora/bronze/landing")
    parser.add_argument("--start-date", default=None)
    parser.add_argument("--lookback-days", type=int, default=14)
    args = parser.parse_args()

    end = datetime.now(timezone.utc).date() - timedelta(days=ARCHIVE_LAG_DAYS)
    start = args.start_date or (end - timedelta(days=args.lookback_days)).isoformat()

    run_ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_dir = os.path.join(args.landing, "openmeteo_daily")
    os.makedirs(out_dir, exist_ok=True)

    locations = latest_locations(args.landing)
    for loc in locations:
        payload = fetch(loc, start, end.isoformat())
        record = {
            "location_id": loc["id"],
            "requested_start": start,
            "requested_end": end.isoformat(),
            "extracted_at": run_ts,
            "payload": payload,
        }
        out_path = os.path.join(out_dir, f"weather_{loc['id']}_{run_ts}.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(record, f)
        print(f"{loc['name']}: {len(payload['daily']['time'])} days -> {out_path}")
        time.sleep(1)

    print(f"Done: {len(locations)} locations, {start} to {end.isoformat()}")


if __name__ == "__main__":
    main()
