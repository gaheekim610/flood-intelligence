const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'https://water-monitoring.information.qld.gov.au/cgi/webservice.pl';

const requestBody = {
  function: 'get_db_info',
  version: '3',
  params: {
    table_name: 'SITE',
    return_type: 'array',
    field_list: ["STATION", "STNAME", "STNTYPE", "LATITUDE", "LONGITUDE", "LLDATUM"]
  }
};

async function fetchStationIDs() {
  console.log('Hello, World!');
  try {

    const response = await axios.post(API_URL, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = response.data;

    // Save the full response to a JSON file
    const jsonOutputPath = path.join(__dirname, 'temp', 'station_response.json');
    fs.mkdirSync(path.dirname(jsonOutputPath), { recursive: true });
    fs.writeFileSync(jsonOutputPath, JSON.stringify(data, null, 2));
    console.log(`📝 Saved full API response to ${jsonOutputPath}`);

    if (!data || !data.return || !Array.isArray(data.return.rows)) {
      console.log("🚀 ~ fetchStationIDs ~ data:", data)
      throw new Error('Unexpected response format');
    }

    // Each row is likely an object with a STATION property, or an array. Let's check the first row.
    const rows = data.return.rows;
    if (rows.length > 0 && typeof rows[0] === 'object' && rows[0] !== null) {
      const headers = Object.keys(rows[0]);
      const filteredRows = rows.filter(row => row.latitude !== '0.000000000' && row.longitude !== '0.000000000');
      const csvContent = headers.join(',') + '\n' + filteredRows.map(row => headers.map(h => `"${row[h]}"`).join(',')).join('\n');
      const outputPath = path.join(__dirname, 'data', 'stations.csv');
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, csvContent);
      console.log(`✅ Saved ${filteredRows.length} stations to ${outputPath}`);
    } else if (Array.isArray(rows[0])) {
      // If row is an array, just take the first element
      const stationIds = rows.map(row => row[0]);
      const csvContent = 'STATION\n' + stationIds.join('\n');
      const outputPath = path.join(__dirname, 'data', 'station_ids.csv');
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, csvContent);
      console.log(`✅ Saved ${stationIds.length} station IDs to ${outputPath}`);
    }
  } catch (error) {
    console.error('❌ Error fetching station IDs:', error);
  }
}

fetchStationIDs();
