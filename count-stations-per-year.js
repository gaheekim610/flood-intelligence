const fs = require('fs');
const path = require('path');

// This script reads the combined water level and flood threshold CSV (e.g. combined-water-flood-2021-2026-6hr-freq.csv),
// extracts the year from the time column, and counts the number of unique stations per year.
// The results are printed to the console.
// It helps us understand how many stations have data for each year
// and can indicate if there are any gaps in the data coverage over time.

// Configurable path to the combined water level and flood threshold CSV
// e.g. combined-water-flood-2021-2026-6hr-freq.csv / combined-water-flood-2021-2026.csv / combined-water-flood.csv
const csvPath = path.join(__dirname, 'data', 'combined-water-flood-2021-2026-6hr-freq.csv');

// Helper CSV parser (handles quoted values)
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
                i++; // skip second quote
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

function main() {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim().length > 0);

    if (lines.length <= 1) {
        console.log('No data found.');
        return;
    }

    const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    const stationIdIndex = header.findIndex(h => h === 'station_id_w');
    const timeIndex = header.findIndex(h => h === 'time');

    if (stationIdIndex === -1 || timeIndex === -1) {
        throw new Error('Required columns (station_id_w or time) not found in CSV');
    }

    // Group stations by year
    const yearStations = {};

    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        const stationId = row[stationIdIndex].replace(/"/g, '').trim();
        const timeStr = row[timeIndex].replace(/"/g, '').trim();

        // Extract year from timestamp (format: YYYYMMDDhhmmss)
        const year = timeStr.substring(0, 4);

        if (!yearStations[year]) {
            yearStations[year] = new Set();
        }

        yearStations[year].add(stationId);
    }

    // Sort years and display results
    const sortedYears = Object.keys(yearStations).sort();

    console.log('\nStations per Year:');
    console.log('==================');

    for (const year of sortedYears) {
        const count = yearStations[year].size;
        console.log(`${year}: ${count} stations`);
    }

    console.log('==================');
    console.log(`Total data points: ${lines.length - 1}`);
}

main();
