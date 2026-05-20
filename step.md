# historic data

1. save html to /html folder
- from bom
    - https://www.bom.gov.au/qld/flood/gulf.shtml
    - https://www.bom.gov.au/qld/flood/north.shtml
    - https://www.bom.gov.au/qld/flood/central.shtml
    - https://www.bom.gov.au/qld/flood/widebay.shtml
    - https://www.bom.gov.au/qld/flood/seast.shtml
    - https://www.bom.gov.au/qld/flood/west.shtml
    - https://www.bom.gov.au/qld/flood/border.shtml
- contain all data for flood level threshold for water stations

2. `node fetch-stations.js`
- fetch station id, station name, latitude, longitude
- save to `/data/stations.csv`

3. `node extract-flood-level.js`
- extract flood threshold level of water stations from html files
- save to `/data/flood-level.csv`


4. `node station-flood-level.js`
- combine `/data/stations.csv` and `/data/flood-level.csv`
- save to `/data/station-flood-level.csv`

5. before running `node fetch-water-level.js`
- modify the parameters in `fetch-water-level.js` to adjust 
    - timeframe to extract
    - interval (year, month, day, hour) to extract
- save data of each water station to `/temp/water_level_[ID].csv`

6. (optional) `node filter-recent-water.js`
- change `cutoffTime` to filter how recent to filter data
- result saved in /recent folder

7. `node combine-water-flood.js`
- input 1: flood threshold data of water stations in /data/station-flood-level.csv 
- input 2: time-series water level data for all water stations in all csv in /recent or /temp folder
- combine & output to /data/combined-water-flood.csv

# Utility

1. `node count-stations-per-year.js`
- Analyse /data/combined-water-flood.csv
- Counts the number of unique stations per year
- Helps us understand how many stations have data for each year

# live data

1. `node fetch-live.js`
- downloads the latest cyclone data CSV from BOM
- fetches water level data for all stations
- filter the data to within last 2 weeks
- save to: /data/cyclone-live.csv, /data/water-level-live.csv

2. `node fetch-bom-flood-stations.js`
- Connects to the BOM FTP server, fetch flood warning station data
- Save to /data/active-flood-warning.csv

