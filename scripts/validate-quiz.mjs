import { readFile } from 'node:fs/promises';
import { compileBank, TOPICS, validateBank } from '../src/features/quiz/bank.ts';
const content = Object.fromEntries(await Promise.all(TOPICS.map(async t => [t.id, JSON.parse(await readFile(new URL(`../src/features/quiz/content/${t.id}.json`, import.meta.url), 'utf8'))])));
const result = validateBank(compileBank(content));
console.log(result);
if (process.argv.includes('--release') && result.editorialPending) {
  console.error('Release gate: question-level editorial review has not been completed.');
  process.exitCode = 1;
}
