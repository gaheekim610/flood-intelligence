// Helper to wait for a given ms
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const csvPath = path.join(__dirname, 'data', 'station_ids.csv');

// Read all station IDs from CSV (assume header is 'STATION')
function readStationIds(filePath, startIndex = 0, endIndex = undefined) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const ids = content
        .split('\n')
        .slice(1) // skip header
        .map(line => line.split(',')[0].trim())
        .filter(id => id.length > 0);
    return ids.slice(startIndex, endIndex);
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

async function main(startTime, endTime, startIndex = 0, endIndex = undefined) {
    const stationIds = readStationIds(csvPath, startIndex, endIndex);
    // Set your desired time range here
    // const startTime = '20260311000000';
    // const endTime = '20260312000000';
    const waitTimeMs = 100; // 0.1 second wait between requests to avoid rate limits

    const startTimeMs = Date.now();

    if (stationIds.length === 0) {
        console.log('No station IDs found.');
        return;
    }

    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
    }
    const csvOutPath = path.join(dataDir, 'all_water_levels.csv');
    // Write header if file does not exist
    if (!fs.existsSync(csvOutPath)) {
        fs.writeFileSync(csvOutPath, 'station_id,longitude,latitude,station_name,time,value\n');
    }

    for (const stationId of stationIds) {
        console.log(`Fetching water level for station ${stationId}...`);
        const data = await fetchWaterLevel(stationId, startTime, endTime);
        if (!data || !data.return || !Array.isArray(data.return.traces) || data.return.traces.length === 0) {
            // No data for this station, skip
            console.log(`No data for station ${stationId}`);
            await wait(waitTimeMs);
            continue;
        }
        // Use only the first trace as per your note
        const traceObj = data.return.traces[0];
        const site = traceObj.site ?? '';
        const longitude = traceObj.site_details.longitude ?? '';
        const latitude = traceObj.site_details.latitude ?? '';
        const stationName = traceObj.site_details.name ?? '';
        const points = Array.isArray(traceObj.trace) ? traceObj.trace : [];
        if (points.length === 0) {
            // No data points for this trace
            console.log(`No data points for station ${stationId}`);
            await wait(waitTimeMs);
            continue;
        }
        for (const point of points) {
            // point: { t: time, v: value }
            const time = point.t ?? '';
            const value = point.v ?? '';
            const row = `${site},${longitude},${latitude},"${stationName}",${time},${value}\n`;
            fs.appendFileSync(csvOutPath, row);
        }

        await wait(waitTimeMs);
    }
    const endTimeMs = Date.now();
    console.log(`Total fetching time: ${(endTimeMs - startTimeMs) / 1000} seconds`);
    console.log(`All results saved to ${csvOutPath}`);
}

main(20260311000000, 20260312000000, 100, 200); // Example: fetch for first 100 stations for a specific day
