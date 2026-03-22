const fs = require('fs');
const path = require('path');

const htmlDir = path.join(__dirname, 'html');

const csvPath = path.join(__dirname, 'data', 'flood-level.csv');
// Always overwrite and write header
fs.mkdirSync(path.dirname(csvPath), { recursive: true });
fs.writeFileSync(csvPath, '"station_id","station_name","minor","moderate","major"\n');

const htmlFiles = fs.readdirSync(htmlDir).filter(f => f.endsWith('.html'));


for (const file of htmlFiles) {
    const filePath = path.join(htmlDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    // Find all <area ... onmouseover="javascript:PopupRiver(...)">
    const areaRegex = /<area[^>]+onmouseover="javascript:PopupRiver\(([^)]*)\)"/g;
    let match;
    while ((match = areaRegex.exec(content)) !== null) {
        const argsStr = match[1];
        // Split args by comma, but handle quoted strings
        const args = argsStr.match(/\"(.*?)\"|[^,]+/g)?.map(s => s.replace(/^\"|\"$/g, '').trim()) || [];
        if (args.length < 4) continue; // Not enough args
        const stationId = args[1] ? args[1].replace(/"/g, '').replace(/&quot;/g, '').replace(/'/g, '').trim() : '';
        const stationName = args[0].replace(/"/g, '').replace(/&quot;/g, '').replace(/'/g, '');
        // The last 4 variables are the flood levels (may be empty or ",")
        let minor = args[args.length - 4] ? args[args.length - 4].replace(/'/g, '').trim() : '';
        let moderate = args[args.length - 3] ? args[args.length - 3].replace(/'/g, '').trim() : '';
        let major = args[args.length - 2] ? args[args.length - 2].replace(/'/g, '').trim() : '';
        // Only add if minor is not empty, not just a comma, not just whitespace, and contains at least one digit
        if (minor && minor !== ',' && minor.trim() !== '' && /\d/.test(minor)) {
            const row = `"${stationId}","${stationName}","${minor}","${moderate}","${major}"\n`;
            fs.appendFileSync(csvPath, row);
        }
    }
}

console.log(`Extraction complete. Results saved to ${csvPath}`);
