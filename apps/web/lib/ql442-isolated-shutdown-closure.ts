import { createHash, createPublicKey, verify } from "node:crypto";

/**
 * Build 389 / QL-442: evidence-only, fail-closed isolated receiver closeout.
 * This module does not call a receiver, persist records, or grant activation.
 */
export const BUILD_389 = 389 as const;
export const QL_442 = "rosevear.master.ql442.isolated-shutdown-closure.v1" as const;
const MASTER_IDS = ["rosevear-ai-hub", "rosevear-comms-hub", "ai-data-platform"] as const;
const ID = /^[a-zA-Z0-9_-]{12,96}$/;
const HEX = /^[a-f0-9]{64}$/;
const digest = (data: unknown) => createHash("sha256").update(JSON.stringify(data)).digest("hex");
const time = (value: unknown) => typeof value === "string" &&
  Number.isFinite(Date.parse(value)) && new Date(Date.parse(value)).toISOString() === value
    ? Date.parse(value) : NaN;
const recent = (value: unknown, now: number) =>
  Number.isSafeInteger(now) && Number.isFinite(time(value)) &&
  time(value) <= now && now - time(value) <= 120000;
const fields = (value: unknown, keys: readonly string[]): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));

export type SignedEvidence<T> = { payload: T; signature: string };
export type Ql441Summary = {
  state: "DURABLE_QL441_GO_WITNESSED_ON_REVIEW_ONLY" |
    "DURABLE_QL441_NO_GO_WITNESSED_ON_SHUTDOWN_REQUIRED";
  connection: "HOLD";
  activationAuthorized: false;
  receiver: "ON_WITNESSED_ISOLATED_LEASE_SHUTDOWN_REQUIRED";
  originalIncidentId: string;
  challengeId: string;
  leaseId: string;
  leaseExpiresAt: string;
  independentOnDigest: string;
  decisionReceiptDigest: string;
};
export type Ql441SourceProof = {
  schema: "rosevear.ql442.original-comms-ql441-source-proof.v1";
  incidentId: string;
  ql441Digest: string;
  ql441DecisionReceiptDigest: string;
  assertedState: "QL441_SIGNED_DECISION_EXISTS_NO_CURRENT_RECEIVER_ASSUMPTION";
  observedAt: string;
};
export type HostShutdown = {
  schema: "rosevear.ql442.original-host-signed-shutdown.v1";
  incidentId: string;
  challengeId: string;
  leaseId: string;
  hostMachineId: "DESKTOP-AE894KC";
  priorIndependentOnDigest: string;
  ql441DecisionReceiptDigest: string;
  receiverState: "OFF";
  watchdogArmed: true;
  shutdownSequence: number;
  shutdownAt: string;
};
export type IndependentOff = {
  schema: "rosevear.ql442.independent-receiver-off-readback.v1";
  incidentId: string;
  challengeId: string;
  leaseId: string;
  signedHostShutdownDigest: string;
  receiverState: "OFF";
  offSequence: number;
  observedAt: string;
};
export type MasterClosure = {
  schema: "rosevear.ql442.three-master-closure-attestation.v1";
  masterId: (typeof MASTER_IDS)[number];
  incidentId: string;
  hostShutdownDigest: string;
  independentOffDigest: string;
  leaseDisposition: "ON_TIME" | "EXPIRED_EXCEPTION";
  decision: "SIGNED_OFF_CLOSEOUT_REVIEW" | "SIGNED_LATE_OFF_KEEP_EXCEPTION_OPEN";
  reviewedAt: string;
};
export type DualOwnerReview = {
  schema: "rosevear.ql442.dual-owner-pilot-closure-review.v1";
  incidentId: string;
  ownerId: string;
  reviewerId: string;
  independentOffDigest: string;
  masterReportsDigest: string;
  decision: "CLOSE_ISOLATED_PILOT_ONLY_NO_ACTIVATION" |
    "ACKNOWLEDGE_LEASE_EXCEPTION_KEEP_OPEN";
  reviewedAt: string;
};
export type Ql442Pins = {
  commsSource: string;
  originalHost: string;
  independentReceiver: string;
  owner: string;
  reviewer: string;
  masters: Record<(typeof MASTER_IDS)[number], string>;
};
export type Ql442Inputs = {
  previous: Ql441Summary;
  sourceProof: SignedEvidence<Ql441SourceProof>;
  hostShutdown: SignedEvidence<HostShutdown>;
  independentOff: SignedEvidence<IndependentOff>;
  masterReports: readonly SignedEvidence<MasterClosure>[];
  ownerReview: {
    payload: DualOwnerReview;
    ownerSignature: string;
    reviewerSignature: string;
  };
  pins: Ql442Pins;
  independentlyVerifiedPins: boolean;
  trustedClockVerified: boolean;
  nowMs: number;
  previousProtectedCustodyVerified: boolean;
  incidentAlreadyClosed: boolean;
};
export type Ql442Decision = {
  schema: typeof QL_442;
  build: typeof BUILD_389;
  state: "HOLD" | "SIGNED_OFF_PILOT_CLOSURE_READY_FOR_DURABLE_ADMISSION" |
    "LATE_OFF_ATTESTED_LEASE_EXCEPTION_OPEN";
  reason: string;
  connection: "HOLD";
  activationAuthorized: false;
  physicalReceiverCurrentlyOff: false;
  manualIsolationAndIndependentOffRequired: boolean;
  masterCount: number;
  leaseExpired: boolean;
  evidenceDigest: string | null;
  permittedNextAction: string;
};

function holds(reason: string): Ql442Decision {
  return { schema: QL_442, build: BUILD_389, state: "HOLD", reason,
    connection: "HOLD", activationAuthorized: false,
    physicalReceiverCurrentlyOff: false,
    manualIsolationAndIndependentOffRequired: true, masterCount: 0,
    leaseExpired: false, evidenceDigest: null,
    permittedNextAction: "FRESH_SIGNED_SHUTDOWN_AND_INDEPENDENT_OFF_REQUIRED" };
}
function validSignature(payload: unknown, signature: string, pin: string) {
  try {
    if (typeof signature !== "string" ||
      !/^[A-Za-z0-9+/]{86}==$/.test(signature) ||
      typeof pin !== "string" || pin.length > 512) return false;
    const data = Buffer.from(pin, "base64");
    if (data.toString("base64") !== pin) return false;
    const publicKey = createPublicKey({ key: data, type: "spki", format: "der" });
    return publicKey.asymmetricKeyType === "ed25519" &&
      verify(null, Buffer.from(JSON.stringify(payload)), publicKey,
        Buffer.from(signature, "base64"));
  } catch { return false; }
}
function signedPayload<T>(entry: SignedEvidence<T>, keys: readonly string[], pin: string) {
  return fields(entry, ["payload", "signature"]) &&
    fields(entry.payload, keys) &&
    validSignature(entry.payload, entry.signature, pin);
}

const sourceFields = ["schema","incidentId","ql441Digest","ql441DecisionReceiptDigest","assertedState","observedAt"];
const hostFields = ["schema","incidentId","challengeId","leaseId","hostMachineId",
  "priorIndependentOnDigest","ql441DecisionReceiptDigest","receiverState",
  "watchdogArmed","shutdownSequence","shutdownAt"];
const offFields = ["schema","incidentId","challengeId","leaseId","signedHostShutdownDigest",
  "receiverState","offSequence","observedAt"];
const masterFields = ["schema","masterId","incidentId","hostShutdownDigest",
  "independentOffDigest","leaseDisposition","decision","reviewedAt"];
const ownerFields = ["schema","incidentId","ownerId","reviewerId",
  "independentOffDigest","masterReportsDigest","decision","reviewedAt"];

/** GO means closure evidence is suitable for protected admission; no external
 * DB row or real current OFF state is asserted until a separate authoritative
 * write/readback and fresh live observer verify it. */
export function evaluateQl442IsolatedShutdown(input: Ql442Inputs): Ql442Decision {
  const fail = holds;
  if (!input || !input.independentlyVerifiedPins || !input.trustedClockVerified ||
      !input.previousProtectedCustodyVerified ||
      !Number.isSafeInteger(input.nowMs) || input.incidentAlreadyClosed)
    return fail("PROTECTED_SOURCE_CLOCK_OR_ONE_USE_CUSTODY_REQUIRED");
  const p = input.previous;
  if (!p || !["DURABLE_QL441_GO_WITNESSED_ON_REVIEW_ONLY",
    "DURABLE_QL441_NO_GO_WITNESSED_ON_SHUTDOWN_REQUIRED"].includes(p.state) ||
    p.connection !== "HOLD" || p.activationAuthorized !== false ||
    p.receiver !== "ON_WITNESSED_ISOLATED_LEASE_SHUTDOWN_REQUIRED" ||
    ![p.originalIncidentId,p.challengeId,p.leaseId].every(x => ID.test(x ?? "")) ||
    ![p.independentOnDigest,p.decisionReceiptDigest].every(x => HEX.test(x ?? "")) ||
    !Number.isFinite(time(p.leaseExpiresAt)))
    return fail("EXACT_QL441_PROTECTED_INCIDENT_REQUIRED");
  const keys = [input.pins?.commsSource,input.pins?.originalHost,
    input.pins?.independentReceiver,input.pins?.owner,input.pins?.reviewer,
    ...MASTER_IDS.map(id => input.pins?.masters?.[id])];
  if (keys.some(x => typeof x !== "string" || !x) ||
    new Set(keys).size !== keys.length)
    return fail("INDEPENDENT_PINNED_SIGNER_SEPARATION_REQUIRED");
  const source = input.sourceProof;
  if (!signedPayload(source,sourceFields,input.pins.commsSource) ||
    source.payload.schema !== "rosevear.ql442.original-comms-ql441-source-proof.v1" ||
    source.payload.incidentId !== p.originalIncidentId ||
    source.payload.ql441Digest !== digest(p) ||
    source.payload.ql441DecisionReceiptDigest !== p.decisionReceiptDigest ||
    source.payload.assertedState !== "QL441_SIGNED_DECISION_EXISTS_NO_CURRENT_RECEIVER_ASSUMPTION" ||
    !recent(source.payload.observedAt,input.nowMs))
    return fail("ORIGINAL_QL441_SOURCE_SIGNATURE_INVALID");
  const host = input.hostShutdown;
  if (!signedPayload(host,hostFields,input.pins.originalHost) ||
    host.payload.schema !== "rosevear.ql442.original-host-signed-shutdown.v1" ||
    host.payload.hostMachineId !== "DESKTOP-AE894KC" ||
    host.payload.incidentId !== p.originalIncidentId ||
    host.payload.challengeId !== p.challengeId || host.payload.leaseId !== p.leaseId ||
    host.payload.priorIndependentOnDigest !== p.independentOnDigest ||
    host.payload.ql441DecisionReceiptDigest !== p.decisionReceiptDigest ||
    host.payload.receiverState !== "OFF" || host.payload.watchdogArmed !== true ||
    !Number.isSafeInteger(host.payload.shutdownSequence) ||
    host.payload.shutdownSequence < 1 ||
    !recent(host.payload.shutdownAt,input.nowMs) ||
    time(host.payload.shutdownAt) < time(source.payload.observedAt))
    return fail("ORIGINAL_HOST_SIGNED_SHUTDOWN_INVALID");
  const off = input.independentOff;
  if (!signedPayload(off,offFields,input.pins.independentReceiver) ||
    off.payload.schema !== "rosevear.ql442.independent-receiver-off-readback.v1" ||
    off.payload.incidentId !== p.originalIncidentId ||
    off.payload.challengeId !== p.challengeId || off.payload.leaseId !== p.leaseId ||
    off.payload.signedHostShutdownDigest !== digest(host.payload) ||
    off.payload.receiverState !== "OFF" ||
    !Number.isSafeInteger(off.payload.offSequence) ||
    off.payload.offSequence < host.payload.shutdownSequence ||
    !recent(off.payload.observedAt,input.nowMs) ||
    time(off.payload.observedAt) < time(host.payload.shutdownAt))
    return fail("INDEPENDENT_SIGNED_OFF_SEQUENCE_OR_CUSTODY_INVALID");
  const expired = time(host.payload.shutdownAt) > time(p.leaseExpiresAt) ||
    time(off.payload.observedAt) > time(p.leaseExpiresAt);
  if (!Array.isArray(input.masterReports) || input.masterReports.length !== 3)
    return fail("THREE_DISTINCT_MASTER_CLOSURE_REPORTS_REQUIRED");
  const seen = new Set<string>();
  const reports: MasterClosure[] = [];
  for (const envelope of input.masterReports) {
    const m = envelope?.payload;
    if (!m || !MASTER_IDS.some(id => id === m.masterId) ||
      seen.has(m.masterId) ||
      !signedPayload(envelope,masterFields,input.pins.masters[m.masterId]) ||
      m.schema !== "rosevear.ql442.three-master-closure-attestation.v1" ||
      m.incidentId !== p.originalIncidentId ||
      m.hostShutdownDigest !== digest(host.payload) ||
      m.independentOffDigest !== digest(off.payload) ||
      m.leaseDisposition !== (expired ? "EXPIRED_EXCEPTION":"ON_TIME") ||
      m.decision !== (expired ? "SIGNED_LATE_OFF_KEEP_EXCEPTION_OPEN":"SIGNED_OFF_CLOSEOUT_REVIEW") ||
      !recent(m.reviewedAt,input.nowMs) ||
      time(m.reviewedAt) < time(off.payload.observedAt))
      return fail("THREE_MASTER_SIGNED_SHUTDOWN_CLOSURE_REJECTED");
    seen.add(m.masterId);reports.push(m);
  }
  if (seen.size !== MASTER_IDS.length)
    return fail("THREE_MASTER_IDENTITY_COVERAGE_REQUIRED");
  const canonical = [...reports].sort((a,b) => MASTER_IDS.indexOf(a.masterId)-MASTER_IDS.indexOf(b.masterId));
  const reportsDigest = digest(canonical);
  const owner = input.ownerReview;
  const decision = expired ? "ACKNOWLEDGE_LEASE_EXCEPTION_KEEP_OPEN" :
    "CLOSE_ISOLATED_PILOT_ONLY_NO_ACTIVATION";
  if (!fields(owner,["payload","ownerSignature","reviewerSignature"]) ||
    !fields(owner.payload,ownerFields) ||
    owner.payload.schema !== "rosevear.ql442.dual-owner-pilot-closure-review.v1" ||
    owner.payload.incidentId !== p.originalIncidentId ||
    !ID.test(owner.payload.ownerId) || !ID.test(owner.payload.reviewerId) ||
    owner.payload.ownerId === owner.payload.reviewerId ||
    owner.payload.independentOffDigest !== digest(off.payload) ||
    owner.payload.masterReportsDigest !== reportsDigest ||
    owner.payload.decision !== decision ||
    !recent(owner.payload.reviewedAt,input.nowMs) ||
    time(owner.payload.reviewedAt) < Math.max(...reports.map(m => time(m.reviewedAt))) ||
    !validSignature(owner.payload,owner.ownerSignature,input.pins.owner) ||
    !validSignature(owner.payload,owner.reviewerSignature,input.pins.reviewer))
    return fail("DUAL_OWNER_SIGNED_CLOSEOUT_REJECTED");
  const evidenceDigest = digest({ ql441Digest:digest(p),sourceDigest:digest(source.payload),
    hostDigest:digest(host.payload),offDigest:digest(off.payload),
    masterReportsDigest:reportsDigest,ownerDigest:digest(owner.payload) });
  return {
    schema:QL_442,build:BUILD_389,
    state:expired ? "LATE_OFF_ATTESTED_LEASE_EXCEPTION_OPEN" :
      "SIGNED_OFF_PILOT_CLOSURE_READY_FOR_DURABLE_ADMISSION",
    reason:expired ? "LEASE_EXPIRED_SIGNED_EXCEPTION_MUST_REMAIN_OPEN" :
      "SIGNED_WITNESSES_ACCEPTED_PROTECTED_CUSTODY_WRITE_STILL_REQUIRED",
    connection:"HOLD",activationAuthorized:false,
    physicalReceiverCurrentlyOff:false,
    manualIsolationAndIndependentOffRequired:true,
    masterCount:3,leaseExpired:expired,evidenceDigest,
    permittedNextAction:expired ?
      "INDEPENDENT_LEASE_EXCEPTION_REMEDIATION_AND_OFF_CONTINUITY" :
      "DURABLE_PROTECTED_CLOSEOUT_ADMISSION_AND_FRESH_OFF_RECHECK"
  };
}
