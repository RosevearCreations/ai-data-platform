import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import { QL246_PATH } from './ql246-source-proof.mjs';
import { QL253_RELEASE, inspectQl253SixAppReturns, ql253OriginUrls,
  inspectQl253OriginChain, inspectQl253PinRenewal, inspectQl253OwnerTestReview }
  from './ql253-six-app-origin-pin-test-review.mjs';
import { runQl253PublicGithub, ql253GetPublicGithub }
  from './ql253-public-github-proof-recheck.mjs';

const now = Date.UTC(2026, 9, 28, 22, 0);
const hash = v => createHash('sha256').update(v).digest('hex');
const rawReturns = JSON.parse(await readFile(new URL('../../../docs/integration/ql253-six-app-owner-source-returns.json', import.meta.url), 'utf8'));

test('QL253 records six owner-supplied source returns as HELD; no B, owner or real gateway', () => {
  const r = inspectQl253SixAppReturns(rawReturns);
  assert.equal(r.release, QL253_RELEASE);
  assert.equal(r.status, 'SIX_APP_SOURCE_RETURN_GAPS_HELD');
  assert.equal(r.rows.length, 6);
  assert.equal(r.proofCandidates, 0);
  assert.equal(r.rows[0].status, 'SOURCE_OR_EXACT_GITHUB_ACTIONS_CI_PENDING_HELD');
  assert.equal(r.rows[1].status, 'SIGNED_PROOF_COMMIT_B_NOT_AVAILABLE_HELD');
  assert.equal(r.rows[2].status, 'SIGNED_PROOF_COMMIT_B_NOT_AVAILABLE_HELD');
  assert.equal(r.rows[3].status, 'SOURCE_OR_EXACT_GITHUB_ACTIONS_CI_PENDING_HELD');
  assert.equal(r.rows[4].status, 'SIGNED_PROOF_COMMIT_B_NOT_AVAILABLE_HELD');
  assert.equal(r.rows[5].status, 'SOURCE_OR_EXACT_GITHUB_ACTIONS_CI_PENDING_HELD');
  assert.equal(r.ownerTestAuthorization, 'NOT_GIVEN');
  assert.equal(r.phaseB, 'HELD');
  assert.equal(r.connectionState, 'DISCONNECTED');
  assert.equal(r.externalGatewayGets, 0);
  assert.equal(r.realPilotHolds, 12);
});

test('QL253 denies incomplete count, wrong system/repo, fake owner consent and gateway tests', () => {
  assert.equal(inspectQl253SixAppReturns(rawReturns.slice(1)).status, 'DENIED_SIX_APP_RETURN_COUNT');
  for (const alter of [
    r => { r[3].system = 'devilndove'; },
    r => { r[2].repository = 'RosevearCreations/other'; },
    r => { r[1].ownerTestDecision = 'APPROVED'; },
    r => { r[1].actualGatewayTest = 'RUN'; },
    r => { r[1].connectionState = 'CONNECTED'; },
    r => { r[4].sourceCiRunUrl = 'https://example.invalid/actions/runs/1'; },
    r => { r[1].apiSecret = 'forbidden'; }
  ]) {
    const x = structuredClone(rawReturns); alter(x);
    assert.equal(inspectQl253SixAppReturns(x).status, 'DENIED_SIX_APP_ORIGIN_SCOPE');
  }
});

function candidate() {
  return { ...rawReturns[1], proofShaB: 'b'.repeat(40),
    proofRawSha256: hash('proof'), publicSpkiSha256: 'c'.repeat(64) };
}

test('QL253 never calls the public network for an incomplete proof or no fetch instruction', async () => {
  assert.equal((await inspectQl253OriginChain(rawReturns[1], () => {
    throw new Error('Should not fetch a missing proof');
  })).status, 'PROOF_PUBLICATION_OR_CI_GAP_HELD');
  assert.equal((await inspectQl253OriginChain(candidate())).status, 'PUBLIC_GITHUB_RECHECK_NOT_RUN_HELD');
  assert.throws(() => ql253OriginUrls({ ...candidate(), proofShaB: candidate().sourceShaA }),
    /DENIED_INCOMPLETE_PROOF_ORIGIN/);
});

test('QL253 constructs only known public GitHub GET URLs, validates exact ancestry, source CI and bytes', async () => {
  const row = candidate(), urls = ql253OriginUrls(row);
  assert.ok(urls.proof.endsWith(`/${QL246_PATH}`));
  assert.ok(urls.proof.startsWith('https://raw.githubusercontent.com/RosevearCreations/devilndove-site/'));
  assert.ok(Object.values(urls).every(u => u.startsWith('https://api.github.com/repos/RosevearCreations/') ||
    u.startsWith('https://raw.githubusercontent.com/RosevearCreations/')));
  const proof = JSON.stringify({ payload: { source_revision: row.sourceShaA,
    ci_run_url: row.sourceCiRunUrl, source_system: row.system, repository: row.repository } });
  row.proofRawSha256 = hash(proof);
  const response = new Map([
    [urls.source, JSON.stringify({ sha: row.sourceShaA })],
    [urls.proof, proof],
    [urls.ancestry, JSON.stringify({ status: 'ahead', merge_base_commit: { sha: row.sourceShaA },
      ahead_by: 1, behind_by: 0 })],
    [urls.ci, JSON.stringify({ id: 40794862120, head_sha: row.sourceShaA,
      status: 'completed', conclusion: 'success', repository: { full_name: row.repository } })]
  ]);
  const allowed = await inspectQl253OriginChain(row, async url => {
    assert.ok(response.has(url)); return { status: 200, body: response.get(url) };
  });
  assert.equal(allowed.status, 'PUBLIC_SOURCE_ORIGIN_METADATA_MATCHED_SIGNATURE_PIN_NOT_TRUSTED_HELD');
  assert.equal(allowed.ownerTestAuthorization, 'NOT_GIVEN');
  assert.equal(allowed.externalGatewayGets, 0);
  const wrong = await inspectQl253OriginChain(row, async url => ({ status: 200,
    body: url === urls.proof ? proof + '\n' : response.get(url) }));
  assert.equal(wrong.status, 'PUBLIC_PROOF_RAW_DIGEST_INVALID_HELD');
  const badRun = await inspectQl253OriginChain(row, async url => ({ status: 200,
    body: url === urls.ci ? JSON.stringify({ id: 40794862120, head_sha: 'f'.repeat(40),
      status: 'completed', conclusion: 'success', repository: { full_name: row.repository } }) : response.get(url) }));
  assert.equal(badRun.status, 'PUBLIC_ORIGIN_SOURCE_CI_ANCESTRY_DRIFT_HELD');
  const missing = await inspectQl253OriginChain(row, async url => ({ status: url === urls.proof ? 404 : 200,
    body: response.get(url) }));
  assert.equal(missing.status, 'PUBLIC_PROOF_OR_GITHUB_ORIGIN_MISSING_HELD');
});

test('QL253 pin custody renewal is a HELD metadata challenge, never authenticates a person', () => {
  const packet = { system: 'icamp', sourceShaA: 'a'.repeat(40), proofShaB: 'b'.repeat(40),
    presentedSpkiSha256: 'c'.repeat(64), independentPinSpkiSha256: 'c'.repeat(64),
    challengeId: 'np-ql253-test-challenge', nonceBase64Url: randomBytes(32).toString('base64url'),
    custodianReceiptId: 'np-ql253-custodian', independentWitnessReceiptId: 'np-ql253-witness',
    channel: 'PRIVATE_TRUST_REGISTRY', issuedAtMs: now - 1000, expiresAtMs: now + 100000 };
  const matched = inspectQl253PinRenewal(packet, { now });
  assert.equal(matched.status, 'PIN_RENEWAL_METADATA_MATCHED_REAL_CUSTODY_ATTESTATION_HELD');
  assert.equal(matched.independentlyVerifiedPins, 0);
  assert.equal(inspectQl253PinRenewal(packet, { now, usedIds: [packet.challengeId] }).status,
    'DENIED_PIN_RENEWAL_SCOPE_OR_REPLAY');
  for (const change of [
    p => { p.independentPinSpkiSha256 = 'd'.repeat(64); },
    p => { p.expiresAtMs = now - 1; },
    p => { p.channel = 'GITHUB_SELF_ATTESTED'; },
    p => { p.independentWitnessReceiptId = p.custodianReceiptId; },
    p => { p.method = 'POST'; }
  ]) {
    const bad = structuredClone(packet); change(bad);
    assert.equal(inspectQl253PinRenewal(bad, { now }).status,
      'DENIED_PIN_RENEWAL_SCOPE_OR_REPLAY');
  }
});

test('QL253 TEST-only owner request remains NOT GIVEN; fake approval and POST are denied', () => {
  const base = { system: 'devilndove', decision: 'PRIVATE_REVIEW_REQUESTED',
    environment: 'nonproduction', methods: ['GET'],
    paths: ['/api/integration/v1/health', '/api/integration/v1/capabilities'],
    startUtc: '2026-10-30T12:00:00.000Z', endUtc: '2026-10-30T12:20:00.000Z',
    ownerReceiptId: 'NOT_AVAILABLE' };
  const result = inspectQl253OwnerTestReview(base);
  assert.equal(result.status, 'OWNER_TEST_ONLY_PRIVATE_AUTHORIZATION_STILL_HELD');
  assert.equal(result.ownerTestAuthorization, 'NOT_GIVEN');
  for (const mutate of [
    r => { r.decision = 'APPROVED'; },
    r => { r.methods = ['POST']; },
    r => { r.paths = ['https://example.invalid/private']; },
    r => { r.ownerReceiptId = 'np-fake-approved'; },
    r => { r.endUtc = '2026-10-30T13:00:00.000Z'; }
  ]) {
    const bad = structuredClone(base); mutate(bad);
    assert.equal(inspectQl253OwnerTestReview(bad).status, 'DENIED_OWNER_TEST_SCOPE');
  }
});

test('QL253 public retry runs zero network by default and limits opt-in to GitHub', async () => {
  let used = 0;
  const blocked = await runQl253PublicGithub([], async () => { used++; throw Error('network not permitted'); });
  assert.equal(used, 0);
  assert.equal(blocked.rows.length, 6);
  assert.ok(blocked.rows.every(x => x.proofAtObservedMain === 'NOT_CHECKED_NO_NETWORK'));
  const observed = await runQl253PublicGithub(['--public-get'], async url => {
    used++;
    assert.ok(url.startsWith('https://api.github.com/repos/RosevearCreations/') ||
      url.startsWith('https://raw.githubusercontent.com/RosevearCreations/'));
    if (url.includes('/git/ref/heads/main')) return { status: 200,
      body: JSON.stringify({ ref: 'refs/heads/main', object: { sha: 'a'.repeat(40) } }) };
    return { status: 404, body: null };
  });
  assert.equal(used, 12);
  assert.ok(observed.rows.every(x => x.proofAtObservedMain === 'MISSING_SIGNED_PROOF_404'));
  assert.equal(observed.connectionState, 'DISCONNECTED');
  for (const url of ['http://api.github.com/repos/RosevearCreations/iCamp/git/ref/heads/main',
    'https://api.github.com.evil.invalid/repos/RosevearCreations/iCamp/git/ref/heads/main',
    'https://api.github.com/repos/RosevearCreations/iCamp/git/ref/heads/main?secret=x',
    'https://192.168.0.1/private']) {
    await assert.rejects(ql253GetPublicGithub(url, () => {
      throw Error('Forbidden network invoked');
    }), /DENIED_PUBLIC_GITHUB_URL/);
  }
});
