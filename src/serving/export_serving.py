"""Export the serving tables as Parquet files and deliver them to the website."""
from __future__ import annotations

import argparse
import json
import os
import shutil
import tempfile
from datetime import UTC, datetime

import requests
from databricks.sdk import WorkspaceClient
from pyspark.sql import SparkSession

TABLES = [
    "city_summary",
    "city_yearly",
    "city_recent_daily",
    "forecast_latest",
    "model_skill",
]


def checked(response: requests.Response, key: str) -> dict:
    """Return the website's JSON reply, or fail if it is anything else.

    A proxy in front of the site can answer an error with a web page marked as a
    success, so a 200 status alone is not proof that the upload worked.
    """
    response.raise_for_status()
    try:
        body = response.json()
    except ValueError as exc:
        raise RuntimeError(f"The website did not answer with JSON: {response.text[:120]!r}") from exc
    if key not in body:
        raise RuntimeError(f"Unexpected reply from the website: {body}")
    return body


def deliver(out_dir: str, upload_url: str, token: str) -> None:
    """Send every exported file to the website, then ask it to publish them."""
    base = upload_url.rstrip("/")
    headers = {"Authorization": f"Bearer {token}", "User-Agent": "aurora-export/1.0"}

    for table in TABLES:
        with open(os.path.join(out_dir, f"{table}.parquet"), "rb") as f:
            reply = checked(
                requests.put(f"{base}/internal/export/{table}", data=f.read(), headers=headers, timeout=60),
                "staged",
            )
        print(f"delivered {table}: {reply['bytes']} bytes")

    with open(os.path.join(out_dir, "manifest.json"), "rb") as f:
        reply = checked(
            requests.post(f"{base}/internal/export/publish", data=f.read(), headers=headers, timeout=60),
            "published",
        )
    print(f"Website published {len(reply['published'])} tables, data through {reply['data_through']}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", required=True)
    parser.add_argument("--upload-url", default="none")
    parser.add_argument("--secret-scope", default="aurora")
    args = parser.parse_args()

    spark = SparkSession.builder.getOrCreate()
    out_dir = f"/Volumes/{args.catalog}/serving/export"
    os.makedirs(out_dir, exist_ok=True)

    manifest = {"exported_at": datetime.now(UTC).isoformat(), "catalog": args.catalog, "tables": {}}
    with tempfile.TemporaryDirectory() as tmp:
        for table in TABLES:
            df = spark.read.table(f"{args.catalog}.serving.{table}").toPandas()
            local_path = os.path.join(tmp, f"{table}.parquet")
            df.to_parquet(local_path, index=False)
            shutil.copyfile(local_path, os.path.join(out_dir, f"{table}.parquet"))
            manifest["tables"][table] = {"rows": len(df), "bytes": os.path.getsize(local_path)}
            print(f"{table}: {len(df)} rows")

    latest = spark.sql(f"SELECT max(latest_date) AS d FROM {args.catalog}.serving.city_summary").collect()[0]["d"]
    manifest["data_through"] = str(latest) if latest else None

    # The manifest is written last, so its presence means every file above is complete.
    with open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"Exported {len(TABLES)} tables to {out_dir}, data through {manifest['data_through']}")

    if args.upload_url.lower() in ("", "none"):
        print("No upload address is set for this environment, so the files stay in the volume.")
        return
    token = WorkspaceClient().dbutils.secrets.get(scope=args.secret_scope, key="upload_token").strip()
    deliver(out_dir, args.upload_url, token)


if __name__ == "__main__":
    main()
