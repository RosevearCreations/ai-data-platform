import { createHash } from "node:crypto";

import type {
  CrossAppDataContract,
  CrossAppFieldType
} from "./cross-app-data-contract-registry";
import type {
  FieldMappingEntry,
  FieldMappingTransform
} from "./field-mapping-studio";

export type SourceSchemaFieldType =
  | CrossAppFieldType
  | "object"
  | "unknown";

export type SourceSchemaField = {
  path: string;
  type: SourceSchemaFieldType;
  required: boolean;
  enumValues: string[];
};

export type SchemaFieldSnapshot = {
  path: string;
  type: SourceSchemaFieldType;
  required: boolean;
  enumValues: string[];
};

export type SchemaDriftChangeKind =
  | "added"
  | "removed"
  | "type-changed"
  | "required-changed"
  | "enum-changed"
  | "api-version-changed"
  | "canonical-fingerprint-changed";

export type SchemaDriftChange = {
  side: "source" | "canonical";
  kind: SchemaDriftChangeKind;
  field: string;
  before: string | null;
  after: string | null;
  blocking: boolean;
};

export type AffectedMapping = {
  targetKey: string;
  sourcePath: string;
  reasons: string[];
};

export type RepairSuggestion = {
  kind:
    | "replace-source"
    | "remove-target"
    | "map-required-target"
    | "review-transform"
    | "review-enum"
    | "review-api-version"
    | "review-canonical-change";
  targetKey: string | null;
  fromSourcePath: string | null;
  toSourcePath: string | null;
  confidence: "deterministic" | "review-required";
  actionable: boolean;
  rationale: string;
};

export type SchemaDriftAnalysis = {
  driftState: "baseline-required" | "clean" | "drift-detected";
  sourceFingerprint: string;
  canonicalFingerprint: string;
  sourceChanges: SchemaDriftChange[];
  canonicalChanges: SchemaDriftChange[];
  affectedMappings: AffectedMapping[];
  repairSuggestions: RepairSuggestion[];
  blockingChanges: number;
};

const SOURCE_PATH_PATTERN =
  /^[A-Za-z_][A-Za-z0-9_-]*(?:\.[A-Za-z_][A-Za-z0-9_-]*|\[\d+\])*$/;

const SOURCE_TYPES: readonly SourceSchemaFieldType[] = [
  "string",
  "number",
  "boolean",
  "date-time",
  "string-array",
  "object",
  "unknown"
];

function text(value: unknown, field: string, max: number) {
  const result = String(value ?? "").trim();
  if (!result || result.length > max) {
    throw new Error("schema_drift_invalid_" + field);
  }
  return result;
}

function normalizeEnum(value: unknown) {
  if (value === undefined || value === null || value === "") return [];
  if (!Array.isArray(value)) throw new Error("schema_drift_enum_invalid");
  const values = value.map((item) => String(item).trim()).filter(Boolean);
  if (
    values.length > 100 ||
    values.some((item) => item.length > 160) ||
    new Set(values).size !== values.length
  ) {
    throw new Error("schema_drift_enum_invalid");
  }
  return [...values].sort();
}

export function normalizeSourceSchemaFields(value: unknown): SourceSchemaField[] {
  if (!Array.isArray(value) || value.length > 500) {
    throw new Error("schema_drift_source_fields_invalid");
  }

  const seen = new Set<string>();
  const fields = value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("schema_drift_source_field_invalid");
    }
    const row = item as Record<string, unknown>;
    const path = text(row.path, "source_path", 240);
    if (!SOURCE_PATH_PATTERN.test(path)) {
      throw new Error("schema_drift_source_path_invalid");
    }
    if (seen.has(path)) throw new Error("schema_drift_source_path_duplicate");
    seen.add(path);

    const type = String(row.type ?? "unknown") as SourceSchemaFieldType;
    if (!SOURCE_TYPES.includes(type)) {
      throw new Error("schema_drift_source_type_invalid");
    }

    return {
      path,
      type,
      required: Boolean(row.required),
      enumValues: normalizeEnum(row.enumValues)
    };
  });

  return fields.sort((left, right) => left.path.localeCompare(right.path));
}

export function sourceSchemaFingerprint(fields: readonly SourceSchemaField[]) {
  return createHash("sha256")
    .update(
      JSON.stringify(
        fields.map((field) => ({
          path: field.path,
          type: field.type,
          required: field.required,
          enumValues: [...field.enumValues]
        }))
      )
    )
    .digest("hex");
}

export function canonicalSchemaSnapshot(
  contract: CrossAppDataContract
): SchemaFieldSnapshot[] {
  return contract.fields
    .map((field) => ({
      path: field.key,
      type: field.type as SourceSchemaFieldType,
      required: field.required,
      enumValues: field.enumValues ? [...field.enumValues].sort() : []
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

function enumString(values: readonly string[]) {
  return values.length ? values.join("|") : "";
}

function diffFields(
  side: "source" | "canonical",
  previous: readonly SchemaFieldSnapshot[],
  current: readonly SchemaFieldSnapshot[]
): SchemaDriftChange[] {
  const before = new Map(previous.map((field) => [field.path, field]));
  const after = new Map(current.map((field) => [field.path, field]));
  const changes: SchemaDriftChange[] = [];

  for (const [path, prior] of before) {
    const next = after.get(path);
    if (!next) {
      changes.push({
        side,
        kind: "removed",
        field: path,
        before: prior.type,
        after: null,
        blocking: prior.required || side === "source"
      });
      continue;
    }
    if (prior.type !== next.type) {
      changes.push({
        side,
        kind: "type-changed",
        field: path,
        before: prior.type,
        after: next.type,
        blocking: true
      });
    }
    if (prior.required !== next.required) {
      changes.push({
        side,
        kind: "required-changed",
        field: path,
        before: String(prior.required),
        after: String(next.required),
        blocking: next.required
      });
    }
    if (enumString(prior.enumValues) !== enumString(next.enumValues)) {
      changes.push({
        side,
        kind: "enum-changed",
        field: path,
        before: enumString(prior.enumValues) || null,
        after: enumString(next.enumValues) || null,
        blocking: true
      });
    }
  }

  for (const [path, next] of after) {
    if (!before.has(path)) {
      changes.push({
        side,
        kind: "added",
        field: path,
        before: null,
        after: next.type,
        blocking: next.required
      });
    }
  }

  return changes.sort((left, right) =>
    (left.field + left.kind).localeCompare(right.field + right.kind)
  );
}

function normalizedLeaf(path: string) {
  const leaf = path.split(".").at(-1)?.replace(/\[\d+\]$/g, "") ?? path;
  return leaf.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function fieldTypeCompatible(
  sourceType: SourceSchemaFieldType,
  targetType: CrossAppFieldType,
  transform: FieldMappingTransform
) {
  if (transform === "number") return targetType === "number";
  if (transform === "boolean") return targetType === "boolean";
  if (transform === "iso-date-time") return targetType === "date-time";
  if (transform === "split-comma") return targetType === "string-array";
  if (transform === "join-comma") return targetType === "string";
  if (sourceType === "unknown" || sourceType === "object") return false;
  return (
    sourceType === targetType ||
    (sourceType === "string" &&
      ["string", "date-time", "number", "boolean"].includes(targetType))
  );
}

export function analyzeSchemaDrift(input: {
  mappingEntries: readonly FieldMappingEntry[];
  profileCanonicalFingerprint: string;
  profileSourceSchemaVersion: string | null;
  profileSourceSchemaFields: readonly SourceSchemaField[] | null;
  currentSourceSchemaVersion: string;
  currentSourceSchemaFields: readonly SourceSchemaField[];
  currentContract: CrossAppDataContract;
  previousCanonicalFields?: readonly SchemaFieldSnapshot[] | null;
}): SchemaDriftAnalysis {
  const currentCanonical = canonicalSchemaSnapshot(input.currentContract);
  const sourceFingerprint = sourceSchemaFingerprint(input.currentSourceSchemaFields);

  const sourceBaseline = input.profileSourceSchemaFields;
  const sourceChanges = sourceBaseline
    ? diffFields("source", sourceBaseline, input.currentSourceSchemaFields)
    : [];

  if (
    sourceBaseline &&
    input.profileSourceSchemaVersion &&
    input.profileSourceSchemaVersion !== input.currentSourceSchemaVersion
  ) {
    sourceChanges.unshift({
      side: "source",
      kind: "api-version-changed",
      field: "$api",
      before: input.profileSourceSchemaVersion,
      after: input.currentSourceSchemaVersion,
      blocking: true
    });
  }

  const canonicalChanges = input.previousCanonicalFields
    ? diffFields("canonical", input.previousCanonicalFields, currentCanonical)
    : [];

  if (
    input.profileCanonicalFingerprint !== input.currentContract.schemaFingerprint &&
    !canonicalChanges.length
  ) {
    canonicalChanges.push({
      side: "canonical",
      kind: "canonical-fingerprint-changed",
      field: "$contract",
      before: input.profileCanonicalFingerprint,
      after: input.currentContract.schemaFingerprint,
      blocking: true
    });
  }

  const sourceByPath = new Map(
    input.currentSourceSchemaFields.map((field) => [field.path, field])
  );
  const targetByKey = new Map(
    input.currentContract.fields.map((field) => [field.key, field])
  );
  const affectedMappings: AffectedMapping[] = [];

  for (const entry of input.mappingEntries) {
    const reasons: string[] = [];
    const source = sourceByPath.get(entry.sourcePath);
    const target = targetByKey.get(entry.targetKey);
    if (!source) reasons.push("source-field-missing");
    if (!target) reasons.push("canonical-target-missing");
    if (
      source &&
      target &&
      !fieldTypeCompatible(source.type, target.type, entry.transform)
    ) {
      reasons.push("type-or-transform-review");
    }
    if (
      sourceChanges.some(
        (change) =>
          change.field === entry.sourcePath &&
          ["type-changed", "enum-changed", "removed"].includes(change.kind)
      )
    ) {
      reasons.push("source-schema-changed");
    }
    if (
      canonicalChanges.some(
        (change) =>
          change.field === entry.targetKey &&
          ["type-changed", "enum-changed", "removed", "required-changed"].includes(
            change.kind
          )
      )
    ) {
      reasons.push("canonical-schema-changed");
    }
    if (reasons.length) {
      affectedMappings.push({
        targetKey: entry.targetKey,
        sourcePath: entry.sourcePath,
        reasons: [...new Set(reasons)]
      });
    }
  }

  const usedSources = new Set(input.mappingEntries.map((entry) => entry.sourcePath));
  const suggestions: RepairSuggestion[] = [];

  for (const affected of affectedMappings) {
    if (affected.reasons.includes("canonical-target-missing")) {
      suggestions.push({
        kind: "remove-target",
        targetKey: affected.targetKey,
        fromSourcePath: affected.sourcePath,
        toSourcePath: null,
        confidence: "deterministic",
        actionable: true,
        rationale: "The canonical target no longer exists."
      });
      continue;
    }

    if (affected.reasons.includes("source-field-missing")) {
      const leaf = normalizedLeaf(affected.sourcePath);
      const candidates = input.currentSourceSchemaFields.filter(
        (field) =>
          normalizedLeaf(field.path) === leaf && !usedSources.has(field.path)
      );
      suggestions.push({
        kind: "replace-source",
        targetKey: affected.targetKey,
        fromSourcePath: affected.sourcePath,
        toSourcePath: candidates.length === 1 ? candidates[0].path : null,
        confidence: candidates.length === 1 ? "deterministic" : "review-required",
        actionable: candidates.length === 1,
        rationale:
          candidates.length === 1
            ? "Exactly one current source field has the same normalized leaf name."
            : "The mapped source field is missing and no unique deterministic replacement exists."
      });
    }

    if (affected.reasons.includes("type-or-transform-review")) {
      suggestions.push({
        kind: "review-transform",
        targetKey: affected.targetKey,
        fromSourcePath: affected.sourcePath,
        toSourcePath: null,
        confidence: "review-required",
        actionable: false,
        rationale: "Source and canonical field types require transform review."
      });
    }

    if (
      sourceChanges.some(
        (change) =>
          change.field === affected.sourcePath && change.kind === "enum-changed"
      ) ||
      canonicalChanges.some(
        (change) =>
          change.field === affected.targetKey && change.kind === "enum-changed"
      )
    ) {
      suggestions.push({
        kind: "review-enum",
        targetKey: affected.targetKey,
        fromSourcePath: affected.sourcePath,
        toSourcePath: null,
        confidence: "review-required",
        actionable: false,
        rationale: "Enum values changed and require an explicit compatibility review."
      });
    }
  }

  const mappedTargets = new Set(input.mappingEntries.map((entry) => entry.targetKey));
  for (const field of input.currentContract.fields.filter(
    (item) => item.required && !mappedTargets.has(item.key)
  )) {
    const leaf = normalizedLeaf(field.key);
    const candidates = input.currentSourceSchemaFields.filter(
      (source) =>
        normalizedLeaf(source.path) === leaf && !usedSources.has(source.path)
    );
    suggestions.push({
      kind: "map-required-target",
      targetKey: field.key,
      fromSourcePath: null,
      toSourcePath: candidates.length === 1 ? candidates[0].path : null,
      confidence: candidates.length === 1 ? "deterministic" : "review-required",
      actionable: candidates.length === 1,
      rationale:
        candidates.length === 1
          ? "A single source field exactly matches the required canonical field name."
          : "A required canonical field is unmapped and needs operator selection."
    });
  }

  if (
    sourceChanges.some((change) => change.kind === "api-version-changed")
  ) {
    suggestions.push({
      kind: "review-api-version",
      targetKey: null,
      fromSourcePath: null,
      toSourcePath: null,
      confidence: "review-required",
      actionable: false,
      rationale: "The source API/schema version changed; review the full mapping surface."
    });
  }

  if (
    canonicalChanges.some(
      (change) => change.kind === "canonical-fingerprint-changed"
    )
  ) {
    suggestions.push({
      kind: "review-canonical-change",
      targetKey: null,
      fromSourcePath: null,
      toSourcePath: null,
      confidence: "review-required",
      actionable: false,
      rationale: "The canonical contract fingerprint changed without a prior canonical snapshot."
    });
  }

  const baselineRequired = !sourceBaseline;
  const blockingChanges = [...sourceChanges, ...canonicalChanges].filter(
    (change) => change.blocking
  ).length;

  return {
    driftState: baselineRequired
      ? "baseline-required"
      : sourceChanges.length ||
          canonicalChanges.length ||
          affectedMappings.length ||
          suggestions.some((suggestion) => suggestion.kind === "map-required-target")
        ? "drift-detected"
        : "clean",
    sourceFingerprint,
    canonicalFingerprint: input.currentContract.schemaFingerprint,
    sourceChanges,
    canonicalChanges,
    affectedMappings,
    repairSuggestions: suggestions,
    blockingChanges
  };
}

export function applyDeterministicRepairSuggestions(
  entries: readonly FieldMappingEntry[],
  suggestions: readonly RepairSuggestion[]
) {
  const next = entries.map((entry) => ({ ...entry }));

  for (const suggestion of suggestions.filter(
    (item) => item.actionable && item.confidence === "deterministic"
  )) {
    if (
      suggestion.kind === "remove-target" &&
      suggestion.targetKey
    ) {
      const index = next.findIndex(
        (entry) => entry.targetKey === suggestion.targetKey
      );
      if (index >= 0) next.splice(index, 1);
    }

    if (
      suggestion.kind === "replace-source" &&
      suggestion.targetKey &&
      suggestion.toSourcePath
    ) {
      const entry = next.find(
        (item) => item.targetKey === suggestion.targetKey
      );
      if (entry) entry.sourcePath = suggestion.toSourcePath;
    }

    if (
      suggestion.kind === "map-required-target" &&
      suggestion.targetKey &&
      suggestion.toSourcePath &&
      !next.some((entry) => entry.targetKey === suggestion.targetKey)
    ) {
      next.push({
        targetKey: suggestion.targetKey,
        sourcePath: suggestion.toSourcePath,
        transform: "copy"
      });
    }
  }

  return next.sort((left, right) => left.targetKey.localeCompare(right.targetKey));
}
