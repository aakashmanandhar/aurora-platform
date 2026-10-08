"""Backtest the temperature anomaly forecaster against simple baselines."""
from __future__ import annotations

import argparse

import lightgbm as lgb
import mlflow
import numpy as np
import pandas as pd
from pyspark.sql import SparkSession

FEATURES = [
    "anomaly_lag0", "anomaly_lag1", "anomaly_lag2", "anomaly_lag3", "anomaly_lag7",
    "anomaly_mean_7d", "anomaly_mean_30d", "anomaly_std_7d", "precipitation_sum_7d",
    "wind_gust_max_kmh", "temperature_range_c", "doy_sin", "doy_cos",
    "latitude", "elevation_m", "horizon",
]
HORIZONS = range(1, 8)
QUANTILES = {"low": 0.1, "mid": 0.5, "high": 0.9}
TEST_YEARS = [2023, 2024, 2025]
TRAIN_START_YEAR = 1980


def to_long(df: pd.DataFrame) -> pd.DataFrame:
    """One row per city, day and forecast horizon."""
    target_cols = [f"target_h{h}" for h in HORIZONS]
    parts = []
    for h in HORIZONS:
        part = df.drop(columns=target_cols).copy()
        part["horizon"] = h
        part["target"] = df[f"target_h{h}"]
        part["target_date"] = df["weather_date"] + pd.Timedelta(days=h)
        parts.append(part)
    long = pd.concat(parts, ignore_index=True)
    return long.dropna(subset=["target", "anomaly_lag7", "anomaly_std_7d"])


def fit_quantile(train: pd.DataFrame, q: float) -> lgb.LGBMRegressor:
    model = lgb.LGBMRegressor(
        objective="quantile", alpha=q, n_estimators=200, learning_rate=0.05,
        num_leaves=31, min_child_samples=200, subsample=0.8, subsample_freq=1,
        colsample_bytree=0.8, verbose=-1,
    )
    model.fit(train[FEATURES], train["target"])
    return model


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--experiment", required=True)
    parser.add_argument("--features-table", default="aurora.ml.features_temperature")
    parser.add_argument("--metrics-table", default="aurora.ml.backtest_metrics")
    args = parser.parse_args()

    spark = SparkSession.builder.getOrCreate()
    df = spark.read.table(args.features_table).toPandas()
    df["weather_date"] = pd.to_datetime(df["weather_date"])
    long = to_long(df[df["weather_date"].dt.year >= TRAIN_START_YEAR])

    mlflow.set_tracking_uri("databricks")
    mlflow.set_registry_uri("databricks-uc")
    mlflow.set_experiment(args.experiment)
    rows = []
    with mlflow.start_run(run_name="backtest"):
        mlflow.log_params({
            "features": len(FEATURES), "test_years": str(TEST_YEARS),
            "train_start_year": TRAIN_START_YEAR, "quantiles": str(list(QUANTILES.values())),
        })
        for year in TEST_YEARS:
            start, end = pd.Timestamp(year, 1, 1), pd.Timestamp(year, 12, 31)
            train = long[long["target_date"] < start]
            test = long[(long["weather_date"] >= start) & (long["target_date"] <= end)]
            models = {name: fit_quantile(train, q) for name, q in QUANTILES.items()}
            preds = np.sort(
                np.column_stack([models[name].predict(test[FEATURES]) for name in QUANTILES]),
                axis=1,
            )
            scored = test.assign(low=preds[:, 0], mid=preds[:, 1], high=preds[:, 2])
            for h, g in scored.groupby("horizon"):
                mae_model = float((g["target"] - g["mid"]).abs().mean())
                mae_persistence = float((g["target"] - g["anomaly_lag0"]).abs().mean())
                mae_climatology = float(g["target"].abs().mean())
                mae_recent_normal = float((g["target"] - g["anomaly_mean_30d"]).abs().mean())
                rows.append({
                    "test_year": int(year),
                    "horizon": int(h),
                    "test_rows": int(len(g)),
                    "mae_model": mae_model,
                    "mae_persistence": mae_persistence,
                    "mae_climatology": mae_climatology,
                    "mae_recent_normal": mae_recent_normal,
                    "skill_vs_climatology": 1 - mae_model / mae_climatology,
                    "skill_vs_persistence": 1 - mae_model / mae_persistence,
                    "skill_vs_recent_normal": 1 - mae_model / mae_recent_normal,
                    "coverage_80": float(((g["target"] >= g["low"]) & (g["target"] <= g["high"])).mean()),
                })

        metrics = pd.DataFrame(rows)
        summary = metrics.groupby("horizon").mean(numeric_only=True).drop(columns=["test_year", "test_rows"])
        for h, r in summary.iterrows():
            for name, value in r.items():
                mlflow.log_metric(f"{name}_h{h}", float(value))
        spark.createDataFrame(metrics).write.mode("overwrite").option("overwriteSchema", "true").saveAsTable(args.metrics_table)
        print(summary.round(3).to_string())


if __name__ == "__main__":
    main()
