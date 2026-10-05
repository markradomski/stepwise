// Runs the explanation evaluation through Vite's module loader so the TypeScript sources are used as they are.
// Default: deterministic provider only, no network. `--llm` also evaluates the configured model (opt-in, uses the API).
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer, loadEnv } from 'vite';

const mode = process.argv.includes('--llm') ? 'llm' : 'deterministic';
const env = loadEnv('development', '.', '');
const server = await createServer({ appType: 'custom', server: { middlewareMode: true }, logLevel: 'error' });
try {
  const { main } = await server.ssrLoadModule('/src/features/explanation/evaluation/cli.ts');
  const { output, code, json } = await main(mode, env);
  console.log(output);
  if (mode === 'llm' && json.llm) {
    mkdirSync('evaluation-output', { recursive: true });
    writeFileSync('evaluation-output/latest.json', JSON.stringify(json, null, 2));
  }
  process.exitCode = code;
} finally {
  await server.close();
}
