const fs = require('fs');
const path = require('path');

const floodLevelPath = path.join(__dirname, 'data', 'flood-level.csv');
const stationsPath = path.join(__dirname, 'data', 'stations.csv');
const outputPath = path.join(__dirname, 'data', 'station-flood-level.csv');

// Helper function to parse CSV line (handles quoted fields)
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

// Read flood-level.csv
console.log('Reading flood-level.csv...');
const floodLines = fs.readFileSync(floodLevelPath, 'utf-8').split('\n');
const floodHeader = parseCSVLine(floodLines[0]);
const floodData = {};

for (let i = 1; i < floodLines.length; i++) {
    const line = floodLines[i].trim();
    if (!line) continue;
    const fields = parseCSVLine(line);
    const stationId = fields[0] ? fields[0].replace(/"/g, '') : '';
    const stationName = fields[1] ? fields[1].replace(/"/g, '').toLowerCase() : '';
    const minor = fields[2] ? fields[2].replace(/"/g, '') : '';
    const moderate = fields[3] ? fields[3].replace(/"/g, '') : '';
    const major = fields[4] ? fields[4].replace(/"/g, '') : '';

    if (stationName) {
        floodData[stationName] = { stationId, stationName: fields[1] ? fields[1].replace(/"/g, '') : '', minor, moderate, major };
    }
}

// Read stations.csv
console.log('Reading stations.csv...');
const stationLines = fs.readFileSync(stationsPath, 'utf-8').split('\n');
const stationHeader = parseCSVLine(stationLines[0]);

// Find indices of required columns
const stnameIdx = stationHeader.findIndex(h => h.toLowerCase() === 'stname');
const stationIdWIdx = stationHeader.findIndex(h => h.toLowerCase() === 'station');
const longitudeIdx = stationHeader.findIndex(h => h.toLowerCase() === 'longitude');
const lldatumIdx = stationHeader.findIndex(h => h.toLowerCase() === 'lldatum');
const latitudeIdx = stationHeader.findIndex(h => h.toLowerCase() === 'latitude');
const sttypeIdx = stationHeader.findIndex(h => h.toLowerCase() === 'stntype');

// Create output CSV
console.log('Matching and creating output CSV...');
const outputHeader = '"station_id","station_name","minor","moderate","major","station_id_w","longitude","lldatum","latitude","stntype"\n';
fs.writeFileSync(outputPath, outputHeader);

let matchCount = 0;

for (let i = 1; i < stationLines.length; i++) {
    const line = stationLines[i].trim();
    if (!line) continue;

    const fields = parseCSVLine(line);
    const stname = fields[stnameIdx] ? fields[stnameIdx].replace(/"/g, '').toLowerCase() : '';

    if (stname && floodData[stname]) {
        const flood = floodData[stname];
        const stationIdW = stationIdWIdx !== -1 ? (fields[stationIdWIdx] ? fields[stationIdWIdx].replace(/"/g, '') : '') : '';
        const longitude = fields[longitudeIdx] ? fields[longitudeIdx].replace(/"/g, '') : '';
        const lldatum = fields[lldatumIdx] ? fields[lldatumIdx].replace(/"/g, '') : '';
        const latitude = fields[latitudeIdx] ? fields[latitudeIdx].replace(/"/g, '') : '';
        const stntype = fields[sttypeIdx] ? fields[sttypeIdx].replace(/"/g, '') : '';

        const outRow = `"${flood.stationId}","${flood.stationName}","${flood.minor}","${flood.moderate}","${flood.major}","${stationIdW}","${longitude}","${lldatum}","${latitude}","${stntype}"\n`;
        fs.appendFileSync(outputPath, outRow);
        matchCount++;
    }
}

console.log(`✅ Matched ${matchCount} records. Output saved to ${outputPath}`);
