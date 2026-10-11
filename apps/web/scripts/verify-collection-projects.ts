import {
  aggregateProjectReadiness,
  deriveCollectionReadiness,
  normalizeCollectionOrigin,
  parseCollectionProjectDraft,
  parseCollectionSourceDraft
} from "../lib/collection-projects";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const project = parseCollectionProjectDraft({
  name: " Ontario detailer watch ",
  purpose: " Track public pricing changes ",
  status: "active",
  cadence: "monthly",
  ownerLabel: "Operations"
});
assert(project.name === "Ontario detailer watch", "Project names must normalize.");
assert(project.status === "active", "Known project status must survive.");

const source = parseCollectionSourceDraft({
  displayName: " Competitor pricing ",
  sourceUrl: "https://Example.com/services?q=1",
  collectionMethod: "public-webpage",
  sourcePolicyId: "policy-1",
  savedScraperId: "scraper-1",
  status: "planned"
});
assert(source.sourceOrigin === "https://example.com", "Source origin must normalize.");
assert(source.sourceUrl.startsWith("https://example.com/"), "Source URL must normalize.");

let invalidProtocol = false;
try {
  normalizeCollectionOrigin("javascript:alert(1)");
} catch {
  invalidProtocol = true;
}
assert(invalidProtocol, "Non-http collection sources must fail closed.");

const ready = deriveCollectionReadiness({
  lifecycleStatus: "active",
  policyLinked: true,
  policyApproved: true,
  policyCurrent: true,
  policyOriginMatches: true,
  policyMethodMatches: true,
  scraperRequested: true,
  scraperPresent: true,
  scraperOriginMatches: true
});
assert(ready.readiness === "ready" && ready.blockers.length === 0,
  "Fully governed linked sources must be ready.");

const blocked = deriveCollectionReadiness({
  lifecycleStatus: "planned",
  policyLinked: false,
  policyApproved: false,
  policyCurrent: false,
  policyOriginMatches: false,
  policyMethodMatches: false,
  scraperRequested: true,
  scraperPresent: false,
  scraperOriginMatches: false
});
assert(blocked.readiness === "blocked", "Missing policy/scraper evidence must block.");
assert(blocked.blockers.length >= 2, "Blocked sources must explain blockers.");
assert(
  aggregateProjectReadiness([{ readiness: "ready" }, { readiness: "blocked" }]) === "blocked",
  "Any blocked source must block project readiness."
);
assert(aggregateProjectReadiness([]) === "incomplete",
  "Projects without sources must remain incomplete.");

console.log("Build 045 collection-project parsing, URL safety and readiness rules passed.");

assert(
  aggregateProjectReadiness([{ readiness: "ready" }]) === "ready",
  "A project with only current ready sources must be ready."
);
