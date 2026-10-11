"""Aurora API: serves the exported serving tables to the website."""
from __future__ import annotations

import json
import math
import os
from pathlib import Path

import duckdb
from fastapi import FastAPI, HTTPException

DATA_DIR = Path(os.environ.get("AURORA_DATA_DIR", "/data/export"))

app = FastAPI(
    title="Aurora API",
    description="Climate and extreme weather data for the Aurora dashboard.",
    version="0.1.0",
    root_path=os.environ.get("AURORA_ROOT_PATH", ""),
)


def source(name: str) -> str:
    """Return a DuckDB expression that reads one exported table."""
    path = DATA_DIR / f"{name}.parquet"
    if not path.exists():
        raise HTTPException(status_code=503, detail=f"Table '{name}' has not been exported yet")
    return f"read_parquet('{path.as_posix()}')"


def clean(value: object) -> object:
    """JSON has no NaN, so send missing numbers as null."""
    return None if isinstance(value, float) and math.isnan(value) else value


def rows(sql: str, params: list | None = None) -> list[dict]:
    """Run a query and return the result as a list of records."""
    with duckdb.connect() as con:
        cur = con.execute(sql, params or [])
        columns = [d[0] for d in cur.description]
        return [dict(zip(columns, map(clean, r), strict=True)) for r in cur.fetchall()]


def city_rows(table: str, location_id: int, order_by: str) -> list[dict]:
    """Rows of one table for one city, or a 404 if the city has none."""
    result = rows(
        f"SELECT * FROM {source(table)} WHERE location_id = ? ORDER BY {order_by}",
        [location_id],
    )
    if not result:
        raise HTTPException(status_code=404, detail=f"No {table} data for location {location_id}")
    return result


@app.get("/health")
def health() -> dict:
    """Report when the data was exported and how current it is."""
    manifest = DATA_DIR / "manifest.json"
    if not manifest.exists():
        raise HTTPException(status_code=503, detail="No export has been loaded yet")
    return {"status": "ok", **json.loads(manifest.read_text(encoding="utf-8"))}


@app.get("/cities")
def cities() -> list[dict]:
    """Every city, with its position and current anomaly."""
    return rows(f"SELECT * FROM {source('city_summary')} ORDER BY city")


@app.get("/cities/{location_id}/yearly")
def city_yearly(location_id: int) -> list[dict]:
    """Yearly climate figures for one city."""
    return city_rows("city_yearly", location_id, "year")


@app.get("/cities/{location_id}/recent")
def city_recent(location_id: int) -> list[dict]:
    """The latest 90 days for one city."""
    return city_rows("city_recent_daily", location_id, "weather_date")


@app.get("/cities/{location_id}/forecast")
def city_forecast(location_id: int) -> list[dict]:
    """The most recent 7-day forecast for one city."""
    return city_rows("forecast_latest", location_id, "horizon_days")


@app.get("/model/skill")
def model_skill() -> list[dict]:
    """Backtest accuracy of the forecast model, per horizon."""
    return rows(f"SELECT * FROM {source('model_skill')} ORDER BY horizon_days")
