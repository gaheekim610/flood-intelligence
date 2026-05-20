const fs = require('fs');
const path = require('path');

// This script combines the filtered recent water level CSV files in /recent 
// with station flood level thresholds from /data/station-flood-level.csv,
// and outputs an enriched CSV (/data/combined-water-flood.csv) that 
// includes a new column indicating flood type (no_flood, minor, moderate, major) based on the thresholds.
// output file size can be up to 1GB and takes 15 minutes to run.

// Configurable paths for temp directory (either /recent or /temp)
const tempDir = path.join(__dirname, 'recent'); // path.join(__dirname, 'temp');

const dataDir = path.join(__dirname, 'data');
const outputDir = dataDir; // output now writes to data folder
const stationFloodPath = path.join(dataDir, 'station-flood-level.csv');
const combinedOutPath = path.join(outputDir, 'combined-water-flood.csv');

// Ensure output directory exists (data should already exist, but check)
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let insideQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (insideQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

// Load station flood thresholds by station_id_w
const stationThresholds = {};
const stationLines = fs.readFileSync(stationFloodPath, 'utf-8').split('\n').filter(l => l.trim());
if (stationLines.length < 2) {
    throw new Error('station-flood-level.csv is empty or missing data');
}
const stationHeader = parseCSVLine(stationLines[0]).map(h => h.trim().toLowerCase());
const stationIdWIdx = stationHeader.indexOf('station_id_w');
const minorIdx = stationHeader.indexOf('minor');
const moderateIdx = stationHeader.indexOf('moderate');
const majorIdx = stationHeader.indexOf('major');
if (stationIdWIdx === -1 || minorIdx === -1 || moderateIdx === -1 || majorIdx === -1) {
    throw new Error('station-flood-level.csv missing required columns station_id_w/minor/moderate/major');
}

for (let i = 1; i < stationLines.length; i++) {
    const row = stationLines[i].trim();
    if (!row) continue;
    const cols = parseCSVLine(row);
    const id = (cols[stationIdWIdx] || '').replace(/"/g, '').trim();
    if (!id) continue;
    const minorValue = parseFloat((cols[minorIdx] || '').replace(/"/g, '').trim());
    const moderateValue = parseFloat((cols[moderateIdx] || '').replace(/"/g, '').trim());
    const majorValue = parseFloat((cols[majorIdx] || '').replace(/"/g, '').trim());
    stationThresholds[id] = { minor: minorValue, moderate: moderateValue, major: majorValue };
}

// Combine all temp CSV files
const tempFiles = fs.readdirSync(tempDir).filter(f => f.endsWith('.csv'));
if (tempFiles.length === 0) {
    console.log('No temp CSV files found to combine.');
    process.exit(0);
}

let combinedHeaderWritten = false;

for (const tempFile of tempFiles) {
    const filePath = path.join(tempDir, tempFile);
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim());
    if (lines.length < 2) continue;

    const headerCols = parseCSVLine(lines[0]);
    const stationIdWIndex = headerCols.map(h => h.replace(/"/g, '').trim().toLowerCase()).indexOf('station_id_w');
    const valueIndex = headerCols.map(h => h.replace(/"/g, '').trim().toLowerCase()).indexOf('value');
    if (stationIdWIndex === -1 || valueIndex === -1) {
        console.warn(`Skipping ${tempFile}: missing station_id_w or value column`);
        continue;
    }

    if (!combinedHeaderWritten) {
        const outCols = headerCols.concat(['type_flood', 'minor', 'moderate', 'major']);
        fs.writeFileSync(combinedOutPath, outCols.map(c => `"${c.replace(/"/g, '')}"`).join(',') + '\n');
        combinedHeaderWritten = true;
    }

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        if (!row.trim()) continue;

        const cols = parseCSVLine(row);
        const stationIdW = (cols[stationIdWIndex] || '').replace(/"/g, '').trim();
        const value = parseFloat((cols[valueIndex] || '').replace(/"/g, '').trim());

        const thresholds = stationThresholds[stationIdW];
        let typeFlood = 'no_flood';
        let minor = '';
        let moderate = '';
        let major = '';

        if (thresholds && !Number.isNaN(value)) {
            minor = thresholds.minor;
            moderate = thresholds.moderate;
            major = thresholds.major;
            if (value >= major) {
                typeFlood = 'major';
            } else if (value >= moderate) {
                typeFlood = 'moderate';
            } else if (value >= minor) {
                typeFlood = 'minor';
            }
        } else if (thresholds) {
            minor = thresholds.minor;
            moderate = thresholds.moderate;
            major = thresholds.major;
        }

        const outRow = cols.concat([`"${typeFlood}"`, `"${minor}"`, `"${moderate}"`, `"${major}"`]).join(',') + '\n';
        fs.appendFileSync(combinedOutPath, outRow);
    }
}

console.log(`Created combined enriched CSV at ${combinedOutPath}`);
