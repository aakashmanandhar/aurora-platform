"""Score the champion model and write temperature forecasts to gold."""
from __future__ import annotations

import argparse
import os

# See train_temperature.py: required for Unity Catalog default storage.
os.environ["MLFLOW_USE_DATABRICKS_SDK_MODEL_ARTIFACTS_REPO_FOR_UC"] = "True"

import mlflow
import numpy as np
import pandas as pd
from mlflow.tracking import MlflowClient
from pyspark.sql import SparkSession

FEATURES = [
    "anomaly_lag0", "anomaly_lag1", "anomaly_lag2", "anomaly_lag3", "anomaly_lag7",
    "anomaly_mean_7d", "anomaly_mean_30d", "anomaly_std_7d", "precipitation_sum_7d",
    "wind_gust_max_kmh", "temperature_range_c", "doy_sin", "doy_cos",
    "latitude", "elevation_m", "horizon",
]
HORIZONS = range(1, 8)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-name", default="aurora.ml.temperature_forecaster")
    parser.add_argument("--features-table", default="aurora.ml.features_temperature")
    parser.add_argument("--baseline-table", default="aurora.gold.climate_baseline")
    parser.add_argument("--forecast-table", default="aurora.gold.fact_forecast")
    args = parser.parse_args()

    spark = SparkSession.builder.getOrCreate()
    mlflow.set_tracking_uri("databricks")
    mlflow.set_registry_uri("databricks-uc")

    version = MlflowClient().get_model_version_by_alias(args.model_name, "champion").version
    model = mlflow.pyfunc.load_model(f"models:/{args.model_name}@champion")

    feats = spark.read.table(args.features_table).toPandas()
    feats["weather_date"] = pd.to_datetime(feats["weather_date"])
    feats = feats.dropna(subset=["anomaly_lag7", "anomaly_std_7d"])
    latest = feats.loc[feats.groupby("location_id")["weather_date"].idxmax()]

    rows = pd.concat([latest.assign(horizon=h) for h in HORIZONS], ignore_index=True)
    preds = model.predict(rows[FEATURES].astype("float64"))

    target = rows["weather_date"] + pd.to_timedelta(rows["horizon"], unit="D")
    out = pd.DataFrame({
        "location_id": rows["location_id"].astype("int64"),
        "date_key": target.dt.strftime("%Y%m%d").astype("int32"),
        "target_date": target.dt.date,
        "forecast_made_date": rows["weather_date"].dt.date,
        "horizon_days": rows["horizon"].astype("int32"),
        "anomaly_low_c": preds["low"].to_numpy(),
        "anomaly_mid_c": preds["mid"].to_numpy(),
        "anomaly_high_c": preds["high"].to_numpy(),
        "day_of_year": np.minimum(target.dt.dayofyear, 365).astype("int32"),
    })

    baseline = (
        spark.read.table(args.baseline_table)
        .select("location_id", "day_of_year", "baseline_mean_c")
        .toPandas()
    )
    out = out.merge(baseline, on=["location_id", "day_of_year"], how="left").drop(columns=["day_of_year"])
    for q in ("low", "mid", "high"):
        out[f"temperature_{q}_c"] = out["baseline_mean_c"] + out[f"anomaly_{q}_c"]
    out["model_name"] = args.model_name
    out["model_version"] = int(version)
    out["scored_at"] = pd.Timestamp.now(tz="UTC")

    spark.createDataFrame(out).createOrReplaceTempView("scored_forecasts")
    spark.sql(f"CREATE TABLE IF NOT EXISTS {args.forecast_table} AS SELECT * FROM scored_forecasts WHERE 1 = 0")
    spark.sql(f"""
        MERGE INTO {args.forecast_table} t
        USING scored_forecasts s
          ON t.location_id = s.location_id
         AND t.forecast_made_date = s.forecast_made_date
         AND t.horizon_days = s.horizon_days
        WHEN MATCHED THEN UPDATE SET *
        WHEN NOT MATCHED THEN INSERT *
    """)
    made = sorted(set(out["forecast_made_date"]))
    print(f"Wrote {len(out)} forecasts from model version {version}, made from data as of {made}")


if __name__ == "__main__":
    main()
