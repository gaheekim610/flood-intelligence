const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const FTP_BASE_URL = 'ftp://ftp.bom.gov.au/anon/gen/fwo';
const MIN_ID = 20705;
const MAX_ID = 20879;

const xmlDir = path.join(__dirname, 'xml');
const dataDir = path.join(__dirname, 'data');
const outputPath = path.join(dataDir, 'active-flood-warning.csv');

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function runCurl(args) {
    try {
        return execFileSync('curl.exe', args, {
            encoding: 'utf-8',
            stdio: ['ignore', 'pipe', 'pipe']
        });
    } catch (error) {
        const stderr = (error.stderr || '').toString().trim();
        const stdout = (error.stdout || '').toString().trim();
        throw new Error(`curl failed: ${stderr || stdout || error.message}`);
    }
}

function listFtpFiles() {
    const output = runCurl([
        '--silent',
        '--show-error',
        '--list-only',
        `${FTP_BASE_URL}/`
    ]);

    return output
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
}

function filterTargetXmlFiles(fileNames) {
    return fileNames
        .map(name => {
            const match = /^IDQ(\d{5})\.xml$/i.exec(name);
            if (!match) return null;

            const id = Number(match[1]);
            if (id < MIN_ID || id > MAX_ID) return null;

            return name;
        })
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
}

function downloadXmlFiles(fileNames) {
    for (const fileName of fileNames) {
        const remoteUrl = `${FTP_BASE_URL}/${fileName}`;
        const localPath = path.join(xmlDir, fileName);

        runCurl([
            '--silent',
            '--show-error',
            '--fail',
            '--output',
            localPath,
            remoteUrl
        ]);

        console.log(`Downloaded ${fileName}`);
    }
}

function extractAttribute(tagHeader, name) {
    const pattern = new RegExp(`${name}="([^"]*)"`, 'i');
    const match = tagHeader.match(pattern);
    return match ? match[1].trim() : '';
}

function extractElementValue(block, elementType) {
    const pattern = new RegExp(`<element\\s+type="${elementType}">([\\s\\S]*?)<\\/element>`, 'i');
    const match = block.match(pattern);
    if (!match) return '';

    return decodeXml(match[1].trim());
}

function decodeXml(text) {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/gi, "'");
}

function toTimestamp(observationText) {
    if (!observationText) return '';

    const match = observationText.match(
        /^(\d{1,2}):(\d{2})\s*(am|pm)\s+\w{3}\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/i
    );

    if (!match) return '';

    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const ampm = match[3].toLowerCase();
    const day = Number(match[4]);
    const month = Number(match[5]);
    let year = Number(match[6]);

    if (year < 100) {
        year += 2000;
    }

    if (ampm === 'pm' && hour !== 12) {
        hour += 12;
    }
    if (ampm === 'am' && hour === 12) {
        hour = 0;
    }

    const pad2 = n => String(n).padStart(2, '0');

    return `${year}${pad2(month)}${pad2(day)}${pad2(hour)}${pad2(minute)}00`;
}

function normalizeSeverity(rawSeverity) {
    const text = (rawSeverity || '').toLowerCase();

    if (text.includes('major')) return 'major';
    if (text.includes('moderate')) return 'moderate';
    if (text.includes('minor')) return 'minor';

    return '';
}

function normalizeSeverityCode(rawCode) {
    const code = (rawCode || '').toUpperCase();
    if (code === 'MAJ') return 'major';
    if (code === 'MOD') return 'moderate';
    if (code === 'MIN') return 'minor';
    return '';
}

function extractBasinSeverityMap(xmlText) {
    const severityByBasinAac = new Map();
    const basinPattern = /<area\b([^>]*\btype="river-basin"[^>]*)>([\s\S]*?)<\/area>/gi;

    let match;
    while ((match = basinPattern.exec(xmlText)) !== null) {
        const attrs = match[1];
        const inner = match[2];
        const basinAac = extractAttribute(attrs, 'aac');
        const severityText = extractElementValue(inner, 'severity');
        let severity = normalizeSeverity(severityText);

        if (!severity) {
            const hazardMatch = inner.match(/<hazard\b[^>]*\bseverity="([A-Z]+)"/i);
            severity = normalizeSeverityCode(hazardMatch ? hazardMatch[1] : '');
        }

        if (basinAac && severity) {
            severityByBasinAac.set(basinAac, severity);
        }
    }

    return severityByBasinAac;
}

function parseStationsFromXml(xmlText, sourceFile) {
    const result = [];
    const severityByBasinAac = extractBasinSeverityMap(xmlText);

    const stationPattern = /<area\b([^>]*\btype="river-obs-site"[^>]*)>([\s\S]*?)<\/area>/gi;

    let match;
    while ((match = stationPattern.exec(xmlText)) !== null) {
        const attrs = match[1];
        const inner = match[2];

        const parentAac = extractAttribute(attrs, 'parent-aac');
        const severity = severityByBasinAac.get(parentAac) || '';

        const observationTimeRaw = extractElementValue(inner, 'observation_time');

        result.push({
            severity,
            obs_site_description: extractElementValue(inner, 'obs_site_description'),
            obs_site_latitude: extractElementValue(inner, 'obs_site_latitude'),
            obs_site_longitude: extractElementValue(inner, 'obs_site_longitude'),
            obs_river_height: extractElementValue(inner, 'obs_river_height'),
            observation_time: toTimestamp(observationTimeRaw),
            source_file: sourceFile
        });
    }

    return result;
}

function processDownloadedXmlFiles(fileNames) {
    const allStations = [];

    for (const fileName of fileNames) {
        const xmlPath = path.join(xmlDir, fileName);
        const xmlText = fs.readFileSync(xmlPath, 'utf-8');
        const stations = parseStationsFromXml(xmlText, fileName);

        allStations.push(...stations);
        console.log(`Parsed ${stations.length} stations from ${fileName}`);
    }

    return allStations;
}

function csvEscape(value) {
    const text = value == null ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows) {
    const headers = [
        'severity',
        'obs_site_description',
        'obs_site_latitude',
        'obs_site_longitude',
        'obs_river_height',
        'observation_time',
        'source_file'
    ];

    const lines = [headers.join(',')];

    for (const row of rows) {
        const line = headers.map(header => csvEscape(row[header])).join(',');
        lines.push(line);
    }

    return `${lines.join('\n')}\n`;
}

function main() {
    ensureDir(xmlDir);
    ensureDir(dataDir);

    console.log(`Listing files in ${FTP_BASE_URL}/ ...`);
    const allFtpFiles = listFtpFiles();
    const xmlFiles = filterTargetXmlFiles(allFtpFiles);

    console.log(`Found ${xmlFiles.length} XML files in range IDQ${MIN_ID}-IDQ${MAX_ID}`);

    if (xmlFiles.length === 0) {
        console.log('No matching XML files found.');
        return;
    }

    downloadXmlFiles(xmlFiles);

    const stationData = processDownloadedXmlFiles(xmlFiles);
    const csv = toCsv(stationData);
    fs.writeFileSync(outputPath, csv, 'utf-8');

    console.log(`Saved ${stationData.length} station rows to ${outputPath}`);
}

main();
