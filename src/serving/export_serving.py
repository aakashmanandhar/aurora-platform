"""Export the serving tables as Parquet files for the website to download."""
from __future__ import annotations

import argparse
import json
import os
import shutil
import tempfile
from datetime import UTC, datetime

from pyspark.sql import SparkSession

TABLES = [
    "city_summary",
    "city_yearly",
    "city_recent_daily",
    "forecast_latest",
    "model_skill",
]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", required=True)
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


if __name__ == "__main__":
    main()
