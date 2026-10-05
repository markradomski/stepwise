// Runs the explanation evaluation through Vite's module loader so the TypeScript sources are used as they are.
//   (default)    deterministic provider only, no network
//   --llm        also evaluates the configured model (opt-in: uses the API, needs LLM_API_KEY)
//   --review     builds the human review file from the deterministic baseline and the last saved live run
//   --case=ID    restrict the live run to one case (repeatable); saved separately from the full run
//   --out=NAME   name of the saved results file (default: latest)
//   --run=NAME   which saved live run the review mode reads (default: latest)
//   --prompt=ID  evaluate a specific prompt version (default: the active one)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer, loadEnv } from 'vite';

const args = process.argv.slice(2);
const mode = args.includes('--llm') ? 'llm' : args.includes('--review') ? 'review' : 'deterministic';
const caseIds = args.filter((arg) => arg.startsWith('--case=')).map((arg) => arg.slice('--case='.length));
const out = args.find((arg) => arg.startsWith('--out='))?.slice('--out='.length);
const prompt = args.find((arg) => arg.startsWith('--prompt='))?.slice('--prompt='.length);
const env = { ...loadEnv('development', '.', ''), ...(prompt && { EXPLANATION_PROMPT_VERSION: prompt }) };
const dir = 'evaluation-output';
const run = args.find((arg) => arg.startsWith('--run='))?.slice('--run='.length) ?? 'latest';
const readFile = (path) => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : undefined);
const read = (name) => readFile(`${dir}/${name}`);

const server = await createServer({ appType: 'custom', server: { middlewareMode: true }, logLevel: 'error' });
try {
  const { main } = await server.ssrLoadModule('/src/features/explanation/evaluation/cli.ts');
  // Reviewed judgements are committed under docs/evaluation; raw live output stays in the ignored output folder.
  const saved = { llm: read(`${run}.json`)?.llm, humanReview: readFile(`docs/evaluation/human-review-${run}.json`) };
  const { output, code, json, review } = await main({ mode, env, saved, caseIds });
  console.log(output);
  mkdirSync(dir, { recursive: true });
  if (mode === 'llm' && json.llm) {
    const file = `${dir}/${out ?? (caseIds.length ? `rerun-${Date.now()}` : 'latest')}.json`;
    writeFileSync(file, JSON.stringify(json, null, 2));
    console.log(`\nSaved ${file}`);
  }
  if (review) {
    writeFileSync(`${dir}/explanation-review.md`, review);
    console.log(`Wrote ${dir}/explanation-review.md`);
  }
  process.exitCode = code;
} finally {
  await server.close();
}
