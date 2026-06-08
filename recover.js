const fs = require('fs');
const readline = require('readline');

async function recover() {
    const fileStream = fs.createReadStream('C:\\Users\\Lauti\\.gemini\\antigravity\\brain\\e7e123a5-017e-4087-b8f3-821d3ee778a0\\.system_generated\\logs\\transcript.jsonl');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let linesMap = {}; 

    for await (const line of rl) {
        try {
            const entry = JSON.parse(line);
            if (entry.type === 'VIEW_FILE' && entry.content && entry.content.includes('smart-insights-prototype.html')) {
                const lines = entry.content.split('\n');
                for (const l of lines) {
                    const match = l.match(/^(\d+):\s(.*)$/);
                    if (match) {
                        linesMap[parseInt(match[1], 10)] = match[2];
                    }
                }
            }
        } catch (e) {}
    }
    
    let maxLine = Math.max(...Object.keys(linesMap).map(n => parseInt(n, 10)), 0);
    console.log("Max line recovered:", maxLine);
    
    let out = [];
    for (let i = 1; i <= maxLine; i++) {
        out.push(linesMap[i] !== undefined ? linesMap[i] : `/* MISSING LINE ${i} */`);
    }
    fs.writeFileSync('c:\\Users\\Lauti\\Documents\\CLAUDE\\fime\\smart-insights-prototype.html', out.join('\n'));
}
recover();
