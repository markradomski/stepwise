// Runs the explanation evaluation through Vite's module loader so the TypeScript sources are used as they are.
//   (default)    deterministic provider only, no network
//   --llm        also evaluates the configured model (opt-in: uses the API, needs LLM_API_KEY)
//   --review     builds the human review file from the deterministic baseline and the last saved live run
//   --prompt=ID  evaluate a specific prompt version (default: the active one)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer, loadEnv } from 'vite';

const args = process.argv.slice(2);
const mode = args.includes('--llm') ? 'llm' : args.includes('--review') ? 'review' : 'deterministic';
const prompt = args.find((arg) => arg.startsWith('--prompt='))?.slice('--prompt='.length);
const env = { ...loadEnv('development', '.', ''), ...(prompt && { EXPLANATION_PROMPT_VERSION: prompt }) };
const dir = 'evaluation-output';
const read = (name) => (existsSync(`${dir}/${name}`) ? JSON.parse(readFileSync(`${dir}/${name}`, 'utf8')) : undefined);

const server = await createServer({ appType: 'custom', server: { middlewareMode: true }, logLevel: 'error' });
try {
  const { main } = await server.ssrLoadModule('/src/features/explanation/evaluation/cli.ts');
  const saved = { llm: read('latest.json')?.llm, humanReview: read('human-review.json') };
  const { output, code, json, review } = await main({ mode, env, saved });
  console.log(output);
  mkdirSync(dir, { recursive: true });
  if (mode === 'llm' && json.llm) {
    writeFileSync(`${dir}/latest.json`, JSON.stringify(json, null, 2));
    console.log(`\nSaved ${dir}/latest.json`);
  }
  if (review) {
    writeFileSync(`${dir}/explanation-review.md`, review);
    console.log(`Wrote ${dir}/explanation-review.md`);
  }
  process.exitCode = code;
} finally {
  await server.close();
}
