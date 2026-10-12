import {
  buildPublicationBridgePackage,
  publicationDeliveryAllowedFields,
  type PublicationBridgePublication,
  type PublicationDeliveryMapping
} from "../lib/publication-delivery-bridge";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const now = new Date("2026-10-12T14:00:00.000Z");
const publication: PublicationBridgePublication = {
  workspaceId: "11111111-1111-1111-1111-111111111111",
  workspaceName: "Rosie Dazzlers",
  role: "owner",
  publicationId: "22222222-2222-2222-2222-222222222222",
  title: "Approved competitive services",
  sourceUrl: "https://example.test/services",
  status: "published",
  publicationFingerprint: "pub1-abcdefghijklmnopqrstuvwxyz0123456789",
  rowCount: 2,
  fieldOrder: [
    "recordId",
    "competitorBusinessName",
    "offeringName",
    "priceMinimumCad",
    "sourceUrl",
    "retrievedAt"
  ],
  publishedRows: [
    {
      recordId: "alpha",
      competitorBusinessName: "Alpha Detail",
      offeringName: "Complete",
      priceMinimumCad: 199,
      sourceUrl: "https://example.test/alpha",
      retrievedAt: "2026-10-12T12:00:00.000Z"
    },
    {
      recordId: "beta",
      competitorBusinessName: "Beta Detail",
      offeringName: "Interior",
      priceMinimumCad: 175,
      sourceUrl: "https://example.test/beta",
      retrievedAt: "2026-10-12T12:05:00.000Z"
    }
  ],
  reviewApprovedAt: "2026-10-12T13:00:00.000Z",
  publishedAt: "2026-10-12T13:10:00.000Z"
};

const mapping: PublicationDeliveryMapping = {
  workspaceId: publication.workspaceId,
  workspaceName: publication.workspaceName,
  role: "owner",
  mappingId: "33333333-3333-3333-3333-333333333333",
  publicationId: publication.publicationId,
  target: "rosie-dazzlers",
  status: "active",
  integrationKeyField: "recordId",
  operationAction: "create",
  evidenceUrlField: "sourceUrl",
  evidenceTimestampField: "retrievedAt",
  fieldMap: {
    competitorBusinessName: "competitorBusinessName",
    offeringName: "offeringName",
    priceMinimumCad: "priceMinimumCad",
    sourceUrl: "sourceUrl",
    retrievedAt: "retrievedAt"
  },
  mappingFingerprint: "map1-abcdefghijklmnopqrstuvwxyz0123456789",
  createdBy: "owner",
  createdAt: "2026-10-12T13:20:00.000Z",
  retiredBy: null,
  retiredAt: null,
  retirementNote: "",
  canManage: true,
  readiness: { ready: true, blockers: [] }
};

const pkg = buildPublicationBridgePackage(publication, mapping, now);
assert(pkg.target === "rosie-dazzlers", "Build 050 target changed.");
assert(pkg.operations.length === 2, "Build 050 must map every frozen publication row.");
assert(
  pkg.batchId.includes(publication.publicationId) &&
    pkg.batchId.includes(publication.publicationFingerprint.slice(0, 24)) &&
    pkg.batchId.includes(mapping.mappingId) &&
    pkg.batchId.includes(mapping.mappingFingerprint.slice(0, 24)),
  "Build 050 package identity must bind publication and mapping fingerprints."
);
assert(
  pkg.operations[0].integrationKey === "rosie-competitor::alpha",
  "Build 050 integration key mapping failed."
);
assert(
  pkg.operations[0].values.priceMinimumCad === 199,
  "Build 050 mapped scalar value changed."
);
assert(
  pkg.operations[0].sourceEvidence.sourceUrl === "https://example.test/alpha" &&
    pkg.operations[0].sourceEvidence.retrievedAt === "2026-10-12T12:00:00.000Z",
  "Build 050 source evidence mapping failed."
);
assert(
  publicationDeliveryAllowedFields("rosie-dazzlers").includes("competitorBusinessName"),
  "Build 050 Rosie contract fields unavailable."
);
assert(
  publicationDeliveryAllowedFields("devil-n-dove").includes("supplierSku"),
  "Build 050 Devil n Dove contract fields unavailable."
);

let blocked = false;
try {
  buildPublicationBridgePackage({ ...publication, status: "withdrawn" }, mapping, now);
} catch {
  blocked = true;
}
assert(blocked, "Build 050 delivered a withdrawn publication.");

blocked = false;
try {
  buildPublicationBridgePackage(
    {
      ...publication,
      publishedRows: [
        publication.publishedRows[0],
        { ...publication.publishedRows[1], recordId: "alpha" }
      ]
    },
    mapping,
    now
  );
} catch {
  blocked = true;
}
assert(blocked, "Build 050 accepted duplicate integration keys.");

blocked = false;
try {
  buildPublicationBridgePackage(
    {
      ...publication,
      publishedRows: [
        { ...publication.publishedRows[0], priceMinimumCad: { bad: true } },
        publication.publishedRows[1]
      ]
    },
    mapping,
    now
  );
} catch {
  blocked = true;
}
assert(blocked, "Build 050 accepted a mapped non-scalar consumer value.");

blocked = false;
try {
  buildPublicationBridgePackage(
    {
      ...publication,
      publishedRows: [
        { ...publication.publishedRows[0], retrievedAt: "not-a-date" },
        publication.publishedRows[1]
      ]
    },
    mapping,
    now
  );
} catch {
  blocked = true;
}
assert(blocked, "Build 050 accepted invalid source-evidence timestamps.");

console.log(
  "Build 050 publication mapping, package identity, contract field, evidence and fail-closed verification passed."
);
