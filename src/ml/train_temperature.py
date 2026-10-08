"""Train the final temperature anomaly forecaster and register it in Unity Catalog."""
from __future__ import annotations

import argparse
import os

# Unity Catalog default storage rejects direct cloud uploads. This makes MLflow
# upload model files through the Databricks API instead. It must be set before
# MLflow is used.
os.environ["MLFLOW_USE_DATABRICKS_SDK_MODEL_ARTIFACTS_REPO_FOR_UC"] = "True"

import lightgbm as lgb
import mlflow
import pandas as pd
from mlflow.models import infer_signature
from mlflow.tracking import MlflowClient
from pyspark.sql import SparkSession

FEATURES = [
    "anomaly_lag0", "anomaly_lag1", "anomaly_lag2", "anomaly_lag3", "anomaly_lag7",
    "anomaly_mean_7d", "anomaly_mean_30d", "anomaly_std_7d", "precipitation_sum_7d",
    "wind_gust_max_kmh", "temperature_range_c", "doy_sin", "doy_cos",
    "latitude", "elevation_m", "horizon",
]
HORIZONS = range(1, 8)
QUANTILES = {"low": 0.1, "mid": 0.5, "high": 0.9}
TRAIN_START_YEAR = 1980


class QuantileForecaster(mlflow.pyfunc.PythonModel):
    """Wraps the three quantile models so they are served as one model."""

    def __init__(self, models: dict, features: list[str]):
        self.models = models
        self.features = features

    def predict(self, context, model_input, params=None):
        import numpy as np
        import pandas as pd

        preds = np.sort(
            np.column_stack([m.predict(model_input[self.features]) for m in self.models.values()]),
            axis=1,
        )
        return pd.DataFrame(preds, columns=["low", "mid", "high"])


def to_long(df: pd.DataFrame) -> pd.DataFrame:
    target_cols = [f"target_h{h}" for h in HORIZONS]
    parts = []
    for h in HORIZONS:
        part = df.drop(columns=target_cols).copy()
        part["horizon"] = h
        part["target"] = df[f"target_h{h}"]
        parts.append(part)
    long = pd.concat(parts, ignore_index=True)
    return long.dropna(subset=["target", "anomaly_lag7", "anomaly_std_7d"])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--experiment", required=True)
    parser.add_argument("--features-table", default="aurora.ml.features_temperature")
    parser.add_argument("--model-name", default="aurora.ml.temperature_forecaster")
    args = parser.parse_args()

    spark = SparkSession.builder.getOrCreate()
    df = spark.read.table(args.features_table).toPandas()
    df["weather_date"] = pd.to_datetime(df["weather_date"])
    train = to_long(df[df["weather_date"].dt.year >= TRAIN_START_YEAR])
    X = train[FEATURES].astype("float64")

    mlflow.set_tracking_uri("databricks")
    mlflow.set_registry_uri("databricks-uc")
    mlflow.set_experiment(args.experiment)

    with mlflow.start_run(run_name="train_final"):
        models = {}
        for name, q in QUANTILES.items():
            model = lgb.LGBMRegressor(
                objective="quantile", alpha=q, n_estimators=200, learning_rate=0.05,
                num_leaves=31, min_child_samples=200, subsample=0.8, subsample_freq=1,
                colsample_bytree=0.8, verbose=-1,
            )
            models[name] = model.fit(X, train["target"])

        forecaster = QuantileForecaster(models, FEATURES)
        sample = X.head(5)
        mlflow.log_params({
            "train_rows": len(train),
            "train_start_year": TRAIN_START_YEAR,
            "train_end_date": str(df["weather_date"].max().date()),
            "features": len(FEATURES),
        })
        mlflow.pyfunc.log_model(
            artifact_path="model",
            python_model=forecaster,
            signature=infer_signature(sample, forecaster.predict(None, sample)),
            input_example=sample,
            pip_requirements=["lightgbm>=4.0,<5.0", "pandas", "numpy"],
            registered_model_name=args.model_name,
        )

    client = MlflowClient()
    versions = client.search_model_versions(f"name='{args.model_name}'")
    latest = max(int(v.version) for v in versions)
    client.set_registered_model_alias(args.model_name, "champion", latest)
    print(f"Registered {args.model_name} version {latest} as champion ({len(train)} training rows)")


if __name__ == "__main__":
    main()
