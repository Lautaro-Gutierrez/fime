const fs = require('fs');
const readline = require('readline');

async function extractSubagent() {
    const fileStream = fs.createReadStream('C:\\Users\\Lauti\\.gemini\\antigravity\\brain\\e10f0b60-3380-41a4-a210-231ee8264659\\.system_generated\\logs\\transcript.jsonl');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        try {
            const entry = JSON.parse(line);
            if (entry.tool_calls) {
                for (const call of entry.tool_calls) {
                    if (call.name === 'write_to_file' && call.args && call.args.TargetFile && call.args.TargetFile.includes('smart-insights-prototype.html')) {
                        fs.writeFileSync('C:\\Users\\Lauti\\Documents\\CLAUDE\\fime\\smart-insights-prototype.html', call.args.CodeContent);
                        console.log('Extracted original HTML!');
                        return;
                    }
                }
            }
        } catch (e) {}
    }
}
extractSubagent();
