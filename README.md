# Flood Intelligence System

IFN736 Industry Project - This repository contains code snippet for the following purpose:
- Collecting and processing flood-related data from water level monitoring stations
- Uploading flood and cyclone related data to cloud storage

## Project Overview

This project provides tools to:
- Fetch water level data from monitoring stations
- Extract flood level information from various regions
- Combine water level and flood data

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


## Usage

- read `step.md`
