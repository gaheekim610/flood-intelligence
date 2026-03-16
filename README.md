# Flood Intelligence System

IFN735 Industry Project - This repository contains code snippet for collecting, processing, and analyzing flood-related data from water level monitoring stations.

## Project Overview

This project provides tools to:
- Fetch water level data from monitoring stations
- Extract flood level information from various regions
- Combine water level and flood data
- Analyze historical flood events (Alfred, Debbie, and Yasi)

## Project Structure

```
├── aggregate/                  # Contains combined water level data for specific events
├── data/                      # Raw water level data and station information
├── html/                      # HTML files containing regional flood information
├── all-water-level-stations.csv   # List of all water monitoring stations
├── combine-water-flood.js     # Script to combine water and flood level data
├── extract-flood-level.js     # Script to extract flood levels from HTML
├── fetch-stations.js          # Script to fetch station information
├── fetch-water-level.js       # Script to fetch water level data
├── flood-level.csv           # Extracted flood level information
├── station_ids.csv           # List of station IDs
└── station_response.json     # Cached station response data
```

## Prerequisites

- Node.js
- npm

## Dependencies

```json
{
  "axios": "^1.12.2",
  "node-fetch": "^3.3.2"
}
```

## Scripts

### fetch-water-level.js
Fetches water level data for specified stations within a given time range. Uses the official water monitoring API to retrieve time series data.

### extract-flood-level.js
Extracts flood level information from HTML files containing regional flood data. Processes the data and saves it to `flood-level.csv`.

### combine-water-flood.js
Combines water level measurements with flood level thresholds to create comprehensive flood intelligence data.

### fetch-stations.js
Retrieves information about water monitoring stations and saves it to CSV format.

## Data Files

### all-water-level-stations.csv
Contains information about all water level monitoring stations.

### flood-level.csv
Contains extracted flood levels (minor, moderate, major) for different stations.

### aggregate/*.csv
Contains combined water level data for specific flood events:
- Alfred
- Debbie
- Yasi

## HTML Files

Regional flood information is available in HTML format for different areas:
- Central Region (flood-central.html)
- Gulf Region (flood-gulf.html)
- North Region (flood-north.html)
- South East Region (seast.html)
- West Region (west.html)
- Wide Bay Region (widebay.html)

## Usage

1. First, fetch the station information:
```bash
node fetch-stations.js
```

2. Extract flood levels from HTML files:
```bash
node extract-flood-level.js
```

3. Fetch water level data for stations:
```bash
node fetch-water-level.js
```

4. Combine water and flood data:
```bash
node combine-water-flood.js
```
