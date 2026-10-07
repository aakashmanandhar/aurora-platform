"""Bronze layer: load landing files into Delta tables, untouched, with load metadata."""
from pyspark import pipelines as dp
from pyspark.sql.functions import col, current_timestamp

LANDING = "/Volumes/aurora/bronze/landing"


def read_landing(folder: str):
    """Stream new files from a landing folder as one VARIANT column plus metadata."""
    return (
        spark.readStream.format("cloudFiles")
        .option("cloudFiles.format", "json")
        .option("singleVariantColumn", "raw")
        .load(f"{LANDING}/{folder}")
        .select(
            col("raw"),
            col("_metadata.file_path").alias("_source_file"),
            col("_metadata.file_modification_time").alias("_file_modified_at"),
            current_timestamp().alias("_ingested_at"),
        )
    )


@dp.table(name="locations_raw", comment="Geocoder replies, one row per city per extraction run.")
def locations_raw():
    return read_landing("locations")


@dp.table(name="openmeteo_daily_raw", comment="Open-Meteo archive replies, one row per city per extraction run.")
def openmeteo_daily_raw():
    return read_landing("openmeteo_daily")
