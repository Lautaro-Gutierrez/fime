const fs = require('fs');
const readline = require('readline');

async function check() {
    const fileStream = fs.createReadStream('C:\\Users\\Lauti\\.gemini\\antigravity\\brain\\e7e123a5-017e-4087-b8f3-821d3ee778a0\\.system_generated\\logs\\transcript.jsonl');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        try {
            const entry = JSON.parse(line);
            if (entry.type === 'TOOL_RESPONSE' && entry.content && entry.content.includes('smart-insights-prototype.html')) {
                console.log(entry.content.substring(0, 500));
                console.log('---');
                break; // only first match
            }
        } catch (e) {}
    }
}
check();
