import { createHash } from "node:crypto";

import {
  buildCrossAppDataContractRegistry,
  evaluateCrossAppDataContractCompatibility,
  getCrossAppDataContract,
  type CrossAppDataContract,
  type CrossAppFieldType
} from "./cross-app-data-contract-registry";
import {
  validateFieldMappingEntries,
  type FieldMappingEntry,
  type FieldMappingTransform
} from "./field-mapping-studio";
import {
  analyzeSchemaDrift,
  normalizeSourceSchemaFields,
  sourceSchemaFingerprint,
  type SchemaDriftAnalysis,
  type SourceSchemaField,
  type SourceSchemaFieldType
} from "./schema-drift-assistant";
import type { HostEnvironment } from "./universal-module-contract";

export const UNIVERSAL_DATA_CONTRACT_RESOLVER_VERSION = "1.0.0" as const;
export const HOST_SCHEMA_DESCRIPTOR_SCHEMA =
  "rosevear.ai-data-platform.host-schema-descriptor.v1" as const;
export const DATA_CONTRACT_RESOLUTION_SCHEMA =
  "rosevear.ai-data-platform.data-contract-resolution.v1" as const;

export type HostSchemaDescriptorInput = {
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  schemaId: string;
  schemaVersion: string;
  fields: unknown;
};

export type HostSchemaDescriptor = {
  schema: typeof HOST_SCHEMA_DESCRIPTOR_SCHEMA;
  version: typeof UNIVERSAL_DATA_CONTRACT_RESOLVER_VERSION;
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  schemaId: string;
  schemaVersion: string;
  fields: SourceSchemaField[];
  sourceFingerprint: string;
  evidenceFingerprint: string;
  discovery: {
    readOnly: true;
    rawRecordContentsRequired: false;
    rawRecordContentsIncluded: false;
    discoveryGrantsAuthorization: false;
    discoveryActivatesConnection: false;
  };
};

export type MappingSuggestion = {
  targetKey: string;
  sourcePath: string;
  transform: FieldMappingTransform;
  confidence: "deterministic" | "review-required";
  rationale: string;
  autoApproved: false;
};

export type RequiredFieldDiagnostic = {
  targetKey: string;
  targetType: CrossAppFieldType;
  mapped: boolean;
  suggestedSourcePath: string | null;
  blocking: boolean;
  detail: string;
};

export type DataContractResolutionInput = {
  descriptor: HostSchemaDescriptor;
  contractId: string;
  mappingEntries?: readonly FieldMappingEntry[];
  previous?: {
    canonicalFingerprint: string;
    sourceSchemaVersion: string | null;
    sourceSchemaFields: readonly SourceSchemaField[] | null;
  } | null;
};

export type DataContractResolution = {
  schema: typeof DATA_CONTRACT_RESOLUTION_SCHEMA;
  version: typeof UNIVERSAL_DATA_CONTRACT_RESOLVER_VERSION;
  hostSchema: {
    schemaId: string;
    schemaVersion: string;
    sourceFingerprint: string;
  };
  canonicalContract: {
    contractId: string;
    version: string;
    schemaId: string;
    schemaFingerprint: string;
  };
  compatibility: ReturnType<typeof evaluateCrossAppDataContractCompatibility>;
  mappingSuggestions: MappingSuggestion[];
  requiredFieldDiagnostics: RequiredFieldDiagnostic[];
  mappingValidation: ReturnType<typeof validateFieldMappingEntries>;
  drift: SchemaDriftAnalysis | null;
  security: {
    rawRecordsInspected: false;
    mappingSuggestionsAutoApproved: false;
    contractCompatibilityAuthorizesExchange: false;
    schemaDiscoveryGrantsAuthorization: false;
    liveExchangeAuthorized: false;
  };
};

export class UniversalDataContractResolverError extends Error {
  readonly code:
    | "host_schema_invalid"
    | "contract_unknown"
    | "mapping_invalid";

  constructor(
    code: UniversalDataContractResolverError["code"],
    message: string
  ) {
    super(message);
    this.name = "UniversalDataContractResolverError";
    this.code = code;
  }
}

const APP_ID = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const SCHEMA_ID = /^[A-Za-z0-9][A-Za-z0-9._:/#-]{0,239}$/;
const VERSION = /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/;

function normalizedLeaf(value: string) {
  return (
    value
      .split(".")
      .at(-1)
      ?.replace(/\[\d+\]$/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") ?? ""
  );
}

function compatible(
  source: SourceSchemaFieldType,
  target: CrossAppFieldType
) {
  if (source === "unknown" || source === "object") return false;
  if (source === target) return true;
  return (
    source === "string" &&
    ["string", "date-time", "number", "boolean"].includes(target)
  );
}

function suggestedTransform(
  source: SourceSchemaFieldType,
  target: CrossAppFieldType
): FieldMappingTransform {
  if (source === target) return "copy";
  if (source === "string" && target === "number") return "number";
  if (source === "string" && target === "boolean") return "boolean";
  if (source === "string" && target === "date-time") return "iso-date-time";
  return "copy";
}

function canonicalEvidenceFingerprint(input: {
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  schemaId: string;
  schemaVersion: string;
  sourceFingerprint: string;
}) {
  return createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
}

export function createHostSchemaDescriptor(
  input: HostSchemaDescriptorInput
): HostSchemaDescriptor {
  if (
    !APP_ID.test(input.hostApplicationId) ||
    !["development", "test", "staging", "production"].includes(
      input.hostEnvironment
    ) ||
    !SCHEMA_ID.test(input.schemaId) ||
    !VERSION.test(input.schemaVersion)
  ) {
    throw new UniversalDataContractResolverError(
      "host_schema_invalid",
      "Host schema identity, environment or version is invalid."
    );
  }

  const fields = normalizeSourceSchemaFields(input.fields);
  if (fields.length === 0) {
    throw new UniversalDataContractResolverError(
      "host_schema_invalid",
      "Host schema discovery requires at least one structural field descriptor."
    );
  }

  const fingerprint = sourceSchemaFingerprint(fields);
  const descriptor: HostSchemaDescriptor = {
    schema: HOST_SCHEMA_DESCRIPTOR_SCHEMA,
    version: UNIVERSAL_DATA_CONTRACT_RESOLVER_VERSION,
    hostApplicationId: input.hostApplicationId,
    hostEnvironment: input.hostEnvironment,
    schemaId: input.schemaId,
    schemaVersion: input.schemaVersion,
    fields,
    sourceFingerprint: fingerprint,
    evidenceFingerprint: canonicalEvidenceFingerprint({
      hostApplicationId: input.hostApplicationId,
      hostEnvironment: input.hostEnvironment,
      schemaId: input.schemaId,
      schemaVersion: input.schemaVersion,
      sourceFingerprint: fingerprint
    }),
    discovery: {
      readOnly: true,
      rawRecordContentsRequired: false,
      rawRecordContentsIncluded: false,
      discoveryGrantsAuthorization: false,
      discoveryActivatesConnection: false
    }
  };

  return Object.freeze(descriptor);
}

function suggestionsFor(
  descriptor: HostSchemaDescriptor,
  contract: CrossAppDataContract,
  existing: readonly FieldMappingEntry[]
) {
  const mappedTargets = new Set(existing.map((entry) => entry.targetKey));
  const usedSources = new Set(existing.map((entry) => entry.sourcePath));
  const suggestions: MappingSuggestion[] = [];

  for (const target of contract.fields) {
    if (mappedTargets.has(target.key)) continue;
    const targetLeaf = normalizedLeaf(target.key);
    const candidates = descriptor.fields.filter(
      (source) =>
        !usedSources.has(source.path) &&
        normalizedLeaf(source.path) === targetLeaf &&
        compatible(source.type, target.type)
    );

    if (candidates.length === 1) {
      const source = candidates[0];
      suggestions.push({
        targetKey: target.key,
        sourcePath: source.path,
        transform: suggestedTransform(source.type, target.type),
        confidence: "deterministic",
        rationale:
          "Unique normalized field-name match with compatible source/canonical types.",
        autoApproved: false
      });
      usedSources.add(source.path);
      continue;
    }

    const compatibleCandidates = descriptor.fields.filter(
      (source) =>
        !usedSources.has(source.path) && compatible(source.type, target.type)
    );
    if (target.required && compatibleCandidates.length === 1) {
      const source = compatibleCandidates[0];
      suggestions.push({
        targetKey: target.key,
        sourcePath: source.path,
        transform: suggestedTransform(source.type, target.type),
        confidence: "review-required",
        rationale:
          "Only one type-compatible source field exists for this required target; human review is still required.",
        autoApproved: false
      });
    }
  }

  return suggestions;
}

function requiredDiagnostics(
  contract: CrossAppDataContract,
  entries: readonly FieldMappingEntry[],
  suggestions: readonly MappingSuggestion[]
): RequiredFieldDiagnostic[] {
  const mapped = new Set(entries.map((entry) => entry.targetKey));
  const suggested = new Map(
    suggestions.map((item) => [item.targetKey, item.sourcePath])
  );

  return contract.fields
    .filter((field) => field.required)
    .map((field) => {
      const isMapped = mapped.has(field.key);
      const candidate = suggested.get(field.key) ?? null;
      return {
        targetKey: field.key,
        targetType: field.type,
        mapped: isMapped,
        suggestedSourcePath: candidate,
        blocking: !isMapped,
        detail: isMapped
          ? "Required canonical target is mapped."
          : candidate
            ? "Required canonical target is not mapped; a reviewable suggestion exists."
            : "Required canonical target is not mapped and no unique compatible suggestion exists."
      };
    });
}

export function resolveUniversalDataContract(
  input: DataContractResolutionInput
): DataContractResolution {
  const contract = getCrossAppDataContract(input.contractId);
  if (!contract) {
    throw new UniversalDataContractResolverError(
      "contract_unknown",
      "Unknown canonical contract."
    );
  }

  const entries = [...(input.mappingEntries ?? [])];
  let mappingValidation: ReturnType<typeof validateFieldMappingEntries>;
  try {
    mappingValidation = validateFieldMappingEntries(entries, contract);
  } catch {
    throw new UniversalDataContractResolverError(
      "mapping_invalid",
      "Mapping entries are invalid."
    );
  }

  const suggestions = suggestionsFor(input.descriptor, contract, entries);
  const diagnostics = requiredDiagnostics(contract, entries, suggestions);

  const compatibility = evaluateCrossAppDataContractCompatibility({
    contractId: contract.contractId,
    producerApplicationId: input.descriptor.hostApplicationId,
    consumerApplicationId: "ai-data-platform",
    producerVersion: contract.version,
    consumerVersion: contract.version,
    schemaId: contract.schemaId,
    schemaFingerprint: contract.schemaFingerprint
  });

  const drift = input.previous
    ? analyzeSchemaDrift({
        mappingEntries: entries,
        profileCanonicalFingerprint: input.previous.canonicalFingerprint,
        profileSourceSchemaVersion: input.previous.sourceSchemaVersion,
        profileSourceSchemaFields: input.previous.sourceSchemaFields,
        currentSourceSchemaVersion: input.descriptor.schemaVersion,
        currentSourceSchemaFields: input.descriptor.fields,
        currentContract: contract
      })
    : null;

  const resolution: DataContractResolution = {
    schema: DATA_CONTRACT_RESOLUTION_SCHEMA,
    version: UNIVERSAL_DATA_CONTRACT_RESOLVER_VERSION,
    hostSchema: {
      schemaId: input.descriptor.schemaId,
      schemaVersion: input.descriptor.schemaVersion,
      sourceFingerprint: input.descriptor.sourceFingerprint
    },
    canonicalContract: {
      contractId: contract.contractId,
      version: contract.version,
      schemaId: contract.schemaId,
      schemaFingerprint: contract.schemaFingerprint
    },
    compatibility,
    mappingSuggestions: suggestions,
    requiredFieldDiagnostics: diagnostics,
    mappingValidation,
    drift,
    security: {
      rawRecordsInspected: false,
      mappingSuggestionsAutoApproved: false,
      contractCompatibilityAuthorizesExchange: false,
      schemaDiscoveryGrantsAuthorization: false,
      liveExchangeAuthorized: false
    }
  };

  return Object.freeze(resolution);
}

export function buildReadOnlyHostSchemaDiscoveryCatalog() {
  const registry = buildCrossAppDataContractRegistry();
  return {
    schema: "rosevear.ai-data-platform.host-schema-discovery-catalog.v1",
    version: UNIVERSAL_DATA_CONTRACT_RESOLVER_VERSION,
    contracts: registry.contracts.map((contract) => ({
      contractId: contract.contractId,
      version: contract.version,
      schemaId: contract.schemaId,
      schemaFingerprint: contract.schemaFingerprint,
      requiredFields: contract.fields
        .filter((field) => field.required)
        .map((field) => ({
          key: field.key,
          type: field.type
        }))
    })),
    discovery: {
      rawRecordContentsRequired: false,
      readOnlyByDefault: true,
      mappingSuggestionsRequireReview: true,
      driftDetectionIntegrated: true,
      exchangeAuthorized: false
    }
  };
}
