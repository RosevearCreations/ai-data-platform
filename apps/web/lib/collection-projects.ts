export const COLLECTION_PROJECT_STATUSES = [
  "planning",
  "active",
  "paused",
  "complete",
  "archived"
] as const;

export const COLLECTION_SOURCE_STATUSES = [
  "planned",
  "active",
  "paused",
  "retired"
] as const;

export const COLLECTION_METHODS = [
  "official-api",
  "official-dataset",
  "user-export",
  "public-webpage"
] as const;

export type CollectionProjectStatus = (typeof COLLECTION_PROJECT_STATUSES)[number];
export type CollectionSourceStatus = (typeof COLLECTION_SOURCE_STATUSES)[number];
export type CollectionMethod = (typeof COLLECTION_METHODS)[number];
export type CollectionReadiness = "ready" | "blocked" | "incomplete";

function textValue(value: unknown, limit: number) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, limit)
    : "";
}

export function normalizeCollectionOrigin(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("collection_source_url_invalid");
    }
    return url.origin.toLowerCase();
  } catch {
    throw new Error("collection_source_url_invalid");
  }
}

export function normalizeCollectionUrl(value: unknown) {
  const raw = textValue(value, 1000);
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("collection_source_url_invalid");
    }
    return url.toString();
  } catch {
    throw new Error("collection_source_url_invalid");
  }
}

export function parseCollectionProjectDraft(value: unknown) {
  const input =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const name = textValue(input.name, 120);
  if (name.length < 2) throw new Error("collection_project_name_invalid");
  const rawStatus = textValue(input.status, 20);
  return {
    name,
    purpose: textValue(input.purpose, 1000),
    status: COLLECTION_PROJECT_STATUSES.includes(rawStatus as CollectionProjectStatus)
      ? (rawStatus as CollectionProjectStatus)
      : ("planning" as const),
    cadence: textValue(input.cadence, 120),
    ownerLabel: textValue(input.ownerLabel, 120),
    notes: textValue(input.notes, 2000)
  };
}

export function parseCollectionSourceDraft(value: unknown) {
  const input =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const displayName = textValue(input.displayName, 120);
  if (displayName.length < 2) throw new Error("collection_source_name_invalid");
  const sourceUrl = normalizeCollectionUrl(input.sourceUrl);
  const rawMethod = textValue(input.collectionMethod, 40);
  if (!COLLECTION_METHODS.includes(rawMethod as CollectionMethod)) {
    throw new Error("collection_method_invalid");
  }
  const rawStatus = textValue(input.status, 20);
  return {
    displayName,
    sourceUrl,
    sourceOrigin: normalizeCollectionOrigin(sourceUrl),
    collectionMethod: rawMethod as CollectionMethod,
    sourcePolicyId: textValue(input.sourcePolicyId, 160),
    savedScraperId: textValue(input.savedScraperId, 160),
    cadence: textValue(input.cadence, 120),
    status: COLLECTION_SOURCE_STATUSES.includes(rawStatus as CollectionSourceStatus)
      ? (rawStatus as CollectionSourceStatus)
      : ("planned" as const),
    notes: textValue(input.notes, 2000)
  };
}

export function deriveCollectionReadiness(input: {
  lifecycleStatus: CollectionSourceStatus;
  policyLinked: boolean;
  policyApproved: boolean;
  policyCurrent: boolean;
  policyOriginMatches: boolean;
  policyMethodMatches: boolean;
  scraperRequested: boolean;
  scraperPresent: boolean;
  scraperOriginMatches: boolean;
}) {
  const blockers: string[] = [];
  if (input.lifecycleStatus === "retired") {
    return { readiness: "incomplete" as const, blockers: ["Source is retired."] };
  }
  if (!input.policyLinked) blockers.push("Link an approved Source Policy.");
  if (input.policyLinked && !input.policyApproved) blockers.push("Linked Source Policy is not approved.");
  if (input.policyLinked && !input.policyCurrent) blockers.push("Linked Source Policy review is expired.");
  if (input.policyLinked && !input.policyOriginMatches) blockers.push("Source Policy origin does not match this source.");
  if (input.policyLinked && !input.policyMethodMatches) blockers.push("Source Policy collection method does not match.");
  if (input.scraperRequested && !input.scraperPresent) blockers.push("Linked scraper/template is missing or tombstoned.");
  if (input.scraperRequested && input.scraperPresent && !input.scraperOriginMatches) {
    blockers.push("Linked scraper/template origin does not match this source.");
  }
  if (blockers.length) return { readiness: "blocked" as const, blockers };
  return { readiness: "ready" as const, blockers: [] };
}

export function aggregateProjectReadiness(
  values: Array<{ readiness: CollectionReadiness }>
): CollectionReadiness {
  if (!values.length) return "incomplete";
  if (values.some((value) => value.readiness === "blocked")) return "blocked";
  if (values.some((value) => value.readiness === "incomplete")) return "incomplete";
  return "ready";
}
