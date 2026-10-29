/**
 * QL-246 public-only, independently pinned source-evidence review.
 * This is NOT a gateway connection, owner approval, or authentication test.
 * Trusted pins MUST arrive through an independent operator-controlled channel.
 */
import { createHash, createPublicKey, timingSafeEqual, verify } from 'node:crypto';

export const QL246_SYSTEMS = Object.freeze([
  'ai-data-platform', 'devilndove', 'rosiedazzlers', 'yw', 'icamp', 'rosevear-ai-hub'
]);
export const QL246_PATH = 'docs/integration/ql246-source-proof.json';
export const QL246_METHODS = Object.freeze(['GET']);
export const QL246_PATHS = Object.freeze([
  '/api/integration/v1/health', '/api/integration/v1/capabilities'
]);
export const QL246_NEGATIVES = Object.freeze([
  'nonce_replay_denied', 'stale_request_denied', 'cross_business_denied',
  'cross_tenant_denied', 'revoked_key_denied', 'write_denied', 'dispatch_denied'
]);
export const QL246_PROOF_FIELDS = Object.freeze([
  'schema_version', 'source_system', 'repository', 'source_revision',
  'challenge_id', 'challenge_sha256', 'business_id', 'tenant_id',
  'environment', 'ci_run_url', 'allowed_methods', 'allowed_paths',
  'negative_tests', 'gateway_audit_receipt_id', 'health_receipt_id',
  'capabilities_receipt_id', 'registered_key_id', 'owner_authorization',
  'connection_state', 'external_gateway_get_verified', 'durable_audit_verified',
  'owner_identity_verified', 'issued_at', 'expires_at'
]);
const REV = /^[a-f0-9]{40}$/;
const HEX = /^[a-f0-9]{64}$/;
const REPO = /^[A-Za-z0-9_.-]{1,90}$/;
const ID = /^np-[a-z0-9-]{6,70}$/;
const exact = (value, keys) => value !== null && typeof value === 'object' &&
  !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value)) &&
  Object.keys(value).length === keys.length && Object.keys(value).every(k => keys.includes(k));
const hash = data => createHash('sha256').update(data).digest('hex');
const safeHex = (a, b) => typeof a === 'string' && typeof b === 'string' &&
  HEX.test(a) && HEX.test(b) && timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
const noSecrets = value => !/-----BEGIN (?:PRIVATE|OPENSSH) KEY-----|(?:api[_-]?key|secret|password|token)\s*[=:]/i.test(value);

export function ql246Canonical(payload) {
  if (!exact(payload, QL246_PROOF_FIELDS)) throw new TypeError('Unrecognized QL-246 signed payload fields.');
  return Buffer.from(QL246_PROOF_FIELDS.map(k => JSON.stringify([k, payload[k]])).join('\n'), 'utf8');
}

const QL246_V1_ROW_FIELDS = Object.freeze([
  'system', 'repository', 'sourceRevision', 'sha256',
  'publicKeyFingerprintSha256', 'businessId', 'tenantId'
]);
const QL248_ROW_FIELDS = Object.freeze([
  'system', 'repository', 'sourceRevision', 'proofCommitSha', 'proofSha256',
  'ciRunUrl', 'publicKeyFingerprintSha256', 'businessId', 'tenantId'
]);

function trustedRowVersion(row) {
  if (exact(row, QL246_V1_ROW_FIELDS)) return 1;
  if (exact(row, QL248_ROW_FIELDS)) return 2;
  return 0;
}

function rowProofCommitSha(row) {
  return trustedRowVersion(row) === 2 ? row.proofCommitSha : row.sourceRevision;
}

function rowProofSha256(row) {
  return trustedRowVersion(row) === 2 ? row.proofSha256 : row.sha256;
}

export function ql246RawUrl(row) {
  const version = trustedRowVersion(row);
  if (!version) throw new TypeError('A trusted source entry has an unsupported public field set.');
  const proofCommitSha = rowProofCommitSha(row);
  if (!QL246_SYSTEMS.includes(row.system) || !REPO.test(row.repository) ||
    !REV.test(row.sourceRevision) || !REV.test(proofCommitSha) ||
    !HEX.test(rowProofSha256(row)) || !HEX.test(row.publicKeyFingerprintSha256))
    throw new TypeError('Unsafe or incomplete immutable source location.');
  if (version === 2 && (
    typeof row.ciRunUrl !== 'string' ||
    row.ciRunUrl !== `https://github.com/RosevearCreations/${row.repository}/actions/runs/${String(row.ciRunUrl).split('/').at(-1)}` ||
    !/\/actions\/runs\/[1-9][0-9]*$/.test(row.ciRunUrl)
  )) throw new TypeError('Unsafe or incomplete source CI identity.');
  return `https://raw.githubusercontent.com/RosevearCreations/${row.repository}/${proofCommitSha}/${QL246_PATH}`;
}

function validTrust(manifest, now) {
  if (!exact(manifest, ['schema', 'challengeId', 'challengeNonce', 'issuedAt', 'expiresAt', 'sources']) ||
    !['rosevear.integration.ql246.trusted-pins.v1', 'rosevear.integration.ql246.trusted-pins.v2'].includes(manifest.schema) ||
    !ID.test(manifest.challengeId) ||
    typeof manifest.challengeNonce !== 'string' || !/^[A-Za-z0-9_-]{32,128}$/.test(manifest.challengeNonce) ||
    !Number.isSafeInteger(manifest.issuedAt) || !Number.isSafeInteger(manifest.expiresAt) ||
    manifest.issuedAt > now || manifest.issuedAt < now - 3_600_000 ||
    manifest.expiresAt <= now || manifest.expiresAt - manifest.issuedAt > 3_600_000 ||
    !Array.isArray(manifest.sources) || manifest.sources.length !== 6) return false;
  const repos = new Set(), pins = new Set();
  const requiredRowVersion = manifest.schema === 'rosevear.integration.ql246.trusted-pins.v2' ? 2 : 1;
  return QL246_SYSTEMS.every((system, i) => {
    const row = manifest.sources[i];
    if (trustedRowVersion(row) !== requiredRowVersion) return false;
    try { ql246RawUrl(row); } catch { return false; }
    if (requiredRowVersion === 2 && row.sourceRevision === row.proofCommitSha) return false;
    if (row.system !== system || typeof row.businessId !== 'string' ||
      row.businessId !== (system === 'ai-data-platform' ? 'devilndove' : system) ||
      (system === 'yw' || system === 'icamp'
        ? typeof row.tenantId !== 'string' || !ID.test(row.tenantId)
        : row.tenantId !== null) ||
      repos.has(row.repository) || pins.has(row.publicKeyFingerprintSha256)) return false;
    repos.add(row.repository); pins.add(row.publicKeyFingerprintSha256);
    return true;
  });
}

function proofFor(row, manifest, raw, now) {
  if (typeof raw !== 'string' || Buffer.byteLength(raw, 'utf8') > 16_384 ||
    !noSecrets(raw) || !safeHex(hash(raw), rowProofSha256(row))) return 'SOURCE_BYTES_OR_DIGEST_INVALID';
  let evidence;
  try { evidence = JSON.parse(raw); } catch { return 'SOURCE_JSON_INVALID'; }
  if (!exact(evidence, ['publicKeyPem', 'payload', 'signature']) ||
    typeof evidence.publicKeyPem !== 'string' || evidence.publicKeyPem.length > 2048 ||
    typeof evidence.signature !== 'string' || !/^[A-Za-z0-9_-]{86}$/.test(evidence.signature) ||
    !exact(evidence.payload, QL246_PROOF_FIELDS)) return 'SOURCE_SCHEMA_INVALID';
  let publicKey;
  try {
    publicKey = createPublicKey(evidence.publicKeyPem);
    if (publicKey.asymmetricKeyType !== 'ed25519' ||
      !safeHex(hash(publicKey.export({ format: 'der', type: 'spki' })), row.publicKeyFingerprintSha256) ||
      !verify(null, ql246Canonical(evidence.payload), publicKey, Buffer.from(evidence.signature, 'base64url')))
      return 'SOURCE_SIGNING_PIN_OR_SIGNATURE_INVALID';
  } catch { return 'SOURCE_SIGNING_PIN_OR_SIGNATURE_INVALID'; }
  const p = evidence.payload;
  if (p.schema_version !== 'rosevear.integration.v1' ||
    p.source_system !== row.system || p.repository !== `RosevearCreations/${row.repository}` ||
    p.source_revision !== row.sourceRevision ||
    p.challenge_id !== manifest.challengeId ||
    !safeHex(p.challenge_sha256, hash(manifest.challengeNonce)) ||
    p.business_id !== row.businessId || p.tenant_id !== row.tenantId ||
    p.environment !== 'nonproduction' ||
    (trustedRowVersion(row) === 2 ? p.ci_run_url !== row.ciRunUrl :
      p.ci_run_url !== `https://github.com/RosevearCreations/${row.repository}/actions/runs/${String(p.ci_run_url).split('/').at(-1)}`) ||
    !/\/actions\/runs\/[1-9][0-9]*$/.test(p.ci_run_url) ||
    JSON.stringify(p.allowed_methods) !== JSON.stringify(QL246_METHODS) ||
    JSON.stringify(p.allowed_paths) !== JSON.stringify(QL246_PATHS) ||
    !exact(p.negative_tests, QL246_NEGATIVES) ||
    !QL246_NEGATIVES.every(k => p.negative_tests[k] === true) ||
    ![p.gateway_audit_receipt_id, p.health_receipt_id, p.capabilities_receipt_id, p.registered_key_id]
      .every(v => v === null || typeof v === 'string' && ID.test(v)) ||
    p.owner_authorization !== 'NOT_GIVEN' || p.connection_state !== 'DISCONNECTED' ||
    p.external_gateway_get_verified !== false || p.durable_audit_verified !== false ||
    p.owner_identity_verified !== false ||
    !Number.isSafeInteger(p.issued_at) || !Number.isSafeInteger(p.expires_at) ||
    p.issued_at < manifest.issuedAt || p.issued_at > now ||
    p.expires_at <= now || p.expires_at - p.issued_at > 3_600_000)
    return 'SIGNED_SOURCE_SCOPE_OR_FRESHNESS_INVALID';
  return null;
}

function held(status, rows, reason) {
  return Object.freeze({
    release: 'ql246-independent-six-app-public-source-verification-held-v1',
    status, reason, systems: rows, verifiedCount: rows.filter(r => r.status === 'VERIFIED_SIGNED_SOURCE_ONLY').length,
    connectionState: 'DISCONNECTED', ownerAuthorization: 'NOT_GIVEN',
    externalGatewayAuthenticatedGetVerified: false, credentialExchangeVerified: false,
    independentDurableAuditVerified: false, independentOwnerIdentityVerified: false,
    readOnlyPilotAuthorized: false, livePilotReleased: false,
    calls: 0, sms: 0, writes: 0, dispatch: 0, realPilotHolds: 12
  });
}


export function ql248PhaseAProofOriginScaffold(manifest, now = Date.now()) {
  if (!Number.isSafeInteger(now) || !validTrust(manifest, now) ||
    manifest.schema !== 'rosevear.integration.ql246.trusted-pins.v2') {
    return Object.freeze({
      status: 'HOLD_PHASE_A_MANIFEST_INCOMPLETE',
      complete: false,
      sourceCount: 0,
      systems: [],
      connectionState: 'DISCONNECTED',
      ownerAuthorization: 'NOT_GIVEN'
    });
  }

  const systems = manifest.sources.map((row) => Object.freeze({
    system: row.system,
    repository: `RosevearCreations/${row.repository}`,
    sourceRevision: row.sourceRevision,
    sourceCiRunUrl: row.ciRunUrl,
    proofCommitSha: row.proofCommitSha,
    proofSha256: row.proofSha256,
    publicKeySpkiSha256: row.publicKeyFingerprintSha256,
    businessId: row.businessId,
    tenantId: row.tenantId,
    publicProofUrl: ql246RawUrl(row),
    phaseAComplete: true
  }));

  return Object.freeze({
    status: 'SIX_SOURCE_PHASE_A_PROVENANCE_COMPLETE_AUTH_TESTING_HELD',
    complete: true,
    sourceCount: systems.length,
    systems,
    connectionState: 'DISCONNECTED',
    ownerAuthorization: 'NOT_GIVEN'
  });
}


export function exportQl248PhaseAProofOriginScaffold(scaffold) {
  if (!scaffold || scaffold.complete !== true ||
    scaffold.status !== 'SIX_SOURCE_PHASE_A_PROVENANCE_COMPLETE_AUTH_TESTING_HELD' ||
    scaffold.sourceCount !== 6 || !Array.isArray(scaffold.systems) ||
    scaffold.systems.length !== 6) throw new TypeError('QL-248 Phase-A scaffold is not exportable.');
  const payload = {
    schema: 'rosevear.integration.ql248.phase-a-proof-origin.v1',
    status: scaffold.status,
    connectionState: 'DISCONNECTED',
    ownerAuthorization: 'NOT_GIVEN',
    systems: scaffold.systems.map(row => ({
      system: row.system,
      repository: row.repository,
      sourceRevision: row.sourceRevision,
      sourceCiRunUrl: row.sourceCiRunUrl,
      proofCommitSha: row.proofCommitSha,
      proofSha256: row.proofSha256,
      publicKeySpkiSha256: row.publicKeySpkiSha256,
      businessId: row.businessId,
      tenantId: row.tenantId,
      publicProofUrl: row.publicProofUrl
    }))
  };
  return JSON.stringify(payload, null, 2) + '\n';
}

export function verifyQl248PhaseAProofOriginExport(raw) {
  let payload;
  try { payload = JSON.parse(raw); } catch { return Object.freeze({ valid: false, reason: 'INVALID_JSON' }); }
  if (!exact(payload, ['schema','status','connectionState','ownerAuthorization','systems']) ||
    payload.schema !== 'rosevear.integration.ql248.phase-a-proof-origin.v1' ||
    payload.status !== 'SIX_SOURCE_PHASE_A_PROVENANCE_COMPLETE_AUTH_TESTING_HELD' ||
    payload.connectionState !== 'DISCONNECTED' || payload.ownerAuthorization !== 'NOT_GIVEN' ||
    !Array.isArray(payload.systems) || payload.systems.length !== 6)
    return Object.freeze({ valid: false, reason: 'INVALID_EXPORT_SCHEMA' });
  const repos = new Set(), proofUrls = new Set(), pins = new Set();
  for (let i = 0; i < QL246_SYSTEMS.length; i++) {
    const row = payload.systems[i];
    const fields = ['system','repository','sourceRevision','sourceCiRunUrl','proofCommitSha','proofSha256','publicKeySpkiSha256','businessId','tenantId','publicProofUrl'];
    if (!exact(row, fields) || row.system !== QL246_SYSTEMS[i] ||
      typeof row.repository !== 'string' || !row.repository.startsWith('RosevearCreations/') ||
      !REV.test(row.sourceRevision) || !REV.test(row.proofCommitSha) || row.sourceRevision === row.proofCommitSha ||
      !HEX.test(row.proofSha256) || !HEX.test(row.publicKeySpkiSha256) ||
      typeof row.sourceCiRunUrl !== 'string' || typeof row.publicProofUrl !== 'string')
      return Object.freeze({ valid: false, reason: 'INVALID_ORIGIN_ROW' });
    const repo = row.repository.slice('RosevearCreations/'.length);
    const expectedCiPrefix = `https://github.com/RosevearCreations/${repo}/actions/runs/`;
    const expectedProofUrl = `https://raw.githubusercontent.com/RosevearCreations/${repo}/${row.proofCommitSha}/${QL246_PATH}`;
    if (!row.sourceCiRunUrl.startsWith(expectedCiPrefix) || row.publicProofUrl !== expectedProofUrl ||
      repos.has(row.repository) || proofUrls.has(row.publicProofUrl) || pins.has(row.publicKeySpkiSha256))
      return Object.freeze({ valid: false, reason: 'ORIGIN_CONSISTENCY_MISMATCH' });
    repos.add(row.repository); proofUrls.add(row.publicProofUrl); pins.add(row.publicKeySpkiSha256);
  }
  return Object.freeze({
    valid: true,
    status: 'SIX_SOURCE_IMMUTABLE_ORIGIN_CONSISTENT_AUTH_TESTING_HELD',
    sourceCount: 6,
    connectionState: 'DISCONNECTED',
    ownerAuthorization: 'NOT_GIVEN',
    exportSha256: hash(raw)
  });
}


export function reconcileQl248ExportDigest(raw, expectedSha256) {
  if (typeof raw !== 'string' || !HEX.test(expectedSha256))
    return Object.freeze({ match: false, status: 'HOLD_EXPORT_DIGEST_INPUT_INVALID' });
  const actualSha256 = hash(raw);
  return Object.freeze({
    match: safeHex(actualSha256, expectedSha256),
    status: safeHex(actualSha256, expectedSha256)
      ? 'EXPORT_DIGEST_MATCH_AUTH_TESTING_HELD'
      : 'HOLD_EXPORT_DIGEST_DRIFT',
    actualSha256,
    expectedSha256,
    connectionState: 'DISCONNECTED',
    ownerAuthorization: 'NOT_GIVEN'
  });
}

export function detectQl248ImmutableOriginDrift(previousRaw, currentRaw) {
  const previous = verifyQl248PhaseAProofOriginExport(previousRaw);
  const current = verifyQl248PhaseAProofOriginExport(currentRaw);
  if (!previous.valid || !current.valid)
    return Object.freeze({ drift: true, status: 'HOLD_ORIGIN_EXPORT_INVALID', changedSystems: [] });
  const a = JSON.parse(previousRaw);
  const b = JSON.parse(currentRaw);
  const changedSystems = [];
  for (let i = 0; i < QL246_SYSTEMS.length; i++) {
    const left = a.systems[i], right = b.systems[i];
    const immutableFields = [
      'system','repository','sourceRevision','sourceCiRunUrl','proofCommitSha',
      'proofSha256','publicKeySpkiSha256','businessId','tenantId','publicProofUrl'
    ];
    if (immutableFields.some(field => JSON.stringify(left[field]) !== JSON.stringify(right[field])))
      changedSystems.push(QL246_SYSTEMS[i]);
  }
  return Object.freeze({
    drift: changedSystems.length > 0,
    status: changedSystems.length === 0
      ? 'SIX_SOURCE_IMMUTABLE_ORIGIN_NO_DRIFT_AUTH_TESTING_HELD'
      : 'HOLD_SIX_SOURCE_IMMUTABLE_ORIGIN_DRIFT',
    changedSystems: Object.freeze(changedSystems),
    previousExportSha256: hash(previousRaw),
    currentExportSha256: hash(currentRaw),
    connectionState: 'DISCONNECTED',
    ownerAuthorization: 'NOT_GIVEN'
  });
}


export function reconcileQl253SourceCiProofAncestry(input) {
  const base = Object.freeze({
    connectionState: 'DISCONNECTED',
    ownerAuthorization: 'NOT_GIVEN',
    actualGatewayTest: 'NOT_RUN'
  });
  if (!input || input.system !== 'ai-data-platform' ||
    !REV.test(input.sourceRevision || '') ||
    typeof input.sourceCiRunUrl !== 'string' ||
    typeof input.sourceCiHeadSha !== 'string' ||
    !REV.test(input.sourceCiHeadSha) ||
    typeof input.proofCommitSha !== 'string' ||
    !REV.test(input.proofCommitSha) ||
    typeof input.proofHttpStatus !== 'number' ||
    typeof input.ancestryVerified !== 'boolean') {
    return Object.freeze({ ...base, ready: false, status: 'HOLD_QL253_RETRY_INPUT_INCOMPLETE' });
  }
  if (input.sourceCiHeadSha !== input.sourceRevision)
    return Object.freeze({ ...base, ready: false, status: 'HOLD_SOURCE_CI_SHA_MISMATCH' });
  if (!/^https:\/\/github\.com\/RosevearCreations\/ai-data-platform\/actions\/runs\/[1-9][0-9]*$/.test(input.sourceCiRunUrl))
    return Object.freeze({ ...base, ready: false, status: 'HOLD_SOURCE_CI_URL_INVALID' });
  if (input.proofCommitSha === input.sourceRevision)
    return Object.freeze({ ...base, ready: false, status: 'HOLD_PROOF_COMMIT_NOT_DISTINCT' });
  if (!input.ancestryVerified)
    return Object.freeze({ ...base, ready: false, status: 'HOLD_SOURCE_TO_PROOF_ANCESTRY_UNVERIFIED' });
  if (input.proofHttpStatus !== 200)
    return Object.freeze({ ...base, ready: false, status: 'HOLD_IMMUTABLE_PROOF_NOT_PUBLISHED' });
  if (!HEX.test(input.proofSha256 || ''))
    return Object.freeze({ ...base, ready: false, status: 'HOLD_PROOF_DIGEST_NOT_AVAILABLE' });
  return Object.freeze({
    ...base,
    ready: true,
    status: 'QL253_PUBLIC_PROOF_RETRY_READY_OWNER_TEST_AUTH_HELD',
    sourceRevision: input.sourceRevision,
    proofCommitSha: input.proofCommitSha,
    proofSha256: input.proofSha256
  });
}

export function renewQl253CustodyPinException(input, now = Date.now()) {
  const base = Object.freeze({
    connectionState: 'DISCONNECTED',
    ownerAuthorization: 'NOT_GIVEN',
    actualGatewayTest: 'NOT_RUN'
  });
  if (!Number.isSafeInteger(now) || !input)
    return Object.freeze({ ...base, renewed: false, status: 'HOLD_CUSTODY_RENEWAL_INPUT_INVALID' });

  const receiptOk = typeof input.custodyReceiptId === 'string' && input.custodyReceiptId.length >= 6;
  const witnessOk = typeof input.witnessReceiptId === 'string' && input.witnessReceiptId.length >= 6 &&
    input.witnessReceiptId !== input.custodyReceiptId;
  const pinOk = HEX.test(input.publicKeySpkiSha256 || '');
  const timesOk = Number.isSafeInteger(input.issuedAt) && Number.isSafeInteger(input.expiresAt) &&
    input.issuedAt <= now && input.expiresAt > now &&
    input.expiresAt - input.issuedAt <= 5 * 60 * 1000;
  const independentOk = input.custodyVerifiedOutOfBand === true && input.witnessVerifiedOutOfBand === true;

  if (!receiptOk || !witnessOk || !pinOk || !timesOk || !independentOk)
    return Object.freeze({
      ...base,
      renewed: false,
      status: 'HOLD_CUSTODY_PIN_EXCEPTION_RENEWAL_PENDING_INDEPENDENT_VERIFICATION'
    });

  return Object.freeze({
    ...base,
    renewed: true,
    status: 'CUSTODY_PIN_EXCEPTION_RENEWED_OWNER_TEST_AUTH_HELD',
    custodyReceiptId: input.custodyReceiptId,
    witnessReceiptId: input.witnessReceiptId,
    publicKeySpkiSha256: input.publicKeySpkiSha256,
    expiresAt: input.expiresAt
  });
}


export function reconcileQl253PublicProofRetryResult(input) {
  const base = Object.freeze({
    connectionState: 'DISCONNECTED',
    ownerAuthorization: 'NOT_GIVEN',
    actualGatewayTest: 'NOT_RUN'
  });
  if (!input || typeof input.proofHttpStatus !== 'number')
    return Object.freeze({ ...base, reconciled: false, status: 'HOLD_QL253_RETRY_RESULT_INCOMPLETE' });
  if (input.proofHttpStatus !== 200)
    return Object.freeze({ ...base, reconciled: false, status: 'HOLD_IMMUTABLE_PROOF_NOT_PUBLISHED' });
  if (!REV.test(input.sourceRevision || '') || !REV.test(input.proofCommitSha || '') ||
    input.sourceRevision === input.proofCommitSha ||
    !HEX.test(input.proofSha256 || '') ||
    input.sourceCiHeadSha !== input.sourceRevision ||
    input.ancestryVerified !== true)
    return Object.freeze({ ...base, reconciled: false, status: 'HOLD_QL253_RETRY_RESULT_MISMATCH' });
  return Object.freeze({
    ...base,
    reconciled: true,
    status: 'QL253_PUBLIC_PROOF_RETRY_RECONCILED_OWNER_TEST_AUTH_HELD',
    sourceRevision: input.sourceRevision,
    proofCommitSha: input.proofCommitSha,
    proofSha256: input.proofSha256
  });
}

export function handleQl253AncestryDrift(previous, current) {
  const base = Object.freeze({
    connectionState: 'DISCONNECTED',
    ownerAuthorization: 'NOT_GIVEN',
    actualGatewayTest: 'NOT_RUN'
  });
  if (!previous || !current ||
    !REV.test(previous.sourceRevision || '') || !REV.test(previous.proofCommitSha || '') ||
    !REV.test(current.sourceRevision || '') || !REV.test(current.proofCommitSha || ''))
    return Object.freeze({ ...base, drift: true, status: 'HOLD_ANCESTRY_DRIFT_INPUT_INVALID' });

  const changed = [];
  if (previous.sourceRevision !== current.sourceRevision) changed.push('sourceRevision');
  if (previous.proofCommitSha !== current.proofCommitSha) changed.push('proofCommitSha');
  if (previous.sourceCiRunUrl !== current.sourceCiRunUrl) changed.push('sourceCiRunUrl');
  if (previous.proofSha256 !== current.proofSha256) changed.push('proofSha256');
  if (previous.ancestryVerified !== current.ancestryVerified) changed.push('ancestryVerified');

  return Object.freeze({
    ...base,
    drift: changed.length > 0,
    status: changed.length > 0
      ? 'HOLD_QL253_ANCESTRY_DRIFT_EXCEPTION'
      : 'QL253_ANCESTRY_STABLE_OWNER_TEST_AUTH_HELD',
    changedFields: Object.freeze(changed)
  });
}

export function intakeQl253OwnerTestDecision(input, now = Date.now()) {
  const base = {
    connectionState: 'DISCONNECTED',
    actualGatewayTest: 'NOT_RUN'
  };
  if (!input || !Number.isSafeInteger(now))
    return Object.freeze({ ...base, accepted: false, ownerAuthorization: 'NOT_GIVEN', status: 'HOLD_OWNER_TEST_DECISION_INPUT_INVALID' });

  const validDecision = ['NOT_GIVEN','REQUESTED_PRIVATE_REVIEW','INDEPENDENTLY_VERIFIED_BY_OWNER'].includes(input.decision);
  if (!validDecision)
    return Object.freeze({ ...base, accepted: false, ownerAuthorization: 'NOT_GIVEN', status: 'HOLD_OWNER_TEST_DECISION_INVALID' });

  if (input.decision !== 'INDEPENDENTLY_VERIFIED_BY_OWNER') {
    return Object.freeze({
      ...base,
      accepted: true,
      ownerAuthorization: input.decision,
      status: input.decision === 'REQUESTED_PRIVATE_REVIEW'
        ? 'OWNER_TEST_PRIVATE_REVIEW_REQUESTED_AUTH_REQUESTS_HELD'
        : 'OWNER_TEST_NOT_GIVEN_AUTH_REQUESTS_HELD'
    });
  }

  const pathsOk = Array.isArray(input.allowedPaths) &&
    JSON.stringify(input.allowedPaths) === JSON.stringify(QL246_PATHS);
  const methodsOk = Array.isArray(input.allowedMethods) &&
    JSON.stringify(input.allowedMethods) === JSON.stringify(QL246_METHODS);
  const timeOk = Number.isSafeInteger(input.windowStart) && Number.isSafeInteger(input.windowEnd) &&
    input.windowStart > now && input.windowEnd > input.windowStart &&
    input.windowEnd - input.windowStart <= 30 * 60 * 1000;
  const receiptOk = typeof input.ownerReceiptId === 'string' && input.ownerReceiptId.length >= 6;
  const scopeOk = input.environment === 'nonproduction' &&
    typeof input.businessId === 'string' && input.businessId.length > 0;

  if (!pathsOk || !methodsOk || !timeOk || !receiptOk || !scopeOk || input.identityVerifiedPrivately !== true)
    return Object.freeze({ ...base, accepted: false, ownerAuthorization: 'NOT_GIVEN', status: 'HOLD_OWNER_TEST_PRIVATE_VERIFICATION_INCOMPLETE' });

  return Object.freeze({
    ...base,
    accepted: true,
    ownerAuthorization: 'INDEPENDENTLY_VERIFIED_BY_OWNER',
    status: 'OWNER_TEST_DECISION_VERIFIED_REQUESTS_STILL_HELD_FOR_SEPARATE_EXECUTION',
    ownerReceiptId: input.ownerReceiptId,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd
  });
}


export function renewQl253RetryEvidence(input, now = Date.now()) {
  const base = Object.freeze({
    connectionState: 'DISCONNECTED',
    ownerAuthorization: 'NOT_GIVEN',
    actualGatewayTest: 'NOT_RUN'
  });
  if (!input || !Number.isSafeInteger(now))
    return Object.freeze({ ...base, renewed: false, status: 'HOLD_RETRY_EVIDENCE_RENEWAL_INPUT_INVALID' });

  const sourceOk = REV.test(input.sourceRevision || '');
  const proofOk = REV.test(input.proofCommitSha || '') && input.proofCommitSha !== input.sourceRevision;
  const digestOk = HEX.test(input.proofSha256 || '');
  const ciOk = typeof input.sourceCiRunUrl === 'string' &&
    /^https:\/\/github\.com\/RosevearCreations\/ai-data-platform\/actions\/runs\/[1-9][0-9]*$/.test(input.sourceCiRunUrl) &&
    input.sourceCiHeadSha === input.sourceRevision;
  const ancestryOk = input.ancestryVerified === true;
  const publicationOk = input.proofHttpStatus === 200;
  const freshnessOk = Number.isSafeInteger(input.verifiedAt) &&
    input.verifiedAt <= now && input.verifiedAt >= now - 60 * 60 * 1000;

  if (!sourceOk || !proofOk || !digestOk || !ciOk || !ancestryOk || !publicationOk || !freshnessOk)
    return Object.freeze({
      ...base,
      renewed: false,
      status: 'HOLD_RETRY_EVIDENCE_RENEWAL_INCOMPLETE'
    });

  return Object.freeze({
    ...base,
    renewed: true,
    status: 'QL253_RETRY_EVIDENCE_RENEWED_OWNER_TEST_AUTH_HELD',
    sourceRevision: input.sourceRevision,
    proofCommitSha: input.proofCommitSha,
    proofSha256: input.proofSha256,
    verifiedAt: input.verifiedAt
  });
}

export function ageQl253AncestryException(input, now = Date.now()) {
  const base = Object.freeze({
    connectionState: 'DISCONNECTED',
    ownerAuthorization: 'NOT_GIVEN',
    actualGatewayTest: 'NOT_RUN'
  });
  if (!input || !Number.isSafeInteger(now) || !Number.isSafeInteger(input.detectedAt))
    return Object.freeze({ ...base, active: true, status: 'HOLD_ANCESTRY_EXCEPTION_AGE_INVALID' });

  const ageMs = Math.max(0, now - input.detectedAt);
  if (input.resolved === true) {
    return Object.freeze({
      ...base,
      active: false,
      status: 'ANCESTRY_EXCEPTION_RESOLVED_OWNER_TEST_AUTH_HELD',
      ageMs
    });
  }

  return Object.freeze({
    ...base,
    active: true,
    status: ageMs >= 24 * 60 * 60 * 1000
      ? 'HOLD_ANCESTRY_EXCEPTION_OVERDUE'
      : 'HOLD_ANCESTRY_EXCEPTION_ACTIVE',
    ageMs
  });
}

export function continueQl253VerifiedOwnerTestDecision(previous, current, now = Date.now()) {
  const base = Object.freeze({
    connectionState: 'DISCONNECTED',
    actualGatewayTest: 'NOT_RUN'
  });
  if (!previous || !current || !Number.isSafeInteger(now))
    return Object.freeze({ ...base, continuous: false, ownerAuthorization: 'NOT_GIVEN', status: 'HOLD_OWNER_TEST_CONTINUITY_INPUT_INVALID' });

  const prevVerified = previous.ownerAuthorization === 'INDEPENDENTLY_VERIFIED_BY_OWNER' &&
    previous.identityVerifiedPrivately === true;
  const currentVerified = current.ownerAuthorization === 'INDEPENDENTLY_VERIFIED_BY_OWNER' &&
    current.identityVerifiedPrivately === true;
  const sameScope = previous.businessId === current.businessId &&
    previous.tenantId === current.tenantId &&
    previous.environment === 'nonproduction' && current.environment === 'nonproduction' &&
    JSON.stringify(previous.allowedMethods) === JSON.stringify(QL246_METHODS) &&
    JSON.stringify(current.allowedMethods) === JSON.stringify(QL246_METHODS) &&
    JSON.stringify(previous.allowedPaths) === JSON.stringify(QL246_PATHS) &&
    JSON.stringify(current.allowedPaths) === JSON.stringify(QL246_PATHS);
  const windowOk = Number.isSafeInteger(current.windowStart) && Number.isSafeInteger(current.windowEnd) &&
    current.windowStart > now && current.windowEnd > current.windowStart &&
    current.windowEnd - current.windowStart <= 30 * 60 * 1000;
  const receiptOk = typeof previous.ownerReceiptId === 'string' && previous.ownerReceiptId.length >= 6 &&
    typeof current.ownerReceiptId === 'string' && current.ownerReceiptId.length >= 6;

  if (!prevVerified || !currentVerified || !sameScope || !windowOk || !receiptOk)
    return Object.freeze({
      ...base,
      continuous: false,
      ownerAuthorization: 'NOT_GIVEN',
      status: 'HOLD_OWNER_TEST_CONTINUITY_REVERIFICATION_REQUIRED'
    });

  return Object.freeze({
    ...base,
    continuous: true,
    ownerAuthorization: 'INDEPENDENTLY_VERIFIED_BY_OWNER',
    status: 'OWNER_TEST_DECISION_CONTINUITY_VERIFIED_REQUEST_EXECUTION_HELD',
    ownerReceiptId: current.ownerReceiptId,
    windowStart: current.windowStart,
    windowEnd: current.windowEnd
  });
}

/** No network calls unless an explicit caller-provided public fetch implementation is supplied. */
export async function reviewQl246Sources(trusted, { fetchPublic, now = Date.now() } = {}) {
  if (!Number.isSafeInteger(now) || !validTrust(trusted, now))
    return held('DENIED_TRUSTED_MANIFEST', [], 'Out-of-band pins or challenge invalid, missing, stale, or incomplete.');
  if (typeof fetchPublic !== 'function')
    return held('HOLD_FETCH_NOT_AUTHORIZED', QL246_SYSTEMS.map(system => ({ system, status: 'NOT_RETRIEVED' })),
      'No public evidence was fetched. Explicit operator retrieval is required.');
  const rows = [];
  for (const row of trusted.sources) {
    const url = ql246RawUrl(row);
    let raw;
    try { raw = await fetchPublic(url); } catch { raw = null; }
    const reason = proofFor(row, trusted, raw, now);
    rows.push({ system: row.system, sourceRevision: row.sourceRevision,
      proofCommitSha: rowProofCommitSha(row),
      sourceCiRunUrl: trustedRowVersion(row) === 2 ? row.ciRunUrl : null,
      publicSourceUrl: url, status: reason === null ? 'VERIFIED_SIGNED_SOURCE_ONLY' : reason });
  }
  return held(rows.every(row => row.status === 'VERIFIED_SIGNED_SOURCE_ONLY')
    ? 'SIX_PUBLIC_SOURCES_VERIFIED_EXTERNAL_TESTS_PENDING_HELD'
    : 'HOLD_INCOMPLETE_OR_CONFLICTING_SOURCE_PROOF', rows,
  'Public commit-pinned signatures are source metadata, not authenticated gateway, audit durability, or owner consent.');
}

/** Fail closed against redirects, cookie forwarding, non-200s and oversized bodies. */
export async function retrieveQl246PublicSource(url, fetchImpl = fetch) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.host !== 'raw.githubusercontent.com' ||
    parsed.username || parsed.password || parsed.search || parsed.hash ||
    !/^\/RosevearCreations\/[A-Za-z0-9_.-]{1,90}\/[a-f0-9]{40}\/docs\/integration\/ql246-source-proof\.json$/.test(parsed.pathname))
    throw new Error('Source URL is not an immutable allowed public proof path.');
  const response = await fetchImpl(url, {
    method: 'GET', redirect: 'error', cache: 'no-store', credentials: 'omit',
    signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' }
  });
  if (response.status !== 200 || !/application\/json|text\/plain/i.test(response.headers.get('content-type') || ''))
    throw new Error('Public source returned an unexpected status or type.');
  if (Number(response.headers.get('content-length') || 0) > 16_384)
    throw new Error('Public source exceeds size limit.');
  if (!response.body || typeof response.body.getReader !== 'function')
    throw new Error('Public source response is not a bounded readable stream.');
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 16_384) throw new Error('Public source exceeds size limit.');
      chunks.push(Buffer.from(value));
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
}
