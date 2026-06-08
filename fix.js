const fs = require('fs');
let c = fs.readFileSync('smart-insights-prototype.html', 'utf8').trim();
if (c.startsWith('"')) {
    c = c.substring(1, c.length - (c.endsWith('"') ? 1 : 0));
    c = c.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    fs.writeFileSync('smart-insights-prototype.html', c);
    console.log('Fixed HTML formatting via substring');
}
