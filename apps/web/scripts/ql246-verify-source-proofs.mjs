/** Public GET-only QL-246 review. Never sends HMAC credentials or owner decisions. */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { retrieveQl246PublicSource, reviewQl246Sources } from './ql246-source-proof.mjs';

export async function runQl246(args = process.argv.slice(2)) {
  const allowed = new Set(['--trusted-pins', '--output', '--fetch-public-proof']);
  const flags = new Map();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (!allowed.has(flag) || flags.has(flag)) throw new Error(`Unsupported or repeated flag: ${flag}`);
    if (flag === '--fetch-public-proof') flags.set(flag, true);
    else {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Expected a path after ${flag}`);
      flags.set(flag, args[++i]);
    }
  }
  if (!flags.has('--trusted-pins'))
    throw new Error('Provide --trusted-pins FILE from a separately verified operator channel.');
  const trusted = JSON.parse(await readFile(resolve(flags.get('--trusted-pins')), 'utf8'));
  const result = await reviewQl246Sources(trusted, {
    fetchPublic: flags.has('--fetch-public-proof') ? retrieveQl246PublicSource : undefined
  });
  const out = JSON.stringify(result, null, 2) + '\n';
  if (flags.has('--output')) await writeFile(resolve(flags.get('--output')), out, { flag: 'wx', mode: 0o600 });
  process.stdout.write(out);
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runQl246().then(result => {
    if (result.verifiedCount !== 6) process.exitCode = 2;
  }).catch(error => {
    process.stderr.write(`QL-246 review failed closed: ${error.message}\n`);
    process.exitCode = 2;
  });
}
