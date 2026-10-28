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
