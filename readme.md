# Snakemake Catalog Parser

This tools parses the Snakemake Workflow Catalog (https://snakemake.github.io/snakemake-workflow-catalog/) and synchrinizes it with the Tool Registry Service using the TRS-Filer API. This tool is idempotent and only adds tools to TRS that haven't already been added.

## Configuration
Users can configure the following two environment variables -

```
TRS_API_URL=Address of the TRS Filer API
SWC_DATA_URL=Address of the Snakemake Workflow Catalog data.js file
```

## Deployment
In order to deploy, the user needs to execute the public Docker image `singaltanmay/snakemake-catalog-parser` of this repository in a Docker container 