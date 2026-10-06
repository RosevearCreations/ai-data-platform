import type {
  OntarioCompetitorChange,
  OntarioCompetitorFieldChange,
  OntarioCompetitorOffering,
  OntarioCompetitorSeries,
  OntarioDatasetCaptureSummary,
  OntarioDetailingDeliveryMode,
  OntarioDetailingOfferingKind,
  OntarioPriceObservation,
  OntarioServiceAreaObservation,
  OntarioVehicleSize,
  RosieCompetitiveMapping
} from "./types";

export interface RosieCompetitiveRow {
  sourceIndex: number;
  values: Record<string, string | number | null>;
}

export interface NormalizeRosieCompetitiveInput {
  sourceUrl: string;
  retrievedAt: string;
  mapping: RosieCompetitiveMapping;
  rows: RosieCompetitiveRow[];
}

const MAX_CAPTURE_ROWS = 300;
const MAX_PACKAGE_CONTENT_ITEMS = 12;
const MAX_PACKAGE_CONTENT_LENGTH = 80;

function nextId(prefix: string) {
  return (
    prefix +
    "-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 9)
  );
}

function stringValue(value: string | number | null | undefined) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function sourceOrigin(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

export function competitiveSourceScope(url: string) {
  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname.replace(/\/+$/, "");
  } catch {
    return url.split(/[?#]/, 1)[0] ?? "";
  }
}

function fallbackBusinessName(url: string) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const first = hostname.split(".")[0] ?? "Ontario detailer";
    return first
      .split(/[-_]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  } catch {
    return "Ontario detailer";
  }
}

function parseNumbers(text: string) {
  const matches = text.match(/\d[\d,]*(?:\.\d{1,2})?/g) ?? [];
  return matches
    .map((value) => Number(value.replace(/,/g, "")))
    .filter((value) => Number.isFinite(value));
}

export function normalizeOntarioPrice(rawValue: string): OntarioPriceObservation {
  const raw = rawValue.trim();
  const numbers = parseNumbers(raw);
  const startingAt = /\b(from|starting\s+at|starts?\s+at|as\s+low\s+as)\b/i.test(raw);

  return {
    raw,
    currency: "CAD",
    minimum: numbers[0] ?? null,
    maximum: numbers.length > 1 ? numbers[1] : numbers[0] ?? null,
    startingAt
  };
}

function normalizeVehicleSize(raw: string): OntarioVehicleSize {
  const value = raw.toLowerCase();

  if (!value) return "unknown";
  if (/\b(all|any|universal|one\s*size)\b/.test(value)) return "universal";
  if (/\b(oversize|oversized|extra[-\s]?large|xl|xxl)\b/.test(value)) return "oversize";
  if (/\b(large|full[-\s]?size|suv|truck|van|minivan)\b/.test(value)) return "large";
  if (/\b(medium|mid[-\s]?size|midsize)\b/.test(value)) return "medium";
  if (/\b(small|compact|coupe|sedan|hatchback)\b/.test(value)) return "small";
  return "unknown";
}

function normalizeDeliveryMode(raw: string): OntarioDetailingDeliveryMode {
  const value = raw.toLowerCase();
  const mobile = /\b(mobile|we\s+come|at\s+your|on[-\s]?site|onsite)\b/.test(value);
  const fixed = /\b(shop|studio|location|drop[-\s]?off|garage|bay)\b/.test(value);

  if (mobile && fixed) return "both";
  if (mobile) return "mobile";
  if (fixed) return "fixed-location";
  return "unknown";
}

function normalizeOfferingKind(
  raw: string,
  offeringName: string
): OntarioDetailingOfferingKind {
  const value = (raw + " " + offeringName).toLowerCase();

  if (/\b(add[-\s]?on|optional|extra)\b/.test(value)) return "addon";
  if (/\b(promo|promotion|special|discount|sale)\b/.test(value)) return "promotion";
  if (/\b(package|bundle|tier|plan)\b/.test(value)) return "package";
  if (offeringName.trim()) return "service";
  return "unknown";
}

function normalizeCategory(offeringName: string, contents: string[]) {
  const value = [offeringName, ...contents].join(" ").toLowerCase();

  const rules: Array<[RegExp, string]> = [
    [/\b(full|complete|inside\s+and\s+out|interior\s+and\s+exterior)\b/, "complete-detail"],
    [/\b(ceramic|graphene|coating|sealant|wax|protection)\b/, "paint-protection"],
    [/\b(paint\s*correction|polish|compound|swirl)\b/, "paint-correction"],
    [/\b(interior|carpet|seat|upholstery|leather|steam)\b/, "interior"],
    [/\b(exterior|wash|foam|wheel|tire|decon|clay)\b/, "exterior"],
    [/\b(headlight)\b/, "headlight-restoration"],
    [/\b(engine)\b/, "engine-bay"],
    [/\b(odor|ozone|deodor)\b/, "odor-removal"],
    [/\b(pet\s*hair)\b/, "pet-hair"],
    [/\b(tint)\b/, "window-tint"],
    [/\b(vinyl|wrap)\b/, "vinyl"],
    [/\b(maintenance)\b/, "maintenance"]
  ];

  for (const [pattern, category] of rules) {
    if (pattern.test(value)) {
      return category;
    }
  }

  return "other";
}

function normalizePackageContents(raw: string) {
  const value = raw.toLowerCase();
  const rules: Array<[RegExp, string]> = [
    [/\b(hand\s*wash|exterior\s*wash|foam\s*wash|snow\s*foam)\b/, "exterior-wash"],
    [/\b(wheel|rim)\b/, "wheel-cleaning"],
    [/\b(tire\s*dress|tire\s*shine)\b/, "tire-dressing"],
    [/\b(vacuum)\b/, "vacuum"],
    [/\b(carpet|mat)\b/, "carpet-cleaning"],
    [/\b(upholstery|cloth\s*seat)\b/, "upholstery-cleaning"],
    [/\b(leather)\b/, "leather-care"],
    [/\b(glass|window)\b/, "glass-cleaning"],
    [/\b(dashboard|dash|console|interior\s*wipe)\b/, "interior-surface-cleaning"],
    [/\b(clay\s*bar|clay\s*treatment)\b/, "clay-bar"],
    [/\b(iron\s*remov|decontamin)\b/, "paint-decontamination"],
    [/\b(wax)\b/, "wax"],
    [/\b(sealant|paint\s*seal)\b/, "paint-sealant"],
    [/\b(ceramic)\b/, "ceramic-coating"],
    [/\b(graphene)\b/, "graphene-protection"],
    [/\b(polish|compound|paint\s*correction)\b/, "paint-correction"],
    [/\b(engine)\b/, "engine-bay"],
    [/\b(headlight)\b/, "headlight-restoration"],
    [/\b(ozone|odor|deodor)\b/, "odor-removal"],
    [/\b(pet\s*hair)\b/, "pet-hair-removal"],
    [/\b(steam)\b/, "steam-cleaning"]
  ];

  return rules
    .filter(([pattern]) => pattern.test(value))
    .map(([, label]) => label)
    .slice(0, MAX_PACKAGE_CONTENT_ITEMS)
    .map((label) => label.slice(0, MAX_PACKAGE_CONTENT_LENGTH));
}

function splitLocations(raw: string) {
  if (!raw.trim()) {
    return [];
  }

  return Array.from(
    new Set(
      raw
        .replace(/\bOntario\b/gi, "")
        .split(/[\n\r•|;/]+|,\s*/)
        .map((item) => item.replace(/\s+/g, " ").trim())
        .filter((item) => item.length > 1)
        .map((item) => item.slice(0, 80))
    )
  ).slice(0, 30);
}

function normalizeServiceArea(rawValue: string): OntarioServiceAreaObservation {
  const raw = rawValue.trim();

  return {
    raw,
    province: "ON",
    locations: splitLocations(raw)
  };
}

function valueFor(
  row: RosieCompetitiveRow,
  key: string
) {
  return key ? stringValue(row.values[key]) : "";
}

function stableBusinessKey(sourceUrl: string, businessName: string) {
  const origin = sourceOrigin(sourceUrl) || "unknown-source";
  return origin + "::" + (slug(businessName) || "detailer");
}

function stableOfferingKey(
  businessKey: string,
  offeringKind: OntarioDetailingOfferingKind,
  offeringName: string,
  vehicleSize: OntarioVehicleSize
) {
  return [
    businessKey,
    offeringKind,
    slug(offeringName) || "unnamed",
    vehicleSize
  ].join("::");
}

export function normalizeRosieCompetitiveRows(
  input: NormalizeRosieCompetitiveInput
): OntarioCompetitorOffering[] {
  if (!input.mapping.offeringNameKey) {
    throw new Error("Choose the service or package name field before saving the Ontario dataset.");
  }

  if (!input.rows.length) {
    throw new Error("The Ontario dataset needs at least one included reviewed row.");
  }

  if (input.rows.length > MAX_CAPTURE_ROWS) {
    throw new Error(
      "Competitive-intelligence capture is capped at " +
        MAX_CAPTURE_ROWS +
        " included rows at a time."
    );
  }

  const sourceScope = competitiveSourceScope(input.sourceUrl);
  const fallbackName = fallbackBusinessName(input.sourceUrl);
  const offerings: OntarioCompetitorOffering[] = [];

  for (const row of input.rows) {
    const businessName =
      valueFor(row, input.mapping.businessNameKey) || fallbackName;
    const offeringName = valueFor(row, input.mapping.offeringNameKey);

    if (!offeringName) {
      continue;
    }

    const contents = normalizePackageContents(
      valueFor(row, input.mapping.packageContentsKey)
    );
    const offeringKind = normalizeOfferingKind(
      valueFor(row, input.mapping.offeringKindKey),
      offeringName
    );
    const vehicleSize = normalizeVehicleSize(
      valueFor(row, input.mapping.vehicleSizeKey)
    );
    const businessKey = stableBusinessKey(input.sourceUrl, businessName);

    offerings.push({
      id: nextId("offering"),
      businessKey,
      businessName,
      sourceUrl: input.sourceUrl,
      sourceScope,
      sourceIndex: row.sourceIndex,
      retrievedAt: input.retrievedAt,
      offeringKey: stableOfferingKey(
        businessKey,
        offeringKind,
        offeringName,
        vehicleSize
      ),
      offeringName,
      offeringKind,
      category: normalizeCategory(offeringName, contents),
      price: normalizeOntarioPrice(valueFor(row, input.mapping.priceKey)),
      packageContents: contents,
      vehicleSize,
      serviceArea: normalizeServiceArea(
        valueFor(row, input.mapping.serviceAreaKey)
      ),
      deliveryMode: normalizeDeliveryMode(
        valueFor(row, input.mapping.deliveryModeKey)
      )
    });
  }

  if (!offerings.length) {
    throw new Error(
      "No included row has a value in the mapped service or package name field."
    );
  }

  return offerings;
}

function stringifyComparable(value: unknown) {
  if (Array.isArray(value)) {
    return value.join(" | ");
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  return value === null || value === undefined ? "" : String(value);
}

function changedFields(
  before: OntarioCompetitorOffering,
  after: OntarioCompetitorOffering
): OntarioCompetitorFieldChange[] {
  const fields: Array<keyof OntarioCompetitorOffering> = [
    "offeringName",
    "offeringKind",
    "category",
    "price",
    "packageContents",
    "vehicleSize",
    "serviceArea",
    "deliveryMode"
  ];

  return fields.flatMap((field) => {
    const previous = stringifyComparable(before[field]);
    const current = stringifyComparable(after[field]);

    return previous === current
      ? []
      : [{ field: String(field), before: previous, after: current }];
  });
}

function snapshotMap(offerings: OntarioCompetitorOffering[]) {
  return new Map(offerings.map((offering) => [offering.offeringKey, offering]));
}

export function updateCompetitorSeries(
  current: OntarioCompetitorSeries | null,
  offerings: OntarioCompetitorOffering[],
  capturedAt: string
): {
  series: OntarioCompetitorSeries;
  added: number;
  removed: number;
  changed: number;
} {
  if (!offerings.length) {
    throw new Error("A competitor snapshot cannot be empty.");
  }

  const first = offerings[0];
  const nextVersion = (current?.latestVersion ?? 0) + 1;
  const snapshot = {
    version: 1 as const,
    id: nextId("ontario-snapshot"),
    snapshotVersion: nextVersion,
    capturedAt,
    businessKey: first.businessKey,
    businessName: first.businessName,
    sourceUrl: first.sourceUrl,
    sourceScope: first.sourceScope,
    offerings: offerings.map((offering) => ({ ...offering }))
  };
  const previous =
    current?.snapshots[current.snapshots.length - 1] ?? null;
  const beforeMap = previous ? snapshotMap(previous.offerings) : new Map();
  const afterMap = snapshotMap(snapshot.offerings);
  const changes: OntarioCompetitorChange[] = [];
  let added = 0;
  let removed = 0;
  let changed = 0;

  if (previous) {
    for (const [key, after] of afterMap) {
      const before = beforeMap.get(key);

      if (!before) {
        added += 1;
        changes.push({
          id: nextId("competitor-change"),
          kind: "added",
          detectedAt: capturedAt,
          businessKey: after.businessKey,
          businessName: after.businessName,
          sourceScope: after.sourceScope,
          offeringKey: after.offeringKey,
          offeringName: after.offeringName,
          fromVersion: previous.snapshotVersion,
          toVersion: nextVersion,
          fields: []
        });
        continue;
      }

      const fields = changedFields(before, after);
      if (fields.length) {
        changed += 1;
        changes.push({
          id: nextId("competitor-change"),
          kind: "changed",
          detectedAt: capturedAt,
          businessKey: after.businessKey,
          businessName: after.businessName,
          sourceScope: after.sourceScope,
          offeringKey: after.offeringKey,
          offeringName: after.offeringName,
          fromVersion: previous.snapshotVersion,
          toVersion: nextVersion,
          fields
        });
      }
    }

    for (const [key, before] of beforeMap) {
      if (!afterMap.has(key)) {
        removed += 1;
        changes.push({
          id: nextId("competitor-change"),
          kind: "removed",
          detectedAt: capturedAt,
          businessKey: before.businessKey,
          businessName: before.businessName,
          sourceScope: before.sourceScope,
          offeringKey: before.offeringKey,
          offeringName: before.offeringName,
          fromVersion: previous.snapshotVersion,
          toVersion: nextVersion,
          fields: []
        });
      }
    }
  }

  const createdAt = current?.createdAt ?? capturedAt;
  const seriesKey =
    first.sourceScope + "::" + first.businessKey;
  const series: OntarioCompetitorSeries = {
    version: 1,
    id: current?.id ?? nextId("ontario-series"),
    seriesKey,
    businessKey: first.businessKey,
    businessName: first.businessName,
    sourceUrl: first.sourceUrl,
    sourceScope: first.sourceScope,
    createdAt,
    updatedAt: capturedAt,
    latestVersion: nextVersion,
    snapshots: [...(current?.snapshots ?? []), snapshot].slice(-12),
    changes: [...(current?.changes ?? []), ...changes].slice(-500)
  };

  return { series, added, removed, changed };
}

export function buildCaptureSummary(
  seriesUpdated: number,
  snapshotsCaptured: number,
  offeringsCaptured: number,
  businessCount: number,
  added: number,
  removed: number,
  changed: number
): OntarioDatasetCaptureSummary {
  return {
    businessCount,
    seriesUpdated,
    snapshotsCaptured,
    offeringsCaptured,
    added,
    removed,
    changed
  };
}
