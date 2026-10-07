"""Geocode the city list and land the raw results in the bronze landing volume."""
from __future__ import annotations

import argparse
import csv
import json
import os
import time
from datetime import datetime, timezone

import requests

GEOCODER = "https://geocoding-api.open-meteo.com/v1/search"


def geocode(city: str, country_code: str) -> dict | None:
    """Return the most populous match for a city within the given country."""
    r = requests.get(
        GEOCODER,
        params={"name": city, "count": 10, "language": "en", "format": "json"},
        timeout=30,
    )
    r.raise_for_status()
    hits = [h for h in r.json().get("results", []) if h.get("country_code") == country_code]
    return max(hits, key=lambda h: h.get("population") or 0) if hits else None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--locations", required=True)
    parser.add_argument("--landing", default="/Volumes/aurora/bronze/landing")
    args = parser.parse_args()

    with open(args.locations, encoding="utf-8") as f:
        cities = list(csv.DictReader(f))

    records, missing = [], []
    for row in cities:
        match = geocode(row["city"], row["country_code"])
        if match is None:
            missing.append(row)
            continue
        records.append({
            "requested_city": row["city"],
            "requested_country_code": row["country_code"],
            **match,
        })
        time.sleep(0.5)

    if missing:
        raise ValueError(f"Could not geocode: {missing}")

    run_ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_dir = os.path.join(args.landing, "locations")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"locations_{run_ts}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(f"Wrote {len(records)} locations to {out_path}")


if __name__ == "__main__":
    main()
