/**
 * QL-253: public source origin / immutable proof retry eligibility and strictly
 * OFFLINE pin-renewal / TEST-only owner exception intake.
 * No gateway access, secret exchange, timers, tenant activation or approval.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { QL246_PATH, QL246_SYSTEMS } from './ql246-source-proof.mjs';

export const QL253_RELEASE = 'ql253-six-app-proof-origin-pin-renewal-owner-test-held-v1';
export const QL253_REPOSITORIES = Object.freeze([
  'ai-data-platform', 'devilndove-site', 'rosiedazzlers', 'yw', 'iCamp', 'rosevear-ai-hub'
]);
const SHA = /^[a-f0-9]{40}$/;
const HEX = /^[a-f0-9]{64}$/;
const ID = /^np-[a-z0-9-]{6,70}$/;
const NOT = 'NOT_AVAILABLE';
const ROW_FIELDS = ['system','repository','sourceShaA','sourceCiRunUrl','proofShaB',
  'proofRawSha256','publicSpkiSha256','custodyReceiptId','witnessReceiptId',
  'ownerTestDecision','actualGatewayTest','connectionState'];
const PIN_FIELDS = ['system','sourceShaA','proofShaB','presentedSpkiSha256',
  'independentPinSpkiSha256','challengeId','nonceBase64Url','custodianReceiptId',
  'independentWitnessReceiptId','channel','issuedAtMs','expiresAtMs'];
const sameKeys = (obj, keys) => obj !== null && typeof obj === 'object' &&
  !Array.isArray(obj) && [Object.prototype, null].includes(Object.getPrototypeOf(obj)) &&
  Object.keys(obj).length === keys.length && Object.keys(obj).every(k => keys.includes(k));
const eq = (a, b) => HEX.test(a || '') && HEX.test(b || '') &&
  timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
const held = (status, reason, other = {}) => Object.freeze({ release: QL253_RELEASE,
  status, reason, ...other, independentlyVerifiedPins: 0,
  ownerTestAuthorization: 'NOT_GIVEN', ownerPilotAuthorization: 'NOT_GIVEN',
  externalGatewayGets: 0, scheduledGetWindows: 0, connectionState: 'DISCONNECTED',
  phaseB: 'HELD', realPilotHolds: 12, writes: 0, calls: 0, sms: 0, dispatch: 0 });

function ciRun(row) {
  if (row.sourceCiRunUrl === NOT) return null;
  const url = `https://github.com/RosevearCreations/${row.repository}/actions/runs/`;
  return typeof row.sourceCiRunUrl === 'string' && row.sourceCiRunUrl.startsWith(url) &&
    /^[1-9][0-9]*$/.test(row.sourceCiRunUrl.slice(url.length))
    ? row.sourceCiRunUrl.slice(url.length) : false;
}
function inspectRow(row, index) {
  const system = QL246_SYSTEMS[index], repository = QL253_REPOSITORIES[index];
  if (!sameKeys(row, ROW_FIELDS) || row.system !== system ||
    row.repository !== `RosevearCreations/${repository}` ||
    !(row.sourceShaA === NOT || SHA.test(row.sourceShaA || '')) ||
    !(row.proofShaB === NOT || SHA.test(row.proofShaB || '')) ||
    !(row.proofRawSha256 === NOT || HEX.test(row.proofRawSha256 || '')) ||
    !(row.publicSpkiSha256 === NOT || HEX.test(row.publicSpkiSha256 || '')) ||
    ![row.custodyReceiptId, row.witnessReceiptId].every(x => x === NOT || ID.test(x || '')) ||
    ciRun({ ...row, repository }) === false ||
    row.ownerTestDecision !== 'NOT_GIVEN' || row.actualGatewayTest !== 'NOT_RUN' ||
    row.connectionState !== 'DISCONNECTED') return 'DENIED_SOURCE_RETURN_SCOPE';
  if (row.sourceShaA === NOT || ciRun({ ...row, repository }) === null)
    return 'SOURCE_OR_EXACT_GITHUB_ACTIONS_CI_PENDING_HELD';
  if (row.proofShaB === NOT || row.proofRawSha256 === NOT || row.publicSpkiSha256 === NOT)
    return 'SIGNED_PROOF_COMMIT_B_NOT_AVAILABLE_HELD';
  if (row.sourceShaA === row.proofShaB)
    return 'DENIED_SAME_SOURCE_AND_PROOF_COMMIT';
  return 'IMMUTABLE_PROOF_ORIGIN_RECHECK_CANDIDATE_PIN_PENDING_HELD';
}

/** Evaluate six owner-supplied non-secret claims, never substitute for GitHub verification. */
export function inspectQl253SixAppReturns(rows) {
  if (!Array.isArray(rows) || rows.length !== 6)
    return held('DENIED_SIX_APP_RETURN_COUNT', 'Exactly six ordered source returns required.');
  const mapped = rows.map((r, i) => ({
    system: QL246_SYSTEMS[i], repository: QL253_REPOSITORIES[i],
    sourceShaA: r?.sourceShaA ?? null, proofShaB: r?.proofShaB ?? null,
    status: inspectRow(r, i)
  }));
  return held(mapped.some(r => r.status.startsWith('DENIED'))
    ? 'DENIED_SIX_APP_ORIGIN_SCOPE' : 'SIX_APP_SOURCE_RETURN_GAPS_HELD',
  'Self-reported A/B or CI metadata does not prove signed origin, independent key custody or owner consent.',
  { rows: Object.freeze(mapped), proofCandidates: mapped.filter(r =>
      r.status === 'IMMUTABLE_PROOF_ORIGIN_RECHECK_CANDIDATE_PIN_PENDING_HELD').length });
}

/** Public GitHub-only origin set for a *candidate* proof; URLs cannot target gateways. */
export function ql253OriginUrls(row) {
  const index = QL246_SYSTEMS.indexOf(row?.system);
  if (index < 0 || inspectRow(row, index) !==
    'IMMUTABLE_PROOF_ORIGIN_RECHECK_CANDIDATE_PIN_PENDING_HELD')
    throw new TypeError('DENIED_INCOMPLETE_PROOF_ORIGIN');
  const repository = QL253_REPOSITORIES[index];
  const base = `https://api.github.com/repos/RosevearCreations/${repository}`;
  return Object.freeze({
    source: `${base}/git/commits/${row.sourceShaA}`,
    proof: `https://raw.githubusercontent.com/RosevearCreations/${repository}/${row.proofShaB}/${QL246_PATH}`,
    ancestry: `${base}/compare/${row.sourceShaA}...${row.proofShaB}`,
    ci: `${base}/actions/runs/${ciRun({ ...row, repository })}`
  });
}

/** Caller-supplied, PUBLIC-only fetch; source/CI, ancestry and raw bytes must all match. */
export async function inspectQl253OriginChain(row, publicGet) {
  let urls;
  try { urls = ql253OriginUrls(row); } catch {
    return held('PROOF_PUBLICATION_OR_CI_GAP_HELD', 'Missing distinct source A, proof B, digest or source CI.');
  }
  if (typeof publicGet !== 'function')
    return held('PUBLIC_GITHUB_RECHECK_NOT_RUN_HELD', 'Public GitHub GET was not requested.');
  try {
    const [source, proof, ancestry, ci] = await Promise.all([
      publicGet(urls.source), publicGet(urls.proof), publicGet(urls.ancestry), publicGet(urls.ci)
    ]);
    if (![source, proof, ancestry, ci].every(x => x?.status === 200))
      return held('PUBLIC_PROOF_OR_GITHUB_ORIGIN_MISSING_HELD', 'A public GitHub source/proof/CI request did not return 200.');
    if (typeof proof.body !== 'string' || Buffer.byteLength(proof.body) > 16_384 ||
      !eq(createHash('sha256').update(proof.body).digest('hex'), row.proofRawSha256))
      return held('PUBLIC_PROOF_RAW_DIGEST_INVALID_HELD', 'Exact immutable proof bytes differ from source claim.');
    const src = JSON.parse(source.body), comparison = JSON.parse(ancestry.body),
      run = JSON.parse(ci.body), envelope = JSON.parse(proof.body);
    if (src.sha !== row.sourceShaA || comparison.status !== 'ahead' ||
      comparison.merge_base_commit?.sha !== row.sourceShaA ||
      !Number.isInteger(comparison.ahead_by) || comparison.ahead_by < 1 ||
      comparison.behind_by !== 0 || run.id !== Number(ciRun({ ...row,
        repository: QL253_REPOSITORIES[QL246_SYSTEMS.indexOf(row.system)] })) ||
      run.head_sha !== row.sourceShaA || run.status !== 'completed' ||
      run.conclusion !== 'success' ||
      run.repository?.full_name !== row.repository ||
      envelope?.payload?.source_revision !== row.sourceShaA ||
      envelope?.payload?.ci_run_url !== row.sourceCiRunUrl ||
      envelope?.payload?.source_system !== row.system ||
      envelope?.payload?.repository !== row.repository)
      return held('PUBLIC_ORIGIN_SOURCE_CI_ANCESTRY_DRIFT_HELD', 'Source, proof ancestry, embedded claims or exact CI mismatch.');
    return held('PUBLIC_SOURCE_ORIGIN_METADATA_MATCHED_SIGNATURE_PIN_NOT_TRUSTED_HELD',
      'Only public GitHub origin metadata matched. Cryptographic proof and out-of-band signer identity still need independent verification.');
  } catch {
    return held('PUBLIC_GITHUB_RECHECK_FAILED_HELD', 'Malformed, oversized or unavailable public GitHub source chain.');
  }
}

/** Offline key-control *claim* freshness; a receipt ID cannot certify its own provenance. */
export function inspectQl253PinRenewal(packet, { now = Date.now(), usedIds = [] } = {}) {
  if (!sameKeys(packet, PIN_FIELDS) || !Number.isSafeInteger(now) || !Array.isArray(usedIds) ||
    !QL246_SYSTEMS.includes(packet.system) || !SHA.test(packet.sourceShaA || '') ||
    !SHA.test(packet.proofShaB || '') || packet.sourceShaA === packet.proofShaB ||
    !eq(packet.presentedSpkiSha256, packet.independentPinSpkiSha256) ||
    !ID.test(packet.challengeId || '') || !ID.test(packet.custodianReceiptId || '') ||
    !ID.test(packet.independentWitnessReceiptId || '') ||
    packet.custodianReceiptId === packet.independentWitnessReceiptId ||
    !['VERIFIED_CALLBACK_RECORD', 'PRIVATE_TRUST_REGISTRY', 'IN_PERSON_CUSTODY_REVIEW'].includes(packet.channel) ||
    typeof packet.nonceBase64Url !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(packet.nonceBase64Url) ||
    Buffer.from(packet.nonceBase64Url, 'base64url').length !== 32 ||
    !Number.isSafeInteger(packet.issuedAtMs) || !Number.isSafeInteger(packet.expiresAtMs) ||
    packet.issuedAtMs > now + 30_000 || packet.expiresAtMs <= now ||
    packet.expiresAtMs - packet.issuedAtMs > 300_000 ||
    usedIds.includes(packet.challengeId))
    return held('DENIED_PIN_RENEWAL_SCOPE_OR_REPLAY', 'Pin custody challenge stale, reused, mismatched or untrusted.');
  return held('PIN_RENEWAL_METADATA_MATCHED_REAL_CUSTODY_ATTESTATION_HELD',
    'A non-secret receipt and matching pin alone do not authenticate an independent human custodian.');
}

/** Never accepts a document as real approval to run a nonproduction GET. */
export function inspectQl253OwnerTestReview(record) {
  const fields = ['system','decision','environment','methods','paths','startUtc','endUtc','ownerReceiptId'];
  if (!sameKeys(record, fields) || !QL246_SYSTEMS.includes(record.system) ||
    record.environment !== 'nonproduction' || JSON.stringify(record.methods) !== '["GET"]' ||
    JSON.stringify(record.paths) !== '["/api/integration/v1/health","/api/integration/v1/capabilities"]' ||
    !['NOT_GIVEN', 'PRIVATE_REVIEW_REQUESTED'].includes(record.decision) ||
    record.ownerReceiptId !== NOT || typeof record.startUtc !== 'string' ||
    typeof record.endUtc !== 'string' ||
    Number.isNaN(Date.parse(record.startUtc)) || Number.isNaN(Date.parse(record.endUtc)) ||
    Date.parse(record.endUtc) - Date.parse(record.startUtc) > 1_800_000 ||
    Date.parse(record.endUtc) <= Date.parse(record.startUtc))
    return held('DENIED_OWNER_TEST_SCOPE', 'No public receipt may self-approve or expand GET-only scope.');
  return held('OWNER_TEST_ONLY_PRIVATE_AUTHORIZATION_STILL_HELD',
    'No authenticated owner decision was given; do not start a gateway GET or pilot.');
}
