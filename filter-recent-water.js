const fs = require('fs');
const path = require('path');

const tempDir = path.join(__dirname, 'temp');
const recentDir = path.join(__dirname, 'recent');

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

const cutoffTime = '20210101000000'; // January 1st, 2016, 00:00:00

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

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].trim();
        if (!row) continue;

        const cols = parseCSVLine(row);
        const timeValue = (cols[timeIdx] || '').replace(/"/g, '').trim();

        if (timeValue >= cutoffTime) {
            filteredLines.push(row);
        }
    }

    if (filteredLines.length > 0) {
        const outPath = path.join(recentDir, file);
        const outputContent = headerLine + '\n' + filteredLines.join('\n') + '\n';
        fs.writeFileSync(outPath, outputContent);
        console.log(`Created filtered CSV for ${file} with ${filteredLines.length} rows.`);
    } else {
        console.log(`No data from 2026 onwards in ${file}, skipping creation.`);
    }
}

console.log('Filtering complete.');