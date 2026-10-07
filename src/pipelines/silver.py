"""Silver layer: one clean row per city, and one clean row per city per day."""
from pyspark import pipelines as dp
from pyspark.sql.functions import arrays_zip, col, explode, to_date

WEATHER_VARS = [
    "temperature_max_c",
    "temperature_min_c",
    "temperature_mean_c",
    "precipitation_mm",
    "wind_gust_max_kmh",
]


@dp.temporary_view(name="weather_daily_exploded")
def weather_daily_exploded():
    """Turn each bronze reply (one city, many days) into one row per day."""
    arrays = spark.readStream.table("openmeteo_daily_raw").selectExpr(
        "raw:location_id::bigint AS location_id",
        "raw:extracted_at::string AS extracted_at",
        "raw:payload.daily.time::array<string> AS date_str",
        "raw:payload.daily.temperature_2m_max::array<double> AS temperature_max_c",
        "raw:payload.daily.temperature_2m_min::array<double> AS temperature_min_c",
        "raw:payload.daily.temperature_2m_mean::array<double> AS temperature_mean_c",
        "raw:payload.daily.precipitation_sum::array<double> AS precipitation_mm",
        "raw:payload.daily.wind_gusts_10m_max::array<double> AS wind_gust_max_kmh",
    )
    exploded = arrays.select(
        "location_id",
        "extracted_at",
        explode(arrays_zip("date_str", *WEATHER_VARS)).alias("d"),
    )
    return exploded.select(
        "location_id",
        to_date(col("d.date_str")).alias("weather_date"),
        *[col(f"d.{v}").alias(v) for v in WEATHER_VARS],
        "extracted_at",
    )


dp.create_streaming_table(
    name="aurora.silver.weather_daily",
    comment="Daily weather per city, latest extracted value for each day.",
    expect_all_or_drop={
        "valid_key": "location_id IS NOT NULL AND weather_date IS NOT NULL",
    },
    expect_all={
        "plausible_temperature": "temperature_max_c IS NULL OR temperature_max_c BETWEEN -90 AND 60",
        "min_not_above_max": "temperature_min_c IS NULL OR temperature_max_c IS NULL OR temperature_min_c <= temperature_max_c",
        "non_negative_precipitation": "precipitation_mm IS NULL OR precipitation_mm >= 0",
    },
)

dp.create_auto_cdc_flow(
    target="aurora.silver.weather_daily",
    source="weather_daily_exploded",
    keys=["location_id", "weather_date"],
    sequence_by="extracted_at",
    stored_as_scd_type=1,
)


@dp.temporary_view(name="locations_parsed")
def locations_parsed():
    """Pull typed columns out of each geocoder reply."""
    return spark.readStream.table("locations_raw").selectExpr(
        "raw:id::bigint AS location_id",
        "raw:name::string AS city",
        "raw:country_code::string AS country_code",
        "raw:country::string AS country",
        "raw:admin1::string AS region",
        "raw:latitude::double AS latitude",
        "raw:longitude::double AS longitude",
        "raw:elevation::double AS elevation_m",
        "raw:timezone::string AS timezone",
        "raw:population::bigint AS population",
        "_file_modified_at",
    )


dp.create_streaming_table(
    name="aurora.silver.locations",
    comment="One row per city, latest geocoder values.",
    expect_all_or_drop={
        "valid_location": "location_id IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180",
    },
)

dp.create_auto_cdc_flow(
    target="aurora.silver.locations",
    source="locations_parsed",
    keys=["location_id"],
    sequence_by="_file_modified_at",
    stored_as_scd_type=1,
)
