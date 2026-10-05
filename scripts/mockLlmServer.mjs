// A tiny stand-in for the model API, for trying fallback behaviour locally without a key.
// MOCK_MODE: ok (default) | invalid | slow | error | prose
import { createServer } from 'node:http';

const mode = process.env.MOCK_MODE ?? 'ok';
const port = Number(process.env.MOCK_PORT ?? 8787);

createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    const reply = (status, payload) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(payload));
    };
    if (mode === 'error') return reply(500, { error: 'boom' });
    if (mode === 'prose') return reply(200, { content: [{ type: 'text', text: 'Sure! Here is an explanation.' }] });
    const respond = () => {
      const input = { version: 'explanation-output/1', title: 'Why this step works', body: 'Mock explanation: both sides are changed in the same way, so the equation stays balanced.' };
      reply(200, { content: [{ type: 'tool_use', name: 'return_explanation', input: mode === 'invalid' ? { ...input, isCorrect: true } : input }] });
    };
    if (mode === 'slow') return setTimeout(respond, 20000);
    respond();
  });
}).listen(port, () => console.log(`mock model API (${mode}) on http://localhost:${port}`));
