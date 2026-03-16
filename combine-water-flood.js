const fs = require('fs');
const path = require('path');
const dataDir = path.join(__dirname, 'data');
const aggregateDir = path.join(__dirname, 'aggregate');
const floodLevelPath = path.join(__dirname, 'flood-level.csv');

// Ensure aggregate directory exists
if (!fs.existsSync(aggregateDir)) {
    fs.mkdirSync(aggregateDir);
}

// Read flood-level.csv into a map: station_name -> {minor, moderate, major}
const floodLevels = {};
const floodLines = fs.readFileSync(floodLevelPath, 'utf-8').split('\n');
const floodHeader = floodLines[0].split(',');
for (let i = 1; i < floodLines.length; i++) {
    const line = floodLines[i].trim();
    if (!line) continue;
    const [station_name, minor, moderate, major] = line.split(',');
    if (station_name) {
        // Remove double quotes for robust matching
        const cleanName = station_name.replace(/"/g, '').trim().toLowerCase();
        floodLevels[cleanName] = { minor, moderate, major };
    }
}

// Find all CSVs in /data except the output file
const csvFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv') && f !== 'combined-water-flood.csv');

for (const csvFile of csvFiles) {
    console.log("🚀 ~ csvFile:", csvFile)
    const csvPath = path.join(dataDir, csvFile);
    const lines = fs.readFileSync(csvPath, 'utf-8').split('\n');
    if (lines.length < 2) continue;
    const header = lines[0].split(',');
    // Find the index of station_name in the file
    const stationNameIdx = header.findIndex(h => h.trim().toLowerCase() === 'station_name');
    if (stationNameIdx === -1) continue;
    // Prepare output for this file
    const outPath = path.join(aggregateDir, `combined-${csvFile}`);
    let outHeader = header.concat(['minor', 'moderate', 'major']).join(',') + '\n';
    fs.writeFileSync(outPath, outHeader); // Always overwrite for each file
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].trim();
        if (!row) continue;
        const cols = row.split(',');
        let stationName = cols[stationNameIdx] ? cols[stationNameIdx].replace(/"/g, '').trim().toLowerCase() : '';
        if (floodLevels[stationName]) {
            const { minor, moderate, major } = floodLevels[stationName];
            const outRow = cols.concat([minor, moderate, major]).join(',') + '\n';
            fs.appendFileSync(outPath, outRow);
        } else {
            // Uncomment for debugging:
            // console.log(`No flood level match for station: '${cols[stationNameIdx]}'`);
        }
    }
    console.log(`Combined CSV created at ${outPath}`);
}
