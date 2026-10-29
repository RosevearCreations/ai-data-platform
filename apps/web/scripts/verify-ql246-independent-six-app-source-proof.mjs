import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import {
  QL246_SYSTEMS, QL246_NEGATIVES, QL246_METHODS, QL246_PATHS,
  ql246Canonical, ql246RawUrl, detectQl248ImmutableOriginDrift, exportQl248PhaseAProofOriginScaffold, ql248PhaseAProofOriginScaffold, reconcileQl248ExportDigest, ageQl253AncestryException, continueQl253VerifiedOwnerTestDecision, evaluateQl254RelayReadiness, evaluateQl255ProofPublicationDisposition, handleQl253AncestryDrift, intakeQl253OwnerTestDecision, reconcileQl253PublicProofRetryResult, reconcileQl253SourceCiProofAncestry, inspectQl256SignerProvisioning, prepareQl255MiniServerTrialApproval, reconcileQl254OriginalProofRetrieval, renewQl253CustodyPinException, renewQl253RetryEvidence, reviewQl246Sources, verifyQl254IndependentWitnessClaim, closeQl255WitnessCustodyException, verifyQl248PhaseAProofOriginExport, retrieveQl246PublicSource
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


test('QL-248 v2 manifest separates source revision from proof commit and pins source CI provenance', async () => {
  const { manifest, raw } = fixture();
  manifest.schema = 'rosevear.integration.ql246.trusted-pins.v2';
  const nextRaw = new Map();
  manifest.sources = manifest.sources.map((row, i) => {
    const proofCommitSha = `${(i + 10).toString(16).slice(-1)}`.repeat(40);
    const envelope = raw.get(ql246RawUrl(row));
    const parsed = JSON.parse(envelope);
    const ciRunUrl = parsed.payload.ci_run_url;
    const v2 = {
      system: row.system,
      repository: row.repository,
      sourceRevision: row.sourceRevision,
      proofCommitSha,
      proofSha256: sha(envelope),
      ciRunUrl,
      publicKeyFingerprintSha256: row.publicKeyFingerprintSha256,
      businessId: row.businessId,
      tenantId: row.tenantId
    };
    nextRaw.set(ql246RawUrl(v2), envelope);
    return v2;
  });

  let result = await reviewQl246Sources(manifest, {
    now: clock,
    fetchPublic: async url => nextRaw.get(url)
  });
  assert.equal(result.verifiedCount, 6);
  assert.equal(result.status, 'SIX_PUBLIC_SOURCES_VERIFIED_EXTERNAL_TESTS_PENDING_HELD');
  assert.equal(result.systems[0].sourceRevision, manifest.sources[0].sourceRevision);
  assert.equal(result.systems[0].proofCommitSha, manifest.sources[0].proofCommitSha);
  assert.equal(result.systems[0].sourceCiRunUrl, manifest.sources[0].ciRunUrl);

  const sameSha = structuredClone(manifest);
  sameSha.sources[0].proofCommitSha = sameSha.sources[0].sourceRevision;
  result = await reviewQl246Sources(sameSha, { now: clock, fetchPublic: async () => { throw new Error('must not fetch invalid v2 manifest'); } });
  assert.equal(result.status, 'DENIED_TRUSTED_MANIFEST');

  const mixed = structuredClone(manifest);
  const row0 = mixed.sources[0];
  mixed.sources[0] = {
    system: row0.system, repository: row0.repository, sourceRevision: row0.sourceRevision,
    sha256: row0.proofSha256, publicKeyFingerprintSha256: row0.publicKeyFingerprintSha256,
    businessId: row0.businessId, tenantId: row0.tenantId
  };
  result = await reviewQl246Sources(mixed, { now: clock, fetchPublic: async () => { throw new Error('must not fetch mixed-version manifest'); } });
  assert.equal(result.status, 'DENIED_TRUSTED_MANIFEST');

  const wrongCi = structuredClone(manifest);
  wrongCi.sources[0].ciRunUrl = 'https://github.com/RosevearCreations/' + wrongCi.sources[0].repository + '/actions/runs/999999';
  result = await reviewQl246Sources(wrongCi, {
    now: clock,
    fetchPublic: async url => nextRaw.get(url)
  });
  assert.equal(result.systems[0].status, 'SIGNED_SOURCE_SCOPE_OR_FRESHNESS_INVALID');
});


test('QL-248 Phase-A proof-origin scaffold requires six complete v2 source/proof rows and remains HELD', async () => {
  const { manifest, raw } = fixture();
  manifest.schema = 'rosevear.integration.ql246.trusted-pins.v2';
  manifest.sources = manifest.sources.map((row, i) => {
    const proofCommitSha = `${(i + 10).toString(16).slice(-1)}`.repeat(40);
    const envelope = raw.get(ql246RawUrl(row));
    const parsed = JSON.parse(envelope);
    return {
      system: row.system,
      repository: row.repository,
      sourceRevision: row.sourceRevision,
      proofCommitSha,
      proofSha256: sha(envelope),
      ciRunUrl: parsed.payload.ci_run_url,
      publicKeyFingerprintSha256: row.publicKeyFingerprintSha256,
      businessId: row.businessId,
      tenantId: row.tenantId
    };
  });

  const phaseA = ql248PhaseAProofOriginScaffold(manifest, clock);
  assert.equal(phaseA.complete, true);
  assert.equal(phaseA.sourceCount, 6);
  assert.equal(phaseA.status, 'SIX_SOURCE_PHASE_A_PROVENANCE_COMPLETE_AUTH_TESTING_HELD');
  assert.equal(phaseA.connectionState, 'DISCONNECTED');
  assert.equal(phaseA.ownerAuthorization, 'NOT_GIVEN');
  assert.deepEqual(phaseA.systems.map(row => row.system), QL246_SYSTEMS);
  assert.ok(phaseA.systems.every(row =>
    /^[a-f0-9]{40}$/.test(row.sourceRevision) &&
    /^[a-f0-9]{40}$/.test(row.proofCommitSha) &&
    row.sourceRevision !== row.proofCommitSha &&
    /^[a-f0-9]{64}$/.test(row.proofSha256) &&
    /^[a-f0-9]{64}$/.test(row.publicKeySpkiSha256) &&
    row.publicProofUrl.includes('/docs/integration/ql246-source-proof.json')
  ));

  const incomplete = structuredClone(manifest);
  incomplete.sources.pop();
  const held = ql248PhaseAProofOriginScaffold(incomplete, clock);
  assert.equal(held.complete, false);
  assert.equal(held.status, 'HOLD_PHASE_A_MANIFEST_INCOMPLETE');
  assert.equal(held.sourceCount, 0);
});


test('QL-248 proof-origin scaffold export is deterministic and immutable-origin consistent', async () => {
  const { manifest, raw } = fixture();
  manifest.schema = 'rosevear.integration.ql246.trusted-pins.v2';
  manifest.sources = manifest.sources.map((row, i) => {
    const proofCommitSha = `${(i + 10).toString(16).slice(-1)}`.repeat(40);
    const envelope = raw.get(ql246RawUrl(row));
    const parsed = JSON.parse(envelope);
    return {
      system: row.system,
      repository: row.repository,
      sourceRevision: row.sourceRevision,
      proofCommitSha,
      proofSha256: sha(envelope),
      ciRunUrl: parsed.payload.ci_run_url,
      publicKeyFingerprintSha256: row.publicKeyFingerprintSha256,
      businessId: row.businessId,
      tenantId: row.tenantId
    };
  });
  const scaffold = ql248PhaseAProofOriginScaffold(manifest, clock);
  const exported = exportQl248PhaseAProofOriginScaffold(scaffold);
  assert.equal(exported, exportQl248PhaseAProofOriginScaffold(scaffold));
  const verified = verifyQl248PhaseAProofOriginExport(exported);
  assert.equal(verified.valid, true);
  assert.equal(verified.status, 'SIX_SOURCE_IMMUTABLE_ORIGIN_CONSISTENT_AUTH_TESTING_HELD');
  assert.equal(verified.sourceCount, 6);
  assert.match(verified.exportSha256, /^[a-f0-9]{64}$/);

  const tampered = JSON.parse(exported);
  tampered.systems[0].publicProofUrl = tampered.systems[1].publicProofUrl;
  const bad = verifyQl248PhaseAProofOriginExport(JSON.stringify(tampered));
  assert.equal(bad.valid, false);
  assert.equal(bad.reason, 'ORIGIN_CONSISTENCY_MISMATCH');
});


test('QL-248 exported-origin digest reconciliation and immutable-origin drift detection stay fail-closed', async () => {
  const { manifest, raw } = fixture();
  manifest.schema = 'rosevear.integration.ql246.trusted-pins.v2';
  manifest.sources = manifest.sources.map((row, i) => {
    const proofCommitSha = `${(i + 10).toString(16).slice(-1)}`.repeat(40);
    const envelope = raw.get(ql246RawUrl(row));
    const parsed = JSON.parse(envelope);
    return {
      system: row.system,
      repository: row.repository,
      sourceRevision: row.sourceRevision,
      proofCommitSha,
      proofSha256: sha(envelope),
      ciRunUrl: parsed.payload.ci_run_url,
      publicKeyFingerprintSha256: row.publicKeyFingerprintSha256,
      businessId: row.businessId,
      tenantId: row.tenantId
    };
  });
  const exported = exportQl248PhaseAProofOriginScaffold(ql248PhaseAProofOriginScaffold(manifest, clock));
  const digest = sha(exported);
  const matched = reconcileQl248ExportDigest(exported, digest);
  assert.equal(matched.match, true);
  assert.equal(matched.status, 'EXPORT_DIGEST_MATCH_AUTH_TESTING_HELD');

  const driftDigest = reconcileQl248ExportDigest(exported + ' ', digest);
  assert.equal(driftDigest.match, false);
  assert.equal(driftDigest.status, 'HOLD_EXPORT_DIGEST_DRIFT');

  const stable = detectQl248ImmutableOriginDrift(exported, exported);
  assert.equal(stable.drift, false);
  assert.equal(stable.status, 'SIX_SOURCE_IMMUTABLE_ORIGIN_NO_DRIFT_AUTH_TESTING_HELD');

  const changed = JSON.parse(exported);
  changed.systems[0].proofSha256 = 'f'.repeat(64);
  const drift = detectQl248ImmutableOriginDrift(exported, JSON.stringify(changed));
  assert.equal(drift.drift, true);
  assert.equal(drift.status, 'HOLD_SIX_SOURCE_IMMUTABLE_ORIGIN_DRIFT');
  assert.deepEqual(drift.changedSystems, ['ai-data-platform']);
});


test('QL-253 immutable-proof retry readiness reconciles exact source CI, ancestry and publication without authorizing TEST', async () => {
  const sourceRevision = '1'.repeat(40);
  const proofCommitSha = '2'.repeat(40);
  const proofSha256 = '3'.repeat(64);
  const ci = 'https://github.com/RosevearCreations/ai-data-platform/actions/runs/123456789';

  const ready = reconcileQl253SourceCiProofAncestry({
    system: 'ai-data-platform',
    sourceRevision,
    sourceCiRunUrl: ci,
    sourceCiHeadSha: sourceRevision,
    proofCommitSha,
    proofHttpStatus: 200,
    proofSha256,
    ancestryVerified: true
  });
  assert.equal(ready.ready, true);
  assert.equal(ready.status, 'QL253_PUBLIC_PROOF_RETRY_READY_OWNER_TEST_AUTH_HELD');
  assert.equal(ready.ownerAuthorization, 'NOT_GIVEN');
  assert.equal(ready.actualGatewayTest, 'NOT_RUN');

  const wrongCi = reconcileQl253SourceCiProofAncestry({
    system: 'ai-data-platform',
    sourceRevision,
    sourceCiRunUrl: ci,
    sourceCiHeadSha: '4'.repeat(40),
    proofCommitSha,
    proofHttpStatus: 200,
    proofSha256,
    ancestryVerified: true
  });
  assert.equal(wrongCi.status, 'HOLD_SOURCE_CI_SHA_MISMATCH');

  const missingProof = reconcileQl253SourceCiProofAncestry({
    system: 'ai-data-platform',
    sourceRevision,
    sourceCiRunUrl: ci,
    sourceCiHeadSha: sourceRevision,
    proofCommitSha,
    proofHttpStatus: 404,
    proofSha256,
    ancestryVerified: true
  });
  assert.equal(missingProof.status, 'HOLD_IMMUTABLE_PROOF_NOT_PUBLISHED');
});

test('QL-253 custody-pin exception renewal requires separate out-of-band custody and witness verification', async () => {
  const issuedAt = clock - 60_000;
  const expiresAt = clock + 4 * 60_000;
  const pin = 'a'.repeat(64);
  const held = renewQl253CustodyPinException({
    custodyReceiptId: 'custody-123',
    witnessReceiptId: 'witness-456',
    publicKeySpkiSha256: pin,
    issuedAt,
    expiresAt,
    custodyVerifiedOutOfBand: false,
    witnessVerifiedOutOfBand: true
  }, clock);
  assert.equal(held.renewed, false);
  assert.equal(held.status, 'HOLD_CUSTODY_PIN_EXCEPTION_RENEWAL_PENDING_INDEPENDENT_VERIFICATION');

  const renewed = renewQl253CustodyPinException({
    custodyReceiptId: 'custody-123',
    witnessReceiptId: 'witness-456',
    publicKeySpkiSha256: pin,
    issuedAt,
    expiresAt,
    custodyVerifiedOutOfBand: true,
    witnessVerifiedOutOfBand: true
  }, clock);
  assert.equal(renewed.renewed, true);
  assert.equal(renewed.status, 'CUSTODY_PIN_EXCEPTION_RENEWED_OWNER_TEST_AUTH_HELD');
  assert.equal(renewed.ownerAuthorization, 'NOT_GIVEN');
  assert.equal(renewed.actualGatewayTest, 'NOT_RUN');
});


test('QL-253 retry reconciliation, ancestry drift and owner TEST-only intake remain separately gated', async () => {
  const sourceRevision='1'.repeat(40), proofCommitSha='2'.repeat(40), proofSha256='3'.repeat(64);
  const ok=reconcileQl253PublicProofRetryResult({proofHttpStatus:200,sourceRevision,proofCommitSha,proofSha256,sourceCiHeadSha:sourceRevision,ancestryVerified:true});
  assert.equal(ok.reconciled,true);
  assert.equal(ok.status,'QL253_PUBLIC_PROOF_RETRY_RECONCILED_OWNER_TEST_AUTH_HELD');
  const drift=handleQl253AncestryDrift(
    {sourceRevision,proofCommitSha,sourceCiRunUrl:'https://github.com/RosevearCreations/ai-data-platform/actions/runs/1',proofSha256,ancestryVerified:true},
    {sourceRevision,proofCommitSha:'4'.repeat(40),sourceCiRunUrl:'https://github.com/RosevearCreations/ai-data-platform/actions/runs/1',proofSha256,ancestryVerified:true}
  );
  assert.equal(drift.drift,true);
  assert.equal(drift.status,'HOLD_QL253_ANCESTRY_DRIFT_EXCEPTION');
  const requested=intakeQl253OwnerTestDecision({decision:'REQUESTED_PRIVATE_REVIEW'},clock);
  assert.equal(requested.ownerAuthorization,'REQUESTED_PRIVATE_REVIEW');
  assert.equal(requested.actualGatewayTest,'NOT_RUN');
  const invalid=intakeQl253OwnerTestDecision({
    decision:'INDEPENDENTLY_VERIFIED_BY_OWNER',identityVerifiedPrivately:false,
    environment:'nonproduction',businessId:'devilndove',ownerReceiptId:'owner-1',
    allowedMethods:['GET'],allowedPaths:['/api/integration/v1/health','/api/integration/v1/capabilities'],
    windowStart:clock+60000,windowEnd:clock+120000
  },clock);
  assert.equal(invalid.accepted,false);
  assert.equal(invalid.status,'HOLD_OWNER_TEST_PRIVATE_VERIFICATION_INCOMPLETE');
});


test('QL-253 retry evidence renewal, ancestry-exception aging and owner TEST continuity remain fail-closed', async () => {
  const sourceRevision='1'.repeat(40), proofCommitSha='2'.repeat(40), proofSha256='3'.repeat(64);
  const renewed=renewQl253RetryEvidence({
    sourceRevision,
    proofCommitSha,
    proofSha256,
    sourceCiRunUrl:'https://github.com/RosevearCreations/ai-data-platform/actions/runs/123456789',
    sourceCiHeadSha:sourceRevision,
    ancestryVerified:true,
    proofHttpStatus:200,
    verifiedAt:clock-60000
  },clock);
  assert.equal(renewed.renewed,true);
  assert.equal(renewed.status,'QL253_RETRY_EVIDENCE_RENEWED_OWNER_TEST_AUTH_HELD');

  const stale=renewQl253RetryEvidence({
    sourceRevision,
    proofCommitSha,
    proofSha256,
    sourceCiRunUrl:'https://github.com/RosevearCreations/ai-data-platform/actions/runs/123456789',
    sourceCiHeadSha:sourceRevision,
    ancestryVerified:true,
    proofHttpStatus:200,
    verifiedAt:clock-2*60*60*1000
  },clock);
  assert.equal(stale.renewed,false);

  const active=ageQl253AncestryException({detectedAt:clock-60*60*1000,resolved:false},clock);
  assert.equal(active.status,'HOLD_ANCESTRY_EXCEPTION_ACTIVE');
  const overdue=ageQl253AncestryException({detectedAt:clock-25*60*60*1000,resolved:false},clock);
  assert.equal(overdue.status,'HOLD_ANCESTRY_EXCEPTION_OVERDUE');

  const previous={
    ownerAuthorization:'INDEPENDENTLY_VERIFIED_BY_OWNER',
    identityVerifiedPrivately:true,
    businessId:'devilndove',
    tenantId:null,
    environment:'nonproduction',
    allowedMethods:['GET'],
    allowedPaths:['/api/integration/v1/health','/api/integration/v1/capabilities'],
    ownerReceiptId:'owner-prev'
  };
  const current={
    ...previous,
    ownerReceiptId:'owner-current',
    windowStart:clock+60000,
    windowEnd:clock+20*60*1000
  };
  const continuity=continueQl253VerifiedOwnerTestDecision(previous,current,clock);
  assert.equal(continuity.continuous,true);
  assert.equal(continuity.status,'OWNER_TEST_DECISION_CONTINUITY_VERIFIED_REQUEST_EXECUTION_HELD');
  assert.equal(continuity.actualGatewayTest,'NOT_RUN');

  const changedScope=continueQl253VerifiedOwnerTestDecision(previous,{...current,businessId:'other'},clock);
  assert.equal(changedScope.continuous,false);
  assert.equal(changedScope.ownerAuthorization,'NOT_GIVEN');
});


test('QL-254 original proof retrieval, independent witness claim and relay reversibility stay fail-closed', async () => {
  const sourceRevision='1'.repeat(40), proofCommitSha='2'.repeat(40), proofSha256='3'.repeat(64), spki='4'.repeat(64);
  const missing=reconcileQl254OriginalProofRetrieval({observedMainSha:'9'.repeat(40),proofHttpStatus:404});
  assert.equal(missing.retrievable,false);
  assert.equal(missing.status,'HOLD_QL254_ORIGINAL_PROOF_NOT_PUBLISHED');

  const retrieved=reconcileQl254OriginalProofRetrieval({
    observedMainSha:'9'.repeat(40),proofHttpStatus:200,sourceRevision,proofCommitSha,proofSha256,
    publicSignerSpkiSha256:spki,sourceCiHeadSha:sourceRevision,ancestryVerified:true,
    sourceCiRunUrl:'https://github.com/RosevearCreations/ai-data-platform/actions/runs/123456789'
  });
  assert.equal(retrieved.retrievable,true);
  assert.equal(retrieved.status,'QL254_ORIGINAL_PROOF_RETRIEVED_OWNER_TEST_AUTH_HELD');

  const witnessHeld=verifyQl254IndependentWitnessClaim({
    registrySnapshotSha256:'5'.repeat(64),custodyFingerprintSha256:'6'.repeat(64),
    witnessPublicKeySpkiSha256:'7'.repeat(64),registryCustodyReceiptId:'custody-1',witnessReceiptId:'witness-2',
    sourceRevision,proofCommitSha,system:'ai-data-platform',businessId:'devilndove',
    issuedAt:clock-60_000,expiresAt:clock+120_000,custodyVerifiedOutOfBand:true,
    witnessIdentityVerifiedOutOfBand:false,witnessKeyIsDistinct:true
  },clock);
  assert.equal(witnessHeld.verified,false);
  assert.equal(witnessHeld.status,'HOLD_QL254_INDEPENDENT_WITNESS_NOT_VERIFIED');

  const relay=evaluateQl254RelayReadiness({
    simulationOnly:true,outboundOnly:true,noPublicInboundPorts:true,noPortForwarding:true,noHomeDeviceDnsExposure:true,
    separateLeastPrivilegeServiceAccount:true,separatePerAppCredentials:true,secretStoreOnly:true,
    vaultIsolated:true,camerasIsolated:true,homeAssistantIsolated:true,mqttIsolated:true,
    killSwitchDefined:true,keyRevocationDefined:true,rollbackProcedureDefined:true,healthCheckSeconds:60
  });
  assert.equal(relay.ready,true);
  assert.equal(relay.status,'QL254_RELAY_REVERSIBILITY_SIMULATION_READY_CONNECTION_HELD');
  assert.equal(relay.relayInstalled,false);
  assert.equal(relay.relayStarted,false);
  assert.equal(relay.actualGatewayTest,'NOT_RUN');
});


test('QL-255 disposition, custody exception, mini-server prep and QL-256 signer inspection are real-state fail-closed', async () => {
  const notPublished=evaluateQl255ProofPublicationDisposition({observedMainSha:'a'.repeat(40),proofHttpStatus:404});
  assert.equal(notPublished.disposition,'NOT_PUBLISHED');
  assert.equal(notPublished.status,'QL255_PROOF_PUBLICATION_NOT_AVAILABLE');

  const custody=closeQl255WitnessCustodyException({
    custodyReceiptId:'custody-1',witnessReceiptId:'witness-2',reviewerReceiptId:'reviewer-3',
    publicSignerSpkiSha256:'b'.repeat(64),registrySnapshotSha256:'c'.repeat(64),
    issuedAt:clock-60_000,expiresAt:clock+120_000,
    custodianVerifiedPrivately:true,witnessVerifiedPrivately:true,reviewerVerifiedPrivately:false,rolesAreDistinct:true
  },clock);
  assert.equal(custody.closed,false);
  assert.equal(custody.status,'HOLD_QL255_PRIVATE_CUSTODY_EXCEPTION_OPEN');

  const prep=prepareQl255MiniServerTrialApproval({
    simulationOnly:true,outboundOnly:true,noPublicInboundPorts:true,noPortForwarding:true,
    separateServiceAccount:true,separatePerAppCredentials:true,rollbackDefined:true,killSwitchDefined:true,
    ownerApprovalRecorded:false
  });
  assert.equal(prep.prepared,true);
  assert.equal(prep.status,'QL255_MINI_SERVER_TRIAL_APPROVAL_PREPARED_OWNER_DECISION_REQUIRED');
  assert.equal(prep.relayInstalled,false);
  assert.equal(prep.relayStarted,false);

  const signer=inspectQl256SignerProvisioning({
    QL256_SIGNER_PRIVATE_KEY_PEM:'-----BEGIN PRIVATE KEY-----x',
    QL256_SIGNER_PUBLIC_KEY_PEM:'-----BEGIN PUBLIC KEY-----x',
    QL256_SIGNER_SPKI_SHA256:'d'.repeat(64)
  });
  assert.equal(signer.decision,'SIGNER_EXISTS_CUSTODY_NOT_VERIFIED');
  assert.equal(signer.publicSpkiSha256,'d'.repeat(64));
});

console.log('QL-246 independent public six-app source proof and trusted pin challenge: tests complete.');
