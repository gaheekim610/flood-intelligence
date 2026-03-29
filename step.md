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

# live data

1. `node fetch-live.js`
- result: /data/cyclone-live.csv, /data/water-level-live.csv