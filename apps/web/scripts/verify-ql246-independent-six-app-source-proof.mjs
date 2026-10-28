import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import {
  QL246_SYSTEMS, QL246_NEGATIVES, QL246_METHODS, QL246_PATHS,
  ql246Canonical, ql246RawUrl, reviewQl246Sources, retrieveQl246PublicSource
} from './ql246-source-proof.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
const clock = 2_000_000_000_000;

function fixture() {
  const raw = new Map();
  const challengeNonce = 'B'.repeat(44);
  const manifest = {
    schema: 'rosevear.integration.ql246.trusted-pins.v1',
    challengeId: 'np-ql246-proof-challenge-001',
    challengeNonce,
    issuedAt: clock - 10_000,
    expiresAt: clock + 100_000,
    sources: []
  };
  for (const [i, system] of QL246_SYSTEMS.entries()) {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const repo = `isolated-${system}`;
    const sourceRevision = `${(i + 1).toString(16)}`.repeat(40);
    const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
    const publicKeyFingerprintSha256 = sha(publicKey.export({ type: 'spki', format: 'der' }));
    const tenantId = ['yw', 'icamp'].includes(system) ? `np-${system}-tenant-001` : null;
    const businessId = system === 'ai-data-platform' ? 'devilndove' : system;
    const payload = {
      schema_version: 'rosevear.integration.v1', source_system: system,
      repository: `RosevearCreations/${repo}`, source_revision: sourceRevision,
      challenge_id: manifest.challengeId, challenge_sha256: sha(challengeNonce),
      business_id: businessId, tenant_id: tenantId,
      environment: 'nonproduction',
      ci_run_url: `https://github.com/RosevearCreations/${repo}/actions/runs/${i + 1000}`,
      allowed_methods: [...QL246_METHODS], allowed_paths: [...QL246_PATHS],
      negative_tests: Object.fromEntries(QL246_NEGATIVES.map(k => [k, true])),
      gateway_audit_receipt_id: null, health_receipt_id: null,
      capabilities_receipt_id: null, registered_key_id: null,
      owner_authorization: 'NOT_GIVEN', connection_state: 'DISCONNECTED',
      external_gateway_get_verified: false, durable_audit_verified: false,
      owner_identity_verified: false, issued_at: clock - 5000, expires_at: clock + 90_000
    };
    const envelope = JSON.stringify({ publicKeyPem, payload,
      signature: sign(null, ql246Canonical(payload), privateKey).toString('base64url') });
    const row = { system, repository: repo, sourceRevision,
      sha256: sha(envelope), publicKeyFingerprintSha256, businessId, tenantId };
    manifest.sources.push(row);
    raw.set(ql246RawUrl(row), envelope);
  }
  return { manifest, raw };
}

test('no network, no owner decision, no provider operation without explicit public retrieval', async () => {
  const { manifest } = fixture();
  const result = await reviewQl246Sources(manifest, { now: clock });
  assert.equal(result.status, 'HOLD_FETCH_NOT_AUTHORIZED');
  assert.equal(result.verifiedCount, 0);
  assert.equal(result.ownerAuthorization, 'NOT_GIVEN');
  assert.equal(result.connectionState, 'DISCONNECTED');
  assert.equal(result.realPilotHolds, 12);
  assert.equal(result.writes + result.calls + result.sms + result.dispatch, 0);
});

test('six independently pinned source signatures are source-only, never live-pilot proof', async () => {
  const { manifest, raw } = fixture();
  const seen = [];
  const result = await reviewQl246Sources(manifest, {
    now: clock, fetchPublic: async url => { seen.push(url); return raw.get(url); }
  });
  assert.equal(seen.length, 6);
  assert.equal(new Set(seen).size, 6);
  assert.equal(result.verifiedCount, 6);
  assert.equal(result.status, 'SIX_PUBLIC_SOURCES_VERIFIED_EXTERNAL_TESTS_PENDING_HELD');
  assert.equal(result.externalGatewayAuthenticatedGetVerified, false);
  assert.equal(result.credentialExchangeVerified, false);
  assert.equal(result.independentOwnerIdentityVerified, false);
  assert.equal(result.readOnlyPilotAuthorized, false);
  assert.equal(result.livePilotReleased, false);
});

test('wrong trusted source digest or tampered signed payload fails closed', async () => {
  const { manifest, raw } = fixture();
  manifest.sources[2].sha256 = 'f'.repeat(64);
  let result = await reviewQl246Sources(manifest, { now: clock, fetchPublic: async url => raw.get(url) });
  assert.equal(result.status, 'HOLD_INCOMPLETE_OR_CONFLICTING_SOURCE_PROOF');
  assert.equal(result.verifiedCount, 5);
  const altered = fixture();
  const first = ql246RawUrl(altered.manifest.sources[0]);
  const envelope = JSON.parse(altered.raw.get(first));
  envelope.payload.owner_authorization = 'GIVEN';
  const tampered = JSON.stringify(envelope);
  altered.raw.set(first, tampered);
  altered.manifest.sources[0].sha256 = sha(tampered);
  result = await reviewQl246Sources(altered.manifest, { now: clock, fetchPublic: async url => altered.raw.get(url) });
  assert.equal(result.verifiedCount, 5);
  assert.equal(result.systems[0].status, 'SOURCE_SIGNING_PIN_OR_SIGNATURE_INVALID');
});

test('trust pin reuse, business/tenant confusion, expired challenge and remote proof scope fail closed', async () => {
  const bad = [
    x => x.sources[1].publicKeyFingerprintSha256 = x.sources[0].publicKeyFingerprintSha256,
    x => x.sources[4].tenantId = null,
    x => x.sources[3].businessId = 'icamp',
    x => x.expiresAt = clock - 1,
    x => x.sources[0].sourceRevision = 'main',
    x => x.sources[5].repository = 'evil/../../foo'
  ];
  for (const change of bad) {
    const { manifest } = fixture();
    change(manifest);
    const result = await reviewQl246Sources(manifest, { now: clock, fetchPublic: () => {
      throw new Error('Should not fetch untrusted manifests');
    }});
    assert.equal(result.status, 'DENIED_TRUSTED_MANIFEST');
  }
});

test('signed source may not claim external authenticated access or owner approval', async () => {
  const { manifest, raw } = fixture();
  const first = ql246RawUrl(manifest.sources[0]);
  const envelope = JSON.parse(raw.get(first));
  envelope.payload.external_gateway_get_verified = true;
  // Even a separately pinned valid signature must not elevate a source-only review.
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
  envelope.publicKeyPem = publicKeyPem;
  envelope.signature = sign(null, ql246Canonical(envelope.payload), privateKey).toString('base64url');
  const signed = JSON.stringify(envelope);
  raw.set(first, signed);
  manifest.sources[0].sha256 = sha(signed);
  manifest.sources[0].publicKeyFingerprintSha256 = sha(publicKey.export({ type: 'spki', format: 'der' }));
  const result = await reviewQl246Sources(manifest, { now: clock, fetchPublic: async url => raw.get(url) });
  assert.equal(result.systems[0].status, 'SIGNED_SOURCE_SCOPE_OR_FRESHNESS_INVALID');
});

test('immutable public fetch prohibits SSRF and redirect, wrong HTTP status and oversized body', async () => {
  const { manifest } = fixture();
  const url = ql246RawUrl(manifest.sources[0]);
  for (const bad of [url.replace('raw.githubusercontent.com', '127.0.0.1'),
    url.replace('https:', 'http:'), `${url}?token=x`,
    url.replace('/docs/integration/', '/../../secrets/')]) {
    await assert.rejects(() => retrieveQl246PublicSource(bad, () => {
      throw new Error('Unsafe request was attempted');
    }), /immutable allowed public proof path/);
  }
  await assert.rejects(() => retrieveQl246PublicSource(url, async () => ({
    status: 302, headers: new Headers({ 'content-type': 'application/json' })
  })), /unexpected status/);
  await assert.rejects(() => retrieveQl246PublicSource(url, async () => ({
    status: 200, headers: new Headers({ 'content-type': 'application/json', 'content-length': '9999999' })
  })), /size limit/);
  const result = await retrieveQl246PublicSource(url, async (_, options) => {
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error');
    assert.equal(options.credentials, 'omit');
    return { status: 200, headers: new Headers({ 'content-type': 'application/json' }),
      body: new ReadableStream({ start(controller) { controller.enqueue(Buffer.from('{}')); controller.close(); } }) };
  });
  assert.equal(result, '{}');
});

console.log('QL-246 independent public six-app source proof and trusted pin challenge: tests complete.');
