"""Aurora API: serves the exported serving tables to the website."""
from __future__ import annotations

import hmac
import json
import math
import os
from pathlib import Path

import duckdb
from fastapi import FastAPI, HTTPException, Request

DATA_DIR = Path(os.environ.get("AURORA_DATA_DIR", "/data/export"))
INCOMING_DIR = DATA_DIR / ".incoming"

# Uploads are off unless a token is configured.
UPLOAD_TOKEN = os.environ.get("AURORA_UPLOAD_TOKEN", "")
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
EXPORT_TABLES = {"city_summary", "city_yearly", "city_recent_daily", "forecast_latest", "model_skill"}

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


def require_upload_token(request: Request) -> None:
    """Reject the request unless it carries the configured upload token."""
    if not UPLOAD_TOKEN:
        raise HTTPException(status_code=404, detail="Not found")
    supplied = request.headers.get("authorization", "")
    if not hmac.compare_digest(supplied.encode(), f"Bearer {UPLOAD_TOKEN}".encode()):
        raise HTTPException(status_code=401, detail="Invalid upload token")


async def read_limited(request: Request) -> bytes:
    """Read the request body, refusing anything larger than the limit."""
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="File too large")
    return bytes(body)


@app.put("/internal/export/{table}", include_in_schema=False)
async def stage_export_table(table: str, request: Request) -> dict:
    """Receive one exported table and hold it until the export is published."""
    require_upload_token(request)
    if table not in EXPORT_TABLES:
        raise HTTPException(status_code=400, detail="Unexpected table name")
    data = await read_limited(request)
    INCOMING_DIR.mkdir(parents=True, exist_ok=True)
    (INCOMING_DIR / f"{table}.parquet").write_bytes(data)
    return {"staged": table, "bytes": len(data)}


@app.post("/internal/export/publish", include_in_schema=False)
async def publish_export(request: Request) -> dict:
    """Check every staged table against the manifest, then switch the site to the new data."""
    require_upload_token(request)
    try:
        manifest = json.loads(await read_limited(request))
        tables = manifest["tables"]
    except (ValueError, KeyError, TypeError) as exc:
        raise HTTPException(status_code=400, detail="The manifest is not valid") from exc
    if set(tables) != EXPORT_TABLES:
        raise HTTPException(status_code=400, detail="The manifest does not list the expected tables")

    for table, info in tables.items():
        staged = INCOMING_DIR / f"{table}.parquet"
        if not staged.exists():
            raise HTTPException(status_code=409, detail=f"Table '{table}' has not been uploaded")
        try:
            found = rows(f"SELECT count(*) AS n FROM read_parquet('{staged.as_posix()}')")[0]["n"]
        except duckdb.Error as exc:
            raise HTTPException(status_code=422, detail=f"Table '{table}' is not a readable file") from exc
        if found != info.get("rows"):
            raise HTTPException(status_code=422, detail=f"Table '{table}' has {found} rows, not the stated {info.get('rows')}")

    for table in tables:
        os.replace(INCOMING_DIR / f"{table}.parquet", DATA_DIR / f"{table}.parquet")
    (DATA_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return {"published": sorted(tables), "data_through": manifest.get("data_through")}
