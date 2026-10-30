import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import {
  QL246_SYSTEMS, QL246_NEGATIVES, QL246_METHODS, QL246_PATHS,
  ql246Canonical, ql246RawUrl, detectQl248ImmutableOriginDrift, exportQl248PhaseAProofOriginScaffold, ql248PhaseAProofOriginScaffold, reconcileQl248ExportDigest, ageQl253AncestryException, continueQl253VerifiedOwnerTestDecision, evaluateQl254RelayReadiness, evaluateQl255ProofPublicationDisposition, handleQl253AncestryDrift, intakeQl253OwnerTestDecision, reconcileQl253PublicProofRetryResult, reconcileQl253SourceCiProofAncestry, inspectQl256SignerProvisioning, intakeQl256IndependentSignerCustodyEvidence, evaluateQl256ProofBPublicationReadiness, prepareQl256AuthenticatedOwnerTestOnlyDecision, reconcileQl256CustodyChallenge, evaluateQl256SignedProofBExecutionReadiness, intakeQl256OwnerTestAuthorizationEvidence, intakeQl257IndependentOwnerStatus, reconcileQl257CustodyRoleApproval, prepareQl257ProofBPublicationAuthorization, validateQl258SanitizedOwnerActionPacket, refreshQl258ImmutableProofStatus, evaluateQl258CustodySourceActivationReadiness, reconcileQl258SanitizedOwnerActionReturn, followUpQl258ImmutableProofPublication, ageQl258CustodySourceActivationEvidence, refreshQl259OwnerStatus, renewQl259CustodySourceEvidence, reviewQl259ImmutableProofPublicationException, intakeQl260AuthenticatedOwnerStatusReceipt, verifyQl260CustodySourceEvidenceRenewal, disposeQl260ImmutableProofPublicationException, reconcileQl260AuthenticatedOwnerStatusReceipt, enforceQl260CustodySourceRenewalFreshness, prepareQl260ImmutableProofExceptionClosureReadiness, reconcileQl261ActualOwnerPacketReceipt, evaluateQl261IndependentSignerCustodyEvidenceGate, prepareQl261SourceProofPublicationReadiness, enforceQl262OwnerPacketFreshness, auditQl262IndependentSignerCustodyEvidenceReceipts, preflightQl262SourceProofPublication, renewQl263OwnerPacketEvidence, enforceQl263SignerCustodyAuditFreshness, reviewQl263SourceProofPublicationException, prepareQl255MiniServerTrialApproval, reconcileQl254OriginalProofRetrieval, renewQl253CustodyPinException, renewQl253RetryEvidence, reviewQl246Sources, verifyQl254IndependentWitnessClaim, closeQl255WitnessCustodyException, verifyQl248PhaseAProofOriginExport, retrieveQl246PublicSource
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



test('QL-256 custody intake, proof-B readiness and owner TEST-only preparation stay fail-closed', async () => {
  const spki='d'.repeat(64);
  const rejected=intakeQl256IndependentSignerCustodyEvidence({
    registrySnapshotSha256:'e'.repeat(64),observedSignerSpkiSha256:spki,
    custodianReceiptId:'custody-1',witnessReceiptId:'witness-2',reviewerReceiptId:'reviewer-3',
    challengeIssuedAt:clock-60_000,challengeExpiresAt:clock+120_000,
    custodianAuthenticatedPrivately:true,witnessAuthenticatedPrivately:true,
    reviewerAuthenticatedPrivately:false,rolesAreDistinct:true,witnessKeyIsDistinct:true,
    reviewerIsIndependent:true
  },spki,clock);
  assert.equal(rejected.accepted,false);
  assert.equal(rejected.status,'HOLD_QL256_INDEPENDENT_CUSTODY_EVIDENCE_NOT_VERIFIED');

  const accepted=intakeQl256IndependentSignerCustodyEvidence({
    registrySnapshotSha256:'e'.repeat(64),observedSignerSpkiSha256:spki,
    custodianReceiptId:'custody-1',witnessReceiptId:'witness-2',reviewerReceiptId:'reviewer-3',
    challengeIssuedAt:clock-60_000,challengeExpiresAt:clock+120_000,
    custodianAuthenticatedPrivately:true,witnessAuthenticatedPrivately:true,
    reviewerAuthenticatedPrivately:true,rolesAreDistinct:true,witnessKeyIsDistinct:true,
    reviewerIsIndependent:true
  },spki,clock);
  assert.equal(accepted.accepted,true);
  assert.equal(accepted.proofBPublished,false);

  const held=evaluateQl256ProofBPublicationReadiness({
    sourceRevision:'a'.repeat(40),custodyEvidenceAccepted:false,
    sourceCiHeadSha:'a'.repeat(40),sourceCiConclusion:'success',
    sourceCiRunUrl:'https://github.com/RosevearCreations/ai-data-platform/actions/runs/40915219544',
    signerKeyId:'ql256-ai-data-platform-test',publicSignerSpkiSha256:spki,
    proofPath:'docs/integration/ql246-source-proof.json',
    canonicalPayloadPrepared:true,privateKeyExported:false
  });
  assert.equal(held.ready,false);
  assert.equal(held.status,'HOLD_QL256_PROOF_B_CUSTODY_NOT_VERIFIED');

  const ready=evaluateQl256ProofBPublicationReadiness({
    sourceRevision:'a'.repeat(40),custodyEvidenceAccepted:true,
    sourceCiHeadSha:'a'.repeat(40),sourceCiConclusion:'success',
    sourceCiRunUrl:'https://github.com/RosevearCreations/ai-data-platform/actions/runs/40915219544',
    signerKeyId:'ql256-ai-data-platform-test',publicSignerSpkiSha256:spki,
    proofPath:'docs/integration/ql246-source-proof.json',
    canonicalPayloadPrepared:true,privateKeyExported:false
  });
  assert.equal(ready.ready,true);
  assert.equal(ready.proofBPublished,false);

  const ownerPrep=prepareQl256AuthenticatedOwnerTestOnlyDecision({
    custodyEvidenceAccepted:true,proofPublicationVerified:true,ownerIdentityAuthenticatedPrivately:true,
    environment:'nonproduction',businessId:'devilndove',methods:['GET'],
    paths:['/api/integration/v1/health','/api/integration/v1/capabilities'],
    windowStartsAt:clock+60_000,windowExpiresAt:clock+20*60_000
  },clock);
  assert.equal(ownerPrep.prepared,true);
  assert.equal(ownerPrep.ownerAuthorization,'NOT_GIVEN');
  assert.equal(ownerPrep.gatewayExecutionAllowed,false);
  assert.equal(ownerPrep.actualGatewayTest,'NOT_RUN');
});



test('QL-256 custody challenge, signed proof-B execution and owner authorization evidence remain separately gated', async () => {
  const spki='d'.repeat(64);

  const heldChallenge=reconcileQl256CustodyChallenge({
    registrySnapshotSha256:'e'.repeat(64),observedSignerSpkiSha256:spki,
    custodianReceiptId:'custody-1',witnessReceiptId:'witness-2',reviewerReceiptId:'reviewer-3',
    challengeIssuedAt:clock-60_000,challengeExpiresAt:clock+120_000,
    custodianStatus:'NOT_ASSIGNED',
    witnessStatus:'NOT_ASSIGNED',
    reviewerStatus:'NOT_ASSIGNED',
    privateKeyHostStatus:'APPROVED',
    publicSpkiPinStatus:'NOT_VERIFIED',
    rolesAreDistinct:false
  },spki,clock);
  assert.equal(heldChallenge.reconciled,false);
  assert.equal(heldChallenge.status,'HOLD_QL256_CUSTODY_CHALLENGE_NOT_RECONCILED');

  const reconciled=reconcileQl256CustodyChallenge({
    registrySnapshotSha256:'e'.repeat(64),observedSignerSpkiSha256:spki,
    custodianReceiptId:'custody-1',witnessReceiptId:'witness-2',reviewerReceiptId:'reviewer-3',
    challengeIssuedAt:clock-60_000,challengeExpiresAt:clock+120_000,
    custodianStatus:'ASSIGNED_AND_INDEPENDENTLY_AUTHENTICATED',
    witnessStatus:'ASSIGNED_AND_INDEPENDENTLY_AUTHENTICATED',
    reviewerStatus:'ASSIGNED_AND_INDEPENDENTLY_AUTHENTICATED',
    privateKeyHostStatus:'APPROVED',
    publicSpkiPinStatus:'VERIFIED_OUT_OF_BAND',
    rolesAreDistinct:true
  },spki,clock);
  assert.equal(reconciled.reconciled,true);
  assert.equal(reconciled.proofBPublished,false);

  const proofHeld=evaluateQl256SignedProofBExecutionReadiness({
    sourceRevision:'a'.repeat(40),custodyChallengeReconciled:false,
    sourceCiHeadSha:'a'.repeat(40),sourceCiConclusion:'success',
    sourceCiRunUrl:'https://github.com/RosevearCreations/ai-data-platform/actions/runs/40928884781',
    signerStatus:'SIGNER_EXISTS_CUSTODY_NOT_VERIFIED',
    signerKeyId:'ql256-ai-data-platform-test',publicSignerSpkiSha256:spki,
    privateKeyAvailableInApprovedStore:true,privateKeyExported:false,
    proofPath:'docs/integration/ql246-source-proof.json',
    canonicalPayloadPrepared:true,signedEnvelopePrepared:true,twoShaRuleAccepted:true
  });
  assert.equal(proofHeld.ready,false);
  assert.equal(proofHeld.status,'HOLD_QL256_SIGNED_PROOF_B_CUSTODY_NOT_RECONCILED');

  const proofReady=evaluateQl256SignedProofBExecutionReadiness({
    sourceRevision:'a'.repeat(40),custodyChallengeReconciled:true,
    sourceCiHeadSha:'a'.repeat(40),sourceCiConclusion:'success',
    sourceCiRunUrl:'https://github.com/RosevearCreations/ai-data-platform/actions/runs/40928884781',
    signerStatus:'SIGNER_EXISTS_CUSTODY_VERIFIED',
    signerKeyId:'ql256-ai-data-platform-test',publicSignerSpkiSha256:spki,
    privateKeyAvailableInApprovedStore:true,privateKeyExported:false,
    proofPath:'docs/integration/ql246-source-proof.json',
    canonicalPayloadPrepared:true,signedEnvelopePrepared:true,twoShaRuleAccepted:true
  });
  assert.equal(proofReady.ready,true);
  assert.equal(proofReady.proofBPublished,false);

  const authHeld=intakeQl256OwnerTestAuthorizationEvidence({
    custodyChallengeReconciled:true,proofPublicationVerified:false,
    ownerIdentityAuthenticatedPrivately:true,ownerAuthorizationReceiptId:'owner-1',
    ownerAuthorizationStatus:'EXPLICIT_NONPRODUCTION_TEST_ONLY_APPROVAL',
    environment:'nonproduction',businessId:'devilndove',methods:['GET'],
    paths:['/api/integration/v1/health','/api/integration/v1/capabilities'],
    windowStartsAt:clock+60_000,windowExpiresAt:clock+20*60_000
  },clock);
  assert.equal(authHeld.accepted,false);
  assert.equal(authHeld.ownerAuthorization,'NOT_GIVEN');

  const authAccepted=intakeQl256OwnerTestAuthorizationEvidence({
    custodyChallengeReconciled:true,proofPublicationVerified:true,
    ownerIdentityAuthenticatedPrivately:true,ownerAuthorizationReceiptId:'owner-1',
    ownerAuthorizationStatus:'EXPLICIT_NONPRODUCTION_TEST_ONLY_APPROVAL',
    environment:'nonproduction',businessId:'devilndove',methods:['GET'],
    paths:['/api/integration/v1/health','/api/integration/v1/capabilities'],
    windowStartsAt:clock+60_000,windowExpiresAt:clock+20*60_000
  },clock);
  assert.equal(authAccepted.accepted,true);
  assert.equal(authAccepted.gatewayExecutionAllowed,false);
  assert.equal(authAccepted.actualGatewayTest,'NOT_RUN');
});



test('QL-257 owner status, custody-role approval and proof-B publication authorization remain fail-closed', async () => {
  const ownerPacket={
    schema:'rosevear.integration.ql257.owner-status-words.v1',
    application:'AI Data Platform',
    private_key_custodian_role:'NOT_ASSIGNED',
    distinct_independent_witness:'NOT_ASSIGNED',
    separate_reviewer:'NOT_ASSIGNED',
    approved_restricted_private_key_host_store:'NOT_APPROVED',
    true_signer_status:'SIGNER_EXISTS_CUSTODY_NOT_VERIFIED',
    public_spki_pin_independently_checked:'NOT_VERIFIED',
    owner_test_only_authorization:'NOT_GIVEN',
    connection:'DISCONNECTED / HOLD',
    private_names_included:false,
    passwords_included:false,
    raw_tokens_included:false,
    secret_manager_addresses_included:false,
    home_ip_addresses_included:false,
    custody_receipt_certified_by_ql257:false
  };
  const intake=intakeQl257IndependentOwnerStatus(ownerPacket);
  assert.equal(intake.accepted,true);
  assert.equal(intake.status,'OWNER_REPORTS_DONE_NOT_VERIFIED');
  assert.equal(intake.rolesIndependentlyAuthenticated,false);
  assert.equal(intake.ownerAuthorization,'NOT_GIVEN');
  assert.equal(intake.livePilotHolds,12);

  const unknown=intakeQl257IndependentOwnerStatus({...ownerPacket,unexpected:'no'});
  assert.equal(unknown.accepted,false);
  assert.equal(unknown.status,'HOLD_QL257_OWNER_STATUS_REJECTED');

  const held=reconcileQl257CustodyRoleApproval({
    ownerStatusIntakeAccepted:true,externalIndependentRoleAuthentication:false,
    privateKeyCustodianRole:'ASSIGNED_AND_INDEPENDENTLY_AUTHENTICATED',
    distinctIndependentWitness:'ASSIGNED_AND_INDEPENDENTLY_AUTHENTICATED',
    separateReviewer:'ASSIGNED_AND_INDEPENDENTLY_AUTHENTICATED',
    approvedRestrictedPrivateKeyHostStore:'APPROVED',
    publicSpkiPinIndependentlyChecked:'VERIFIED_OUT_OF_BAND',
    signerStatus:'SIGNER_EXISTS_CUSTODY_NOT_VERIFIED',
    publicSignerSpkiSha256:'d'.repeat(64),registrySnapshotSha256:'e'.repeat(64),
    rolesAreDistinct:true,custodianReceiptId:'custody-1',witnessReceiptId:'witness-2',
    reviewerReceiptId:'reviewer-3',challengeIssuedAt:clock-60_000,challengeExpiresAt:clock+120_000
  },clock);
  assert.equal(held.reconciled,false);
  assert.equal(held.status,'HOLD_QL257_CUSTODY_ROLE_APPROVAL_NOT_RECONCILED');

  const reconciled=reconcileQl257CustodyRoleApproval({
    ownerStatusIntakeAccepted:true,externalIndependentRoleAuthentication:true,
    privateKeyCustodianRole:'ASSIGNED_AND_INDEPENDENTLY_AUTHENTICATED',
    distinctIndependentWitness:'ASSIGNED_AND_INDEPENDENTLY_AUTHENTICATED',
    separateReviewer:'ASSIGNED_AND_INDEPENDENTLY_AUTHENTICATED',
    approvedRestrictedPrivateKeyHostStore:'APPROVED',
    publicSpkiPinIndependentlyChecked:'VERIFIED_OUT_OF_BAND',
    signerStatus:'SIGNER_EXISTS_CUSTODY_NOT_VERIFIED',
    publicSignerSpkiSha256:'d'.repeat(64),registrySnapshotSha256:'e'.repeat(64),
    rolesAreDistinct:true,custodianReceiptId:'custody-1',witnessReceiptId:'witness-2',
    reviewerReceiptId:'reviewer-3',challengeIssuedAt:clock-60_000,challengeExpiresAt:clock+120_000
  },clock);
  assert.equal(reconciled.reconciled,true);
  assert.equal(reconciled.signerStatus,'SIGNER_EXISTS_CUSTODY_VERIFIED');
  assert.equal(reconciled.proofBPublished,false);

  const publicationHeld=prepareQl257ProofBPublicationAuthorization({
    sourceRevision:'a'.repeat(40),custodyRoleApprovalReconciled:false
  });
  assert.equal(publicationHeld.prepared,false);
  assert.equal(publicationHeld.status,'HOLD_QL257_PROOF_B_CUSTODY_APPROVAL_MISSING');

  const publicationReady=prepareQl257ProofBPublicationAuthorization({
    sourceRevision:'a'.repeat(40),custodyRoleApprovalReconciled:true,
    sourceCiHeadSha:'a'.repeat(40),sourceCiConclusion:'success',
    sourceCiRunUrl:'https://github.com/RosevearCreations/ai-data-platform/actions/runs/40939115385',
    signerStatus:'SIGNER_EXISTS_CUSTODY_VERIFIED',
    signerKeyId:'ql256-ai-data-platform-test',
    publicSignerSpkiSha256:'d'.repeat(64),
    publicSpkiPinStatus:'VERIFIED_OUT_OF_BAND',
    privateKeyAvailableInApprovedStore:true,privateKeyExported:false,
    proofPath:'docs/integration/ql246-source-proof.json',
    canonicalPayloadPrepared:true,signedEnvelopePrepared:true,twoShaRuleAccepted:true,
    publicationReviewerReceiptId:'publication-review-1',
    publicationAuthorizationStatus:'AUTHORIZED_FOR_PUBLIC_PROOF_ONLY'
  });
  assert.equal(publicationReady.prepared,true);
  assert.equal(publicationReady.publicationAuthorized,true);
  assert.equal(publicationReady.proofBPublished,false);
  assert.equal(publicationReady.actualGatewayTest,'NOT_RUN');
  assert.equal(publicationReady.ownerAuthorization,'NOT_GIVEN');
});



test('QL-258 sanitized owner packet, immutable proof refresh and custody-source readiness remain fail-closed', async () => {
  const absent=validateQl258SanitizedOwnerActionPacket({
    schema:'rosevear.integration.ql258.sanitized-owner-action.v1',
    application:'AI Data Platform',
    progress:Array(7).fill('NOT_ATTEMPTED'),
    owner_report_state:'NOT_RECEIVED',
    owner_authorization:'NOT_GIVEN',
    connection:'DISCONNECTED',
    live_pilot_holds:12
  });
  assert.equal(absent.accepted,true);
  assert.equal(absent.status,'QL258_OWNER_PACKET_VALID_NOT_RECEIVED');
  assert.equal(absent.authenticatedIdentity,false);
  assert.equal(absent.proofPublicationAuthorized,false);

  const rejected=validateQl258SanitizedOwnerActionPacket({
    schema:'rosevear.integration.ql258.sanitized-owner-action.v1',
    application:'AI Data Platform',
    progress:Array(7).fill('OWNER_REPORTS_DONE_NOT_VERIFIED'),
    owner_report_state:'OWNER_REPORTS_DONE_NOT_VERIFIED',
    owner_authorization:'NOT_GIVEN',
    connection:'DISCONNECTED',
    live_pilot_holds:12,
    private_name:'not allowed'
  });
  assert.equal(rejected.accepted,false);

  const missingProof=refreshQl258ImmutableProofStatus({
    observedMainSha:'a'.repeat(40),
    proofHttpStatus:404
  });
  assert.equal(missingProof.verified,false);
  assert.equal(missingProof.status,'QL258_IMMUTABLE_PROOF_NOT_PUBLISHED');

  const readyProof=refreshQl258ImmutableProofStatus({
    observedMainSha:'b'.repeat(40),
    proofHttpStatus:200,
    sourceRevision:'a'.repeat(40),
    proofCommitSha:'b'.repeat(40),
    proofSha256:'c'.repeat(64),
    publicSignerSpkiSha256:'d'.repeat(64),
    ancestryVerified:true,
    sourceCiHeadSha:'a'.repeat(40),
    sourceCiConclusion:'success',
    sourceCiRunUrl:'https://github.com/RosevearCreations/ai-data-platform/actions/runs/40996394692'
  });
  assert.equal(readyProof.verified,true);
  assert.equal(readyProof.ownerAuthorization,'NOT_GIVEN');

  const held=evaluateQl258CustodySourceActivationReadiness({
    sourceRevision:'a'.repeat(40),
    sourceCiHeadSha:'a'.repeat(40),
    sourceCiConclusion:'success',
    sourceCiRunUrl:'https://github.com/RosevearCreations/ai-data-platform/actions/runs/40996394692',
    sanitizedOwnerPacketAccepted:true,
    ownerReportState:'OWNER_REPORTS_DONE_NOT_VERIFIED',
    custodianAuthenticatedPrivately:false
  },clock);
  assert.equal(held.ready,false);
  assert.equal(held.status,'HOLD_QL258_CUSTODY_SOURCE_ACTIVATION_NOT_READY');

  const ready=evaluateQl258CustodySourceActivationReadiness({
    sourceRevision:'a'.repeat(40),
    sourceCiHeadSha:'a'.repeat(40),
    sourceCiConclusion:'success',
    sourceCiRunUrl:'https://github.com/RosevearCreations/ai-data-platform/actions/runs/40996394692',
    sanitizedOwnerPacketAccepted:true,
    ownerReportState:'OWNER_REPORTS_DONE_NOT_VERIFIED',
    custodianAuthenticatedPrivately:true,
    witnessAuthenticatedPrivately:true,
    reviewerAuthenticatedPrivately:true,
    rolesAreDistinct:true,
    approvedRestrictedPrivateKeyHostStore:true,
    publicSpkiPinVerifiedOutOfBand:true,
    publicSignerSpkiSha256:'d'.repeat(64),
    registrySnapshotSha256:'e'.repeat(64),
    custodianReceiptId:'custody-1',
    witnessReceiptId:'witness-2',
    reviewerReceiptId:'reviewer-3',
    challengeIssuedAt:clock-60_000,
    challengeExpiresAt:clock+120_000
  },clock);
  assert.equal(ready.ready,true);
  assert.equal(ready.activationAllowed,false);
  assert.equal(ready.proofBPublished,false);
  assert.equal(ready.actualGatewayTest,'NOT_RUN');
});



test('QL-258 owner return reconciliation, proof publication follow-up and custody evidence aging stay fail-closed', async () => {
  const incomplete=reconcileQl258SanitizedOwnerActionReturn({
    schema:'rosevear.integration.ql258.sanitized-owner-action.v1',
    application:'AI Data Platform',
    progress:Array(7).fill('NOT_ATTEMPTED'),
    owner_report_state:'NOT_RECEIVED',
    owner_authorization:'NOT_GIVEN',
    connection:'DISCONNECTED',
    live_pilot_holds:12
  });
  assert.equal(incomplete.reconciled,false);
  assert.equal(incomplete.status,'QL258_OWNER_RETURN_NOT_RECEIVED_OR_INCOMPLETE');
  assert.equal(incomplete.ownerAuthorization,'NOT_GIVEN');

  const selfReport=reconcileQl258SanitizedOwnerActionReturn({
    schema:'rosevear.integration.ql258.sanitized-owner-action.v1',
    application:'AI Data Platform',
    progress:Array(7).fill('OWNER_REPORTS_DONE_NOT_VERIFIED'),
    owner_report_state:'OWNER_REPORTS_DONE_NOT_VERIFIED',
    owner_authorization:'NOT_GIVEN',
    connection:'DISCONNECTED',
    live_pilot_holds:12
  });
  assert.equal(selfReport.reconciled,true);
  assert.equal(selfReport.status,'QL258_OWNER_RETURN_RECONCILED_SELF_REPORT_ONLY');
  assert.equal(selfReport.authenticatedIdentity,false);
  assert.equal(selfReport.proofPublicationAuthorized,false);

  const missing=followUpQl258ImmutableProofPublication({
    observedMainSha:'a'.repeat(40),
    proofHttpStatus:404
  });
  assert.equal(missing.verified,false);
  assert.equal(missing.status,'QL258_PROOF_PUBLICATION_FOLLOWUP_NOT_PUBLISHED');

  const verified=followUpQl258ImmutableProofPublication({
    observedMainSha:'b'.repeat(40),
    proofHttpStatus:200,
    sourceRevision:'a'.repeat(40),
    proofCommitSha:'b'.repeat(40),
    proofSha256:'c'.repeat(64),
    publicSignerSpkiSha256:'d'.repeat(64),
    ancestryVerified:true,
    sourceCiHeadSha:'a'.repeat(40),
    sourceCiConclusion:'success',
    sourceCiRunUrl:'https://github.com/RosevearCreations/ai-data-platform/actions/runs/41063977694'
  });
  assert.equal(verified.verified,true);
  assert.equal(verified.proofBPublished,true);
  assert.equal(verified.ownerAuthorization,'NOT_GIVEN');

  const unavailable=ageQl258CustodySourceActivationEvidence({evidenceAvailable:false},clock);
  assert.equal(unavailable.fresh,false);
  assert.equal(unavailable.status,'QL258_CUSTODY_EVIDENCE_NOT_AVAILABLE');

  const stale=ageQl258CustodySourceActivationEvidence({
    evidenceAvailable:true,
    publicSignerSpkiSha256:'d'.repeat(64),
    registrySnapshotSha256:'e'.repeat(64),
    custodianReceiptId:'custody-1',
    witnessReceiptId:'witness-2',
    reviewerReceiptId:'reviewer-3',
    challengeIssuedAt:clock-10*60_000,
    challengeExpiresAt:clock-5*60_000,
    lastVerifiedAt:clock-2*60*60_000,
    maxEvidenceAgeMs:30*60_000
  },clock);
  assert.equal(stale.fresh,false);
  assert.equal(stale.status,'HOLD_QL258_CUSTODY_EVIDENCE_STALE_OR_EXPIRED');

  const fresh=ageQl258CustodySourceActivationEvidence({
    evidenceAvailable:true,
    publicSignerSpkiSha256:'d'.repeat(64),
    registrySnapshotSha256:'e'.repeat(64),
    custodianReceiptId:'custody-1',
    witnessReceiptId:'witness-2',
    reviewerReceiptId:'reviewer-3',
    challengeIssuedAt:clock-60_000,
    challengeExpiresAt:clock+120_000,
    lastVerifiedAt:clock-60_000,
    maxEvidenceAgeMs:30*60_000
  },clock);
  assert.equal(fresh.fresh,true);
  assert.equal(fresh.activationAllowed,false);
  assert.equal(fresh.actualGatewayTest,'NOT_RUN');
});



test('QL-259 owner refresh, custody renewal and proof exception review remain fail-closed', async () => {
  const ownerMissing=refreshQl259OwnerStatus({ownerStatusAvailable:false},clock);
  assert.equal(ownerMissing.refreshed,false);
  assert.equal(ownerMissing.status,'QL259_OWNER_STATUS_NOT_AVAILABLE');

  const ownerRefreshed=refreshQl259OwnerStatus({
    ownerStatusAvailable:true,
    ownerReportState:'OWNER_REPORTS_DONE_NOT_VERIFIED',
    ownerAuthorization:'NOT_GIVEN',
    connection:'DISCONNECTED',
    livePilotHolds:12,
    authenticatedIdentity:false,
    reportedAt:clock-60_000
  },clock);
  assert.equal(ownerRefreshed.refreshed,true);
  assert.equal(ownerRefreshed.authenticatedIdentity,false);
  assert.equal(ownerRefreshed.ownerAuthorization,'NOT_GIVEN');

  const custodyMissing=renewQl259CustodySourceEvidence({evidenceAvailable:false},clock);
  assert.equal(custodyMissing.renewed,false);
  assert.equal(custodyMissing.status,'QL259_CUSTODY_SOURCE_EVIDENCE_NOT_AVAILABLE');

  const custodyRenewed=renewQl259CustodySourceEvidence({
    evidenceAvailable:true,
    priorRegistrySnapshotSha256:'a'.repeat(64),
    priorPublicSignerSpkiSha256:'d'.repeat(64),
    priorVerifiedAt:clock-10*60_000,
    registrySnapshotSha256:'b'.repeat(64),
    publicSignerSpkiSha256:'d'.repeat(64),
    custodianAuthenticatedPrivately:true,
    witnessAuthenticatedPrivately:true,
    reviewerAuthenticatedPrivately:true,
    rolesAreDistinct:true,
    approvedRestrictedPrivateKeyHostStore:true,
    publicSpkiPinVerifiedOutOfBand:true,
    custodianReceiptId:'custody-1',
    witnessReceiptId:'witness-2',
    reviewerReceiptId:'reviewer-3',
    challengeIssuedAt:clock-60_000,
    challengeExpiresAt:clock+120_000,
    renewedAt:clock-30_000
  },clock);
  assert.equal(custodyRenewed.renewed,true);
  assert.equal(custodyRenewed.activationAllowed,false);
  assert.equal(custodyRenewed.actualGatewayTest,'NOT_RUN');

  const exceptionOpen=reviewQl259ImmutableProofPublicationException({
    observedMainSha:'a'.repeat(40),
    proofHttpStatus:404,
    exceptionType:'IMMUTABLE_PROOF_NOT_PUBLISHED',
    proofPath:'docs/integration/ql246-source-proof.json'
  });
  assert.equal(exceptionOpen.reviewed,true);
  assert.equal(exceptionOpen.status,'QL259_PROOF_PUBLICATION_EXCEPTION_OPEN_PUBLICATION_REQUIRED');
  assert.equal(exceptionOpen.exceptionWaiverAllowed,false);
  assert.equal(exceptionOpen.ownerAuthorization,'NOT_GIVEN');

  const exceptionResolved=reviewQl259ImmutableProofPublicationException({
    observedMainSha:'b'.repeat(40),
    proofHttpStatus:200,
    sourceRevision:'a'.repeat(40),
    proofCommitSha:'b'.repeat(40),
    proofSha256:'c'.repeat(64),
    publicSignerSpkiSha256:'d'.repeat(64),
    ancestryVerified:true,
    sourceCiHeadSha:'a'.repeat(40),
    sourceCiConclusion:'success',
    sourceCiRunUrl:'https://github.com/RosevearCreations/ai-data-platform/actions/runs/41070310506'
  });
  assert.equal(exceptionResolved.reviewed,true);
  assert.equal(exceptionResolved.proofBPublished,true);
  assert.equal(exceptionResolved.exceptionWaiverAllowed,false);
  assert.equal(exceptionResolved.actualGatewayTest,'NOT_RUN');
});



test('QL-260 authenticated owner receipt, custody renewal verification and proof exception disposition remain separately gated', async () => {
  const ownerMissing=intakeQl260AuthenticatedOwnerStatusReceipt({receiptAvailable:false},clock);
  assert.equal(ownerMissing.accepted,false);
  assert.equal(ownerMissing.status,'QL260_AUTHENTICATED_OWNER_STATUS_RECEIPT_NOT_AVAILABLE');
  assert.equal(ownerMissing.ownerAuthorization,'NOT_GIVEN');

  const ownerAccepted=intakeQl260AuthenticatedOwnerStatusReceipt({
    receiptAvailable:true,
    ownerStatusReceiptId:'owner-status-260-1',
    ownerIdentityAuthenticatedPrivately:true,
    receiptScope:'OWNER_STATUS_ONLY',
    ownerReportState:'OWNER_REPORTS_DONE_NOT_VERIFIED',
    ownerAuthorization:'NOT_GIVEN',
    connection:'DISCONNECTED',
    livePilotHolds:12,
    receiptIssuedAt:clock-60_000,
    receiptExpiresAt:clock+10*60_000
  },clock);
  assert.equal(ownerAccepted.accepted,true);
  assert.equal(ownerAccepted.authenticatedIdentity,true);
  assert.equal(ownerAccepted.networkTestAuthorized,false);
  assert.equal(ownerAccepted.custodyVerified,false);

  const renewalMissing=verifyQl260CustodySourceEvidenceRenewal({renewalAvailable:false},clock);
  assert.equal(renewalMissing.verified,false);
  assert.equal(renewalMissing.status,'QL260_CUSTODY_SOURCE_RENEWAL_NOT_AVAILABLE');

  const renewalVerified=verifyQl260CustodySourceEvidenceRenewal({
    renewalAvailable:true,
    priorPublicSignerSpkiSha256:'d'.repeat(64),
    currentPublicSignerSpkiSha256:'d'.repeat(64),
    priorRegistrySnapshotSha256:'a'.repeat(64),
    currentRegistrySnapshotSha256:'b'.repeat(64),
    custodianAuthenticatedPrivately:true,
    witnessAuthenticatedPrivately:true,
    reviewerAuthenticatedPrivately:true,
    rolesAreDistinct:true,
    approvedRestrictedPrivateKeyHostStore:true,
    publicSpkiPinVerifiedOutOfBand:true,
    custodianReceiptId:'custody-1',
    witnessReceiptId:'witness-2',
    reviewerReceiptId:'reviewer-3',
    renewalReceiptId:'renewal-4',
    challengeIssuedAt:clock-60_000,
    challengeExpiresAt:clock+120_000,
    priorVerifiedAt:clock-20*60_000,
    renewedAt:clock-30_000
  },clock);
  assert.equal(renewalVerified.verified,true);
  assert.equal(renewalVerified.activationAllowed,false);
  assert.equal(renewalVerified.actualGatewayTest,'NOT_RUN');

  const dispositionOpen=disposeQl260ImmutableProofPublicationException({
    observedMainSha:'a'.repeat(40),
    proofHttpStatus:404,
    priorExceptionStatus:'QL259_PROOF_PUBLICATION_EXCEPTION_OPEN_PUBLICATION_REQUIRED',
    exceptionType:'IMMUTABLE_PROOF_NOT_PUBLISHED',
    proofPath:'docs/integration/ql246-source-proof.json'
  });
  assert.equal(dispositionOpen.disposed,true);
  assert.equal(dispositionOpen.disposition,'KEEP_OPEN_PUBLICATION_REQUIRED');
  assert.equal(dispositionOpen.exceptionWaiverAllowed,false);
  assert.equal(dispositionOpen.proofBPublished,false);

  const dispositionResolved=disposeQl260ImmutableProofPublicationException({
    observedMainSha:'b'.repeat(40),
    proofHttpStatus:200,
    sourceRevision:'a'.repeat(40),
    proofCommitSha:'b'.repeat(40),
    proofSha256:'c'.repeat(64),
    publicSignerSpkiSha256:'d'.repeat(64),
    ancestryVerified:true,
    sourceCiHeadSha:'a'.repeat(40),
    sourceCiConclusion:'success',
    sourceCiRunUrl:'https://github.com/RosevearCreations/ai-data-platform/actions/runs/41072292854'
  });
  assert.equal(dispositionResolved.disposed,true);
  assert.equal(dispositionResolved.disposition,'RESOLVED_BY_VERIFIED_PUBLICATION');
  assert.equal(dispositionResolved.proofBPublished,true);
  assert.equal(dispositionResolved.ownerAuthorization,'NOT_GIVEN');
  assert.equal(dispositionResolved.actualGatewayTest,'NOT_RUN');
});



test('QL-260 receipt reconciliation, custody renewal freshness and proof exception closure readiness stay fail-closed', async () => {
  const missingReceipt=reconcileQl260AuthenticatedOwnerStatusReceipt({receiptAvailable:false},clock);
  assert.equal(missingReceipt.reconciled,false);
  assert.equal(missingReceipt.status,'QL260_OWNER_RECEIPT_RECONCILIATION_NOT_AVAILABLE');

  const reconciled=reconcileQl260AuthenticatedOwnerStatusReceipt({
    receiptAvailable:true,
    ownerStatusReceiptId:'owner-status-260-1',
    ownerIdentityAuthenticatedPrivately:true,
    receiptScope:'OWNER_STATUS_ONLY',
    ownerReportState:'OWNER_REPORTS_DONE_NOT_VERIFIED',
    ownerAuthorization:'NOT_GIVEN',
    connection:'DISCONNECTED',
    livePilotHolds:12,
    receiptIssuedAt:clock-60_000,
    receiptExpiresAt:clock+10*60_000,
    statusReturnReceiptId:'owner-status-260-1',
    statusReturnState:'OWNER_REPORTS_DONE_NOT_VERIFIED',
    statusReturnScope:'OWNER_STATUS_ONLY',
    statusReturnedAt:clock-30_000
  },clock);
  assert.equal(reconciled.reconciled,true);
  assert.equal(reconciled.authenticatedIdentity,true);
  assert.equal(reconciled.custodyVerified,false);
  assert.equal(reconciled.networkTestAuthorized,false);

  const missingFreshness=enforceQl260CustodySourceRenewalFreshness({renewalAvailable:false},clock);
  assert.equal(missingFreshness.fresh,false);
  assert.equal(missingFreshness.status,'QL260_CUSTODY_RENEWAL_FRESHNESS_NOT_AVAILABLE');

  const freshnessBase={
    renewalAvailable:true,
    priorPublicSignerSpkiSha256:'d'.repeat(64),
    currentPublicSignerSpkiSha256:'d'.repeat(64),
    priorRegistrySnapshotSha256:'a'.repeat(64),
    currentRegistrySnapshotSha256:'b'.repeat(64),
    custodianAuthenticatedPrivately:true,
    witnessAuthenticatedPrivately:true,
    reviewerAuthenticatedPrivately:true,
    rolesAreDistinct:true,
    approvedRestrictedPrivateKeyHostStore:true,
    publicSpkiPinVerifiedOutOfBand:true,
    custodianReceiptId:'custody-1',
    witnessReceiptId:'witness-2',
    reviewerReceiptId:'reviewer-3',
    renewalReceiptId:'renewal-4',
    priorVerifiedAt:clock-20*60_000
  };

  const staleFreshness=enforceQl260CustodySourceRenewalFreshness({
    ...freshnessBase,
    challengeIssuedAt:clock-40*60_000,
    challengeExpiresAt:clock-35*60_000,
    renewedAt:clock-39*60_000,
    maxRenewalAgeMs:30*60_000
  },clock);
  assert.equal(staleFreshness.fresh,false);

  const freshRenewal=enforceQl260CustodySourceRenewalFreshness({
    ...freshnessBase,
    priorVerifiedAt:clock-20*60_000,
    challengeIssuedAt:clock-60_000,
    challengeExpiresAt:clock+120_000,
    renewedAt:clock-30_000,
    maxRenewalAgeMs:30*60_000
  },clock);
  assert.equal(freshRenewal.fresh,true);
  assert.equal(freshRenewal.activationAllowed,false);
  assert.equal(freshRenewal.actualGatewayTest,'NOT_RUN');

  const closureMissing=prepareQl260ImmutableProofExceptionClosureReadiness({
    observedMainSha:'a'.repeat(40),
    proofHttpStatus:404
  });
  assert.equal(closureMissing.ready,false);
  assert.equal(closureMissing.status,'QL260_PROOF_EXCEPTION_CLOSURE_NOT_READY_PUBLICATION_MISSING');
  assert.equal(closureMissing.exceptionWaiverAllowed,false);

  const closureHeld=prepareQl260ImmutableProofExceptionClosureReadiness({
    observedMainSha:'b'.repeat(40),
    proofHttpStatus:200,
    sourceRevision:'a'.repeat(40),
    proofCommitSha:'b'.repeat(40),
    proofSha256:'c'.repeat(64),
    publicSignerSpkiSha256:'d'.repeat(64),
    ancestryVerified:true,
    sourceCiHeadSha:'a'.repeat(40),
    sourceCiConclusion:'success',
    sourceCiRunUrl:'https://github.com/RosevearCreations/ai-data-platform/actions/runs/41074503478',
    priorDisposition:'KEEP_OPEN_PUBLICATION_REQUIRED',
    ownerReceiptReconciled:false,
    custodyRenewalFresh:false
  });
  assert.equal(closureHeld.ready,false);
  assert.equal(closureHeld.closureAllowed,false);

  const closureReady=prepareQl260ImmutableProofExceptionClosureReadiness({
    observedMainSha:'b'.repeat(40),
    proofHttpStatus:200,
    sourceRevision:'a'.repeat(40),
    proofCommitSha:'b'.repeat(40),
    proofSha256:'c'.repeat(64),
    publicSignerSpkiSha256:'d'.repeat(64),
    ancestryVerified:true,
    sourceCiHeadSha:'a'.repeat(40),
    sourceCiConclusion:'success',
    sourceCiRunUrl:'https://github.com/RosevearCreations/ai-data-platform/actions/runs/41074503478',
    priorDisposition:'KEEP_OPEN_PUBLICATION_REQUIRED',
    ownerReceiptReconciled:true,
    custodyRenewalFresh:true,
    closureReviewerReceiptId:'closure-review-260-1',
    closureReviewStatus:'APPROVED_TO_CLOSE_EXCEPTION_ONLY'
  });
  assert.equal(closureReady.ready,true);
  assert.equal(closureReady.closureAllowed,true);
  assert.equal(closureReady.proofBPublished,true);
  assert.equal(closureReady.ownerAuthorization,'NOT_GIVEN');
  assert.equal(closureReady.actualGatewayTest,'NOT_RUN');
});

console.log('QL-246 independent public six-app source proof and trusted pin challenge: tests complete.');


test('QL-261 actual owner packet, independent custody gate and source-proof readiness stay fail-closed', () => {
  const missingPacket = reconcileQl261ActualOwnerPacketReceipt({ packetAvailable: false }, clock);
  assert.equal(missingPacket.reconciled, false);
  assert.equal(missingPacket.status, 'QL261_ACTUAL_OWNER_PACKET_RECEIPT_NOT_AVAILABLE');
  assert.equal(missingPacket.actualGatewayTest, 'NOT_RUN');

  const packet = reconcileQl261ActualOwnerPacketReceipt({
    packetAvailable: true,
    ownerIdentityAuthenticatedPrivately: true,
    ownerPacketReceiptId: 'owner-packet-261',
    ownerPacketSha256: 'a'.repeat(64),
    packetScope: 'ACTUAL_OWNER_PACKET_ONLY',
    ownerReportState: 'OWNER_REPORTS_DONE_NOT_VERIFIED',
    ownerAuthorization: 'NOT_GIVEN',
    connection: 'DISCONNECTED',
    livePilotHolds: 12,
    receiptIssuedAt: clock - 60_000,
    packetReceivedAt: clock - 30_000,
    receiptExpiresAt: clock + 120_000
  }, clock);
  assert.equal(packet.reconciled, true);
  assert.equal(packet.status, 'QL261_ACTUAL_OWNER_PACKET_RECEIPT_RECONCILED_STATUS_ONLY');
  assert.equal(packet.custodyVerified, false);
  assert.equal(packet.networkTestAuthorized, false);

  const missingCustody = evaluateQl261IndependentSignerCustodyEvidenceGate({ evidenceAvailable: false }, clock);
  assert.equal(missingCustody.gatePassed, false);
  assert.equal(missingCustody.status, 'QL261_SIGNER_CUSTODY_EVIDENCE_NOT_AVAILABLE');

  const custody = evaluateQl261IndependentSignerCustodyEvidenceGate({
    evidenceAvailable: true,
    custodianAuthenticatedPrivately: true,
    witnessAuthenticatedPrivately: true,
    reviewerAuthenticatedPrivately: true,
    rolesAreDistinct: true,
    approvedRestrictedPrivateKeyHostStore: true,
    publicSpkiPinVerifiedOutOfBand: true,
    publicSignerSpkiSha256: 'b'.repeat(64),
    registrySnapshotSha256: 'c'.repeat(64),
    custodianReceiptId: 'custodian-261',
    witnessReceiptId: 'witness-261',
    reviewerReceiptId: 'reviewer-261',
    challengeIssuedAt: clock - 60_000,
    challengeExpiresAt: clock + 60_000,
    evidenceVerifiedAt: clock - 30_000
  }, clock);
  assert.equal(custody.gatePassed, true);
  assert.equal(custody.status, 'QL261_SIGNER_CUSTODY_EVIDENCE_GATE_PASSED_ACTIVATION_HELD');
  assert.equal(custody.activationAllowed, false);
  assert.equal(custody.actualGatewayTest, 'NOT_RUN');

  const proofMissing = prepareQl261SourceProofPublicationReadiness({
    observedMainSha: '5b30613d6ccd27de0661b78bd657bd68cfee4a4a',
    proofHttpStatus: 404
  });
  assert.equal(proofMissing.ready, false);
  assert.equal(proofMissing.status, 'QL261_SOURCE_PROOF_PUBLICATION_NOT_READY_PROOF_MISSING');
  assert.equal(proofMissing.actualGatewayTest, 'NOT_RUN');
});


test('QL-262 owner packet freshness, signer-custody receipt audit and publication preflight remain fail-closed', () => {
  const missingPacket = enforceQl262OwnerPacketFreshness({ packetAvailable: false }, clock);
  assert.equal(missingPacket.fresh, false);
  assert.equal(missingPacket.status, 'QL262_OWNER_PACKET_FRESHNESS_NOT_AVAILABLE');
  assert.equal(missingPacket.actualGatewayTest, 'NOT_RUN');

  const freshPacket = enforceQl262OwnerPacketFreshness({
    packetAvailable: true,
    ownerIdentityAuthenticatedPrivately: true,
    ownerPacketReceiptId: 'owner-packet-262',
    ownerPacketSha256: 'a'.repeat(64),
    packetScope: 'ACTUAL_OWNER_PACKET_ONLY',
    ownerReportState: 'OWNER_REPORTS_DONE_NOT_VERIFIED',
    ownerAuthorization: 'NOT_GIVEN',
    connection: 'DISCONNECTED',
    livePilotHolds: 12,
    receiptIssuedAt: clock - 60_000,
    packetReceivedAt: clock - 30_000,
    receiptExpiresAt: clock + 120_000,
    maxPacketAgeMs: 30 * 60_000
  }, clock);
  assert.equal(freshPacket.fresh, true);
  assert.equal(freshPacket.status, 'QL262_OWNER_PACKET_FRESH_STATUS_ONLY_GATEWAY_HELD');
  assert.equal(freshPacket.custodyVerified, false);
  assert.equal(freshPacket.networkTestAuthorized, false);

  const missingAudit = auditQl262IndependentSignerCustodyEvidenceReceipts({ evidenceAvailable: false }, clock);
  assert.equal(missingAudit.auditPassed, false);
  assert.equal(missingAudit.status, 'QL262_SIGNER_CUSTODY_RECEIPT_AUDIT_NOT_AVAILABLE');

  const audited = auditQl262IndependentSignerCustodyEvidenceReceipts({
    evidenceAvailable: true,
    custodianAuthenticatedPrivately: true,
    witnessAuthenticatedPrivately: true,
    reviewerAuthenticatedPrivately: true,
    rolesAreDistinct: true,
    approvedRestrictedPrivateKeyHostStore: true,
    publicSpkiPinVerifiedOutOfBand: true,
    publicSignerSpkiSha256: 'b'.repeat(64),
    registrySnapshotSha256: 'c'.repeat(64),
    custodianReceiptId: 'custodian-262',
    witnessReceiptId: 'witness-262',
    reviewerReceiptId: 'reviewer-262',
    challengeIssuedAt: clock - 60_000,
    challengeExpiresAt: clock + 60_000,
    evidenceVerifiedAt: clock - 30_000,
    auditReceiptId: 'audit-262-1',
    receiptSetSha256: 'd'.repeat(64),
    auditedAt: clock - 10_000
  }, clock);
  assert.equal(audited.auditPassed, true);
  assert.equal(audited.status, 'QL262_SIGNER_CUSTODY_RECEIPT_AUDIT_PASSED_ACTIVATION_HELD');
  assert.equal(audited.activationAllowed, false);
  assert.equal(audited.actualGatewayTest, 'NOT_RUN');

  const preflightMissing = preflightQl262SourceProofPublication({
    observedMainSha: '7f32e1bf82312f890bb6b37d9461d22deded26d1',
    proofHttpStatus: 404
  });
  assert.equal(preflightMissing.ready, false);
  assert.equal(preflightMissing.status, 'QL262_SOURCE_PROOF_PUBLICATION_PREFLIGHT_NOT_READY_PROOF_MISSING');
  assert.equal(preflightMissing.actualGatewayTest, 'NOT_RUN');
});


test('QL-263 owner renewal, custody audit freshness and proof exception review remain fail-closed', () => {
  const missingRenewal=renewQl263OwnerPacketEvidence({renewalAvailable:false},clock);
  assert.equal(missingRenewal.renewed,false);
  assert.equal(missingRenewal.status,'QL263_OWNER_PACKET_RENEWAL_NOT_AVAILABLE');
  assert.equal(missingRenewal.actualGatewayTest,'NOT_RUN');

  const missingAudit=enforceQl263SignerCustodyAuditFreshness({evidenceAvailable:false},clock);
  assert.equal(missingAudit.fresh,false);
  assert.equal(missingAudit.status,'QL263_SIGNER_CUSTODY_AUDIT_FRESHNESS_NOT_AVAILABLE');

  const open=reviewQl263SourceProofPublicationException({
    observedMainSha:'13b14183807d5c08c9dcb3defe426349619a393e',
    proofHttpStatus:404,
    exceptionType:'IMMUTABLE_PROOF_NOT_PUBLISHED',
    proofPath:'docs/integration/ql246-source-proof.json'
  });
  assert.equal(open.reviewed,true);
  assert.equal(open.disposition,'KEEP_OPEN_PUBLICATION_REQUIRED');
  assert.equal(open.exceptionWaiverAllowed,false);
  assert.equal(open.actualGatewayTest,'NOT_RUN');
});
