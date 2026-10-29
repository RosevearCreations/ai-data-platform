#!/usr/bin/env node
/** QL253: explicitly opted-in, public GitHub source/proof check only. */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { QL246_PATH } from './ql246-source-proof.mjs';
import { QL253_RELEASE, QL253_REPOSITORIES, inspectQl253SixAppReturns }
  from './ql253-six-app-origin-pin-test-review.mjs';

const run = promisify(execFile);
const STATUS = '\n__QL253_HTTP_STATUS__';
const REV = /^[0-9a-f]{40}$/;
const raw = await readFile(new URL('../../../docs/integration/ql253-six-app-owner-source-returns.json', import.meta.url), 'utf8');
const returns = JSON.parse(raw);

function publicUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && !u.username && !u.password && !u.port && !u.search && !u.hash &&
      QL253_REPOSITORIES.some(repo =>
        (u.hostname === 'api.github.com' &&
          u.pathname === `/repos/RosevearCreations/${repo}/git/ref/heads/main`) ||
        (u.hostname === 'raw.githubusercontent.com' &&
          new RegExp(`^/RosevearCreations/${repo}/[0-9a-f]{40}/docs/integration/ql246-source-proof\\.json$`).test(u.pathname)));
  } catch { return false; }
}

export async function ql253GetPublicGithub(url, command = run) {
  if (!publicUrl(url)) throw new Error('DENIED_PUBLIC_GITHUB_URL');
  const o = await command('curl', ['-q','--silent','--show-error','--max-time','8',
    '--max-filesize','65536','--max-redirs','0','--proto','=https',
    '--request','GET','--header','Accept: application/json',
    '--user-agent','ai-data-platform-ql253-public-proof',
    '--write-out', `${STATUS}%{http_code}`, url],
  { encoding: 'utf8', maxBuffer: 68000, timeout: 10000, shell: false });
  const output = o?.stdout;
  if (typeof output !== 'string' || Buffer.byteLength(output) > 68000)
    throw new Error('DENIED_RESPONSE_SIZE');
  const pos = output.lastIndexOf(STATUS);
  if (pos < 0) throw new Error('DENIED_HTTP_STATUS');
  const code = output.slice(pos + STATUS.length), body = output.slice(0, pos);
  if (code === '404') return { status: 404, body: null };
  if (code !== '200' || Buffer.byteLength(body) > 65536) throw new Error('DENIED_HTTP_OR_SIZE');
  return { status: 200, body };
}

export async function runQl253PublicGithub(args = process.argv.slice(2), getPublic = ql253GetPublicGithub) {
  if (args.length > 1 || args.length === 1 && args[0] !== '--public-get')
    throw new Error('Usage: node scripts/ql253-public-github-proof-recheck.mjs [--public-get]');
  const review = inspectQl253SixAppReturns(returns);
  if (args.length === 0) return {
    release: QL253_RELEASE, publicGithubGet: false, observedAtUtc: null,
    ...review, rows: review.rows.map(r => ({ ...r, currentMainSha: null,
      proofAtObservedMain: 'NOT_CHECKED_NO_NETWORK' }))
  };
  const rows = [];
  for (const source of returns) {
    const repo = source.repository.slice('RosevearCreations/'.length);
    let main = null, proof = 'PUBLIC_GITHUB_SOURCE_NOT_RETRIEVED';
    try {
      const ref = await getPublic(`https://api.github.com/repos/RosevearCreations/${repo}/git/ref/heads/main`);
      const info = ref?.status === 200 ? JSON.parse(ref.body) : null;
      if (!REV.test(info?.object?.sha || '') || info.ref !== 'refs/heads/main') throw Error('Bad ref');
      main = info.object.sha;
      const result = await getPublic(`https://raw.githubusercontent.com/RosevearCreations/${repo}/${main}/${QL246_PATH}`);
      proof = result.status === 404 ? 'MISSING_SIGNED_PROOF_404' :
        result.status === 200 ? 'PRESENT_PUBLIC_PROOF_UNTRUSTED_PENDING_SIGNATURE_PIN_CI' : 'PUBLIC_PROOF_FETCH_UNVERIFIED';
    } catch { proof = 'PUBLIC_GITHUB_FETCH_FAILED_NOT_EQUIVALENT_TO_404'; }
    rows.push({ system: source.system, repository: source.repository,
      reportedSourceShaA: source.sourceShaA, currentMainSha: main,
      reportedProofShaB: source.proofShaB, proofAtObservedMain: proof,
      ownerTestDecision: 'NOT_GIVEN', connectionState: 'DISCONNECTED' });
  }
  return { release: QL253_RELEASE, publicGithubGet: true,
    observedAtUtc: new Date().toISOString(), status: 'PUBLIC_SOURCE_PROOF_RECHECK_COMPLETE_CONNECTION_HELD',
    rows, ownerTestAuthorization: 'NOT_GIVEN', ownerPilotAuthorization: 'NOT_GIVEN',
    externalGatewayGets: 0, connectionState: 'DISCONNECTED', phaseB: 'HELD', realPilotHolds: 12,
    writes: 0, calls: 0, sms: 0, dispatch: 0 };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runQl253PublicGithub().then(x => process.stdout.write(JSON.stringify(x, null, 2) + '\n'))
    .catch(e => { process.stderr.write(e.message + '\n'); process.exitCode = 2; });
}
