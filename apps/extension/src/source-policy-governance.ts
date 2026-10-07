import type {
  SourcePolicyEntry,
  SourcePolicyEvaluation
} from "./types";

export function normalizeSourcePolicyOrigin(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Enter a valid HTTP/HTTPS source URL or origin.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Source policy origins must use HTTP or HTTPS.");
  }

  return url.origin;
}

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function sourcePolicyFingerprint(
  policy: Omit<SourcePolicyEntry, "fingerprint">
) {
  const canonical = JSON.stringify({
    workspaceId: policy.workspaceId,
    origin: policy.origin,
    displayName: policy.displayName,
    purpose: policy.purpose,
    collectionMethod: policy.collectionMethod,
    publicOrAuthorized: policy.publicOrAuthorized,
    termsReviewed: policy.termsReviewed,
    termsUrl: policy.termsUrl,
    robotsDecision: policy.robotsDecision,
    robotsUrl: policy.robotsUrl,
    noAccessControlBypass: policy.noAccessControlBypass,
    dataSensitivity: policy.dataSensitivity,
    minimumDelayMs: policy.minimumDelayMs,
    maxPagesPerRun: policy.maxPagesPerRun,
    maxRecordsPerRun: policy.maxRecordsPerRun,
    reviewExpiresAt: policy.reviewExpiresAt,
    status: policy.status,
    notes: policy.notes,
    revision: policy.revision
  });
  return "sp1-" + hashText(canonical);
}

export function evaluateSourcePolicyEntry(
  policy: SourcePolicyEntry,
  at = new Date()
): SourcePolicyEvaluation {
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (policy.status !== "approved") {
    reasons.push(
      policy.status === "blocked"
        ? "This source policy is blocked."
        : "This source policy still requires review."
    );
  }
  if (!policy.publicOrAuthorized) {
    reasons.push("The source must be public or explicitly authorized.");
  }
  if (!policy.termsReviewed) {
    reasons.push("Applicable source terms must be reviewed.");
  }
  if (!policy.noAccessControlBypass) {
    reasons.push(
      "The collection plan must not require bypassing login, paywall, CAPTCHA or technical access controls."
    );
  }
  if (policy.dataSensitivity === "restricted") {
    reasons.push("Restricted/private data is not approved for crawler collection.");
  }

  if (policy.collectionMethod === "public-webpage") {
    if (policy.robotsDecision === "disallowed") {
      reasons.push("Robots/crawl directives disallow the intended public-webpage crawl.");
    } else if (policy.robotsDecision === "unknown") {
      reasons.push("Robots/crawl directives have not been resolved for this webpage source.");
    }
  }

  const expires = Date.parse(policy.reviewExpiresAt);
  if (!Number.isFinite(expires) || expires <= at.getTime()) {
    reasons.push("The source-policy review has expired.");
  }

  if (policy.minimumDelayMs < 500) {
    reasons.push("The minimum crawl delay must be at least 500 ms.");
  }
  if (policy.maxPagesPerRun < 1 || policy.maxPagesPerRun > 50) {
    reasons.push("The page budget must be between 1 and 50 pages per run.");
  }
  if (policy.maxRecordsPerRun < 1 || policy.maxRecordsPerRun > 5000) {
    reasons.push("The record budget must be between 1 and 5,000 records per run.");
  }

  if (
    policy.collectionMethod === "public-webpage" &&
    policy.robotsDecision === "not-applicable"
  ) {
    warnings.push(
      "Robots directives are marked not applicable for a webpage source; confirm that decision before high-volume use."
    );
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    warnings
  };
}
