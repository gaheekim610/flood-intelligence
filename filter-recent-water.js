const fs = require('fs');
const path = require('path');

// This script reads all CSV files in the /temp folder, filters rows to only keep those with time value from January 1st, 2021 onwards,
// and only keeps rows that are at least 6 hours apart. The filtered results are saved to the /recent folder with the same file name.

const tempDir = path.join(__dirname, 'temp');
const recentDir = path.join(__dirname, 'recent');
// Configurable cutoff time
const cutoffTime = '20210101000000'; // January 1st, 2021, 00:00:00
// Configurable time interval
const sixHoursInMs = 6 * 60 * 60 * 1000; // every 6 hours (in milliseconds)

// Ensure recent directory exists
if (!fs.existsSync(recentDir)) {
    fs.mkdirSync(recentDir);
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

function parseTimestamp(timestamp) {
    const year = Number(timestamp.slice(0, 4));
    const month = Number(timestamp.slice(4, 6)) - 1;
    const day = Number(timestamp.slice(6, 8));
    const hour = Number(timestamp.slice(8, 10));
    const minute = Number(timestamp.slice(10, 12));
    const second = Number(timestamp.slice(12, 14));

    return Date.UTC(year, month, day, hour, minute, second);
}

function shouldKeepRow(timeValue, lastKeptTime) {
    if (timeValue < cutoffTime) {
        return false;
    }

    if (lastKeptTime === null) {
        return true;
    }

    return parseTimestamp(timeValue) - lastKeptTime >= sixHoursInMs;
}

// Get all CSV files in temp directory
const csvFiles = fs.readdirSync(tempDir).filter(f => f.endsWith('.csv'));

if (csvFiles.length === 0) {
    console.log('No CSV files found in temp directory.');
    process.exit(0);
}

for (const file of csvFiles) {
    const filePath = path.join(tempDir, file);
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim());

    if (lines.length < 2) {
        console.log(`Skipping ${file}: no data rows.`);
        continue;
    }

    const headerLine = lines[0];
    const headerCols = parseCSVLine(headerLine).map(h => h.replace(/"/g, '').trim().toLowerCase());
    const timeIdx = headerCols.indexOf('time');

    if (timeIdx === -1) {
        console.log(`Skipping ${file}: missing 'time' column.`);
        continue;
    }

    const filteredLines = [];
    let lastKeptTime = null;

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].trim();
        if (!row) continue;

        const cols = parseCSVLine(row);
        const timeValue = (cols[timeIdx] || '').replace(/"/g, '').trim();

        if (shouldKeepRow(timeValue, lastKeptTime)) {
            filteredLines.push(row);
            lastKeptTime = parseTimestamp(timeValue);
        }
    }

    if (filteredLines.length > 0) {
        const outPath = path.join(recentDir, file);
        const outputContent = headerLine + '\n' + filteredLines.join('\n') + '\n';
        fs.writeFileSync(outPath, outputContent);
        console.log(`Created filtered CSV for ${file} with ${filteredLines.length} rows at 6-hour intervals.`);
    } else {
        console.log(`No data from ${cutoffTime} onwards in ${file}, skipping creation.`);
    }
}

console.log('Filtering complete.');