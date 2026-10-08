terraform {
  required_providers {
    databricks = {
      source = "databricks/databricks"
    }
  }
}

provider "databricks" {
  profile = "aurora"
}

# The aurora catalog is created once by hand in the UI, because Default
# Storage cannot be selected through the API. Terraform manages its contents.
locals {
  catalog = "aurora"
  schemas = {
    bronze = "Raw data as ingested"
    silver = "Cleaned and typed data"
    gold   = "Business-ready tables, forecasts and anomaly scores"
    ml     = "Feature tables, registered models and backtest results"
  }
}

resource "databricks_schema" "layers" {
  for_each     = local.schemas
  catalog_name = local.catalog
  name         = each.key
  comment      = each.value
}

resource "databricks_volume" "landing" {
  catalog_name = local.catalog
  schema_name  = databricks_schema.layers["bronze"].name
  name         = "landing"
  volume_type  = "MANAGED"
  comment      = "Raw files as downloaded, before loading into bronze tables"
}
