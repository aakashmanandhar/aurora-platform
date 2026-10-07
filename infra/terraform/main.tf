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
  }
}

resource "databricks_schema" "layers" {
  for_each     = local.schemas
  catalog_name = local.catalog
  name         = each.key
  comment      = each.value
}
