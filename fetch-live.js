const axios = require('axios');
const fs = require('fs');
const path = require('path');

const url = 'https://www.bom.gov.au/clim_data/IDCKMSTM0S.csv';
const outputPath = path.join(__dirname, 'data', 'cyclone-live.csv');

const csvPath = path.join(__dirname, 'data', 'station-flood-level.csv');
const waterOutputPath = path.join(__dirname, 'data', 'water-level-live.csv');

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

// Read all station IDs from station-flood-level.csv
function readStationIds(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    if (lines.length <= 1) return [];

    const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    const stationIndex = header.findIndex(h => h === 'station_id_w');
    if (stationIndex === -1) throw new Error('station_id_w column not found in station-flood-level.csv');

    const ids = lines.slice(1).map(line => {
        const cols = parseCSVLine(line);
        return (cols[stationIndex] || '').replace(/"/g, '').trim();
    }).filter(id => id.length > 0);

    return ids;
}

// Helper to wait for a given ms
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWaterLevel(stationId, startTime, endTime) {
    const params = {
        function: 'get_ts_traces',
        version: '2',
        params: {
            site_list: stationId,
            datasource: 'AT',
            varfrom: '100.00',
            varto: '100.00',
            start_time: startTime,
            end_time: endTime,
            data_type: 'point',
            interval: 'hour',
            multiplier: '1'
        }
    };
    const url = `https://water-monitoring.information.qld.gov.au/cgi/webservice.pl?${encodeURIComponent(JSON.stringify(params))}`;
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error(`❌ Error fetching for station ${stationId}:`, error.message);
        return null;
    }
}

async function fetchWaterLevels(startDate, endDate) {
    try {
        const stationIds = readStationIds(csvPath);
        if (stationIds.length === 0) {
            console.log('No station IDs found.');
            return;
        }

        // Use the provided dates
        const startTime = startDate.toISOString().slice(0, 19).replace(/[-:T]/g, '');
        const endTime = endDate.toISOString().slice(0, 19).replace(/[-:T]/g, '');

        console.log(`Fetching water level data from ${startTime} to ${endTime}`);

        const allPoints = [];
        const waitTimeMs = 100; // 0.1 second wait between requests

        for (const stationId of stationIds) {
            console.log(`Fetching water level for station ${stationId}...`);
            const data = await fetchWaterLevel(stationId, startTime, endTime);
            if (!data || !data.return || !Array.isArray(data.return.traces) || data.return.traces.length === 0) {
                console.log(`No data for station ${stationId}`);
                await wait(waitTimeMs);
                continue;
            }

            const traceObj = data.return.traces[0];
            const site = traceObj.site ?? '';
            const longitude = traceObj.site_details.longitude ?? '';
            const latitude = traceObj.site_details.latitude ?? '';
            const stationName = traceObj.site_details.name ?? '';
            const points = Array.isArray(traceObj.trace) ? traceObj.trace : [];

            for (const point of points) {
                const time = point.t ?? '';
                const value = point.v ?? '';

                if (value === '' || parseFloat(value) === 0) {
                    continue;
                }

                allPoints.push({
                    station_id_w: stationId,
                    site,
                    longitude,
                    latitude,
                    station_name: stationName,
                    time,
                    value
                });
            }

            await wait(waitTimeMs);
        }

        if (allPoints.length === 0) {
            console.log('No data points collected.');
            return;
        }

        // Write to CSV
        const header = 'station_id_w,site,longitude,latitude,station_name,time,value\n';
        const csvLines = [header];
        allPoints.forEach(point => {
            const line = `"${point.station_id_w}","${point.site}","${point.longitude}","${point.latitude}","${point.station_name}","${point.time}","${point.value}"\n`;
            csvLines.push(line);
        });

        const outputCSV = csvLines.join('');
        fs.writeFileSync(waterOutputPath, outputCSV);
        console.log(`Water level data saved to ${waterOutputPath}`);

    } catch (error) {
        console.error('Error fetching water levels:', error.message);
    }
}

async function downloadAndFilterCSV() {
    try {
        // Download the CSV with headers
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const csvData = response.data;

        // Split into lines
        const lines = csvData.split('\n').filter(line => line.trim() !== '');

        console.log('First 10 lines:');
        for (let i = 0; i < Math.min(10, lines.length); i++) {
            console.log(`${i}: ${lines[i]}`);
        }

        if (lines.length < 2) {
            console.log('CSV has no data rows.');
            return { twoWeeksAgo: null, lastTM: null };
        }

        // Find the header line, perhaps the one with 'TM'
        let headerIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('TM')) {
                headerIndex = i;
                break;
            }
        }

        if (headerIndex === -1) {
            console.log('Header with TM not found.');
            return { twoWeeksAgo: null, lastTM: null };
        }

        const header = lines[headerIndex];
        const dataLines = lines.slice(headerIndex + 1);

        // Parse data lines, assuming TM is the first column or find it
        // For simplicity, assume columns are: TM, other columns...
        // Actually, need to parse properly.

        // Let's assume the CSV has headers, and TM is one of them.
        // To make it robust, parse as array of objects.

        const rows = [];
        const headers = header.split(',').map(h => h.trim());

        const tmIndex = headers.indexOf('TM');
        if (tmIndex === -1) {
            console.log('TM column not found.');
            return { twoWeeksAgo: null, lastTM: null };
        }

        for (const line of dataLines) {
            const values = line.split(',');
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((h, i) => {
                    row[h] = values[i].trim();
                });
                rows.push(row);
            }
        }

        if (rows.length === 0) {
            console.log('No valid rows.');
            return { twoWeeksAgo: null, lastTM: null };
        }

        // Get last row's TM
        const lastRow = rows[rows.length - 1];
        const lastTM = new Date(lastRow.TM);

        if (isNaN(lastTM.getTime())) {
            console.log('Invalid TM format in last row.');
            return { twoWeeksAgo: null, lastTM: null };
        }

        // Calculate 2 weeks ago
        const twoWeeksAgo = new Date(lastTM.getTime() - 14 * 24 * 60 * 60 * 1000);

        // Filter rows
        const filteredRows = rows.filter(row => {
            const tm = new Date(row.TM);
            return tm >= twoWeeksAgo;
        });

        // Create output CSV
        const outputLines = [header];
        filteredRows.forEach(row => {
            const line = headers.map(h => row[h]).join(',');
            outputLines.push(line);
        });

        const outputCSV = outputLines.join('\n');

        // Write to file
        fs.writeFileSync(outputPath, outputCSV);
        console.log(`Filtered CSV saved to ${outputPath}`);

        return { twoWeeksAgo, lastTM };

    } catch (error) {
        console.error('Error:', error.message);
        return { twoWeeksAgo: null, lastTM: null };
    }
}

async function main() {
    const { twoWeeksAgo, lastTM } = await downloadAndFilterCSV();
    if (twoWeeksAgo && lastTM) {
        await fetchWaterLevels(twoWeeksAgo, lastTM);
    } else {
        console.log('Failed to get timeframe from cyclone data, skipping water levels.');
    }
}

main();