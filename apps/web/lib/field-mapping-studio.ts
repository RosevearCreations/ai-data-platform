import {
  buildCrossAppDataContractRegistry,
  type CrossAppDataContract,
  type CrossAppFieldType
} from "./cross-app-data-contract-registry";
import { getPeerApplication, type PeerApplicationId } from "./app-connection-registry";

export const FIELD_MAPPING_TRANSFORMS = [
  "copy",
  "trim",
  "lowercase",
  "uppercase",
  "number",
  "boolean",
  "iso-date-time",
  "split-comma",
  "join-comma"
] as const;

export type FieldMappingTransform = (typeof FIELD_MAPPING_TRANSFORMS)[number];

export type FieldMappingEntry = {
  targetKey: string;
  sourcePath: string;
  transform: FieldMappingTransform;
};

export type FieldMappingValidation = {
  valid: boolean;
  completeForReview: boolean;
  errors: string[];
  requiredTargets: number;
  mappedRequiredTargets: number;
  totalTargets: number;
  mappedTargets: number;
};

const SOURCE_PATH_PATTERN =
  /^[A-Za-z_][A-Za-z0-9_-]*(?:\.[A-Za-z_][A-Za-z0-9_-]*|\[\d+\])*$/;

function contractById(contractId: string) {
  return (
    buildCrossAppDataContractRegistry().contracts.find(
      (contract) => contract.contractId === contractId
    ) ?? null
  );
}

export function validateFieldMappingApplication(value: unknown): PeerApplicationId {
  const id = String(value ?? "") as PeerApplicationId;
  if (!getPeerApplication(id)) {
    throw new Error("field_mapping_application_invalid");
  }
  return id;
}

export function getFieldMappingContract(contractId: unknown): CrossAppDataContract {
  const contract = contractById(String(contractId ?? ""));
  if (!contract) throw new Error("field_mapping_contract_invalid");
  return contract;
}

function transformForType(
  transform: FieldMappingTransform,
  type: CrossAppFieldType
) {
  if (transform === "number") return type === "number";
  if (transform === "boolean") return type === "boolean";
  if (transform === "iso-date-time") return type === "date-time";
  if (transform === "split-comma") return type === "string-array";
  if (transform === "join-comma") return type === "string";
  return true;
}

export function normalizeFieldMappingEntries(
  value: unknown,
  contract: CrossAppDataContract
): FieldMappingEntry[] {
  if (!Array.isArray(value)) throw new Error("field_mapping_entries_invalid");

  const allowedTargets = new Set(contract.fields.map((field) => field.key));
  const seenTargets = new Set<string>();
  const result: FieldMappingEntry[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("field_mapping_entry_invalid");
    }
    const row = item as Record<string, unknown>;
    const targetKey = String(row.targetKey ?? "").trim();
    const sourcePath = String(row.sourcePath ?? "").trim();
    const transform = String(row.transform ?? "copy") as FieldMappingTransform;

    if (!allowedTargets.has(targetKey)) {
      throw new Error("field_mapping_target_invalid");
    }
    if (seenTargets.has(targetKey)) {
      throw new Error("field_mapping_target_duplicate");
    }
    if (!FIELD_MAPPING_TRANSFORMS.includes(transform)) {
      throw new Error("field_mapping_transform_invalid");
    }
    if (sourcePath && !SOURCE_PATH_PATTERN.test(sourcePath)) {
      throw new Error("field_mapping_source_path_invalid");
    }

    seenTargets.add(targetKey);
    if (sourcePath) {
      result.push({ targetKey, sourcePath, transform });
    }
  }

  return result;
}

export function validateFieldMappingEntries(
  entries: readonly FieldMappingEntry[],
  contract: CrossAppDataContract
): FieldMappingValidation {
  const byTarget = new Map(entries.map((entry) => [entry.targetKey, entry]));
  const errors: string[] = [];

  for (const entry of entries) {
    const field = contract.fields.find((item) => item.key === entry.targetKey);
    if (!field) {
      errors.push("Unknown canonical target: " + entry.targetKey);
      continue;
    }
    if (!transformForType(entry.transform, field.type)) {
      errors.push(
        entry.targetKey +
          " cannot use " +
          entry.transform +
          " for canonical type " +
          field.type
      );
    }
  }

  const required = contract.fields.filter((field) => field.required);
  const mappedRequiredTargets = required.filter((field) =>
    byTarget.has(field.key)
  ).length;

  for (const field of required) {
    if (!byTarget.has(field.key)) {
      errors.push("Required canonical target is not mapped: " + field.key);
    }
  }

  return {
    valid: errors.length === 0,
    completeForReview:
      errors.length === 0 && mappedRequiredTargets === required.length,
    errors,
    requiredTargets: required.length,
    mappedRequiredTargets,
    totalTargets: contract.fields.length,
    mappedTargets: entries.length
  };
}

export function buildFieldMappingEditorRows(
  contract: CrossAppDataContract,
  entries: readonly FieldMappingEntry[] = []
) {
  const byTarget = new Map(entries.map((entry) => [entry.targetKey, entry]));
  return contract.fields.map((field) => {
    const mapping = byTarget.get(field.key);
    return {
      targetKey: field.key,
      targetLabel: field.label,
      targetType: field.type,
      targetDescription: field.description,
      required: field.required,
      enumValues: field.enumValues ? [...field.enumValues] : null,
      sourcePath: mapping?.sourcePath ?? "",
      transform: mapping?.transform ?? ("copy" as const)
    };
  });
}

export function fieldMappingSchemaCurrent(
  schemaFingerprint: string,
  contractId: string
) {
  const contract = contractById(contractId);
  return Boolean(
    contract && contract.schemaFingerprint === schemaFingerprint
  );
}
