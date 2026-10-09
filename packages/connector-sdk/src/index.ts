export const CONNECTOR_SDK_VERSION = 1 as const;
export const CONNECTOR_MANIFEST_VERSION = 1 as const;
export const CONNECTOR_CAPABILITIES = ["import", "enrichment", "export"] as const;

export type ConnectorCapability = (typeof CONNECTOR_CAPABILITIES)[number];
export type ConnectorConfigScalar = string | number | boolean;

export interface ConnectorConfigField {
  key: string;
  label: string;
  description: string;
  type: "string" | "number" | "boolean";
  required: boolean;
  defaultValue?: ConnectorConfigScalar;
  allowedValues?: string[];
  minimum?: number;
  maximum?: number;
}

export interface ConnectorSecretDeclaration {
  key: string;
  label: string;
  description: string;
  required: boolean;
  environmentVariable: string;
}

export interface ConnectorManifestV1 {
  manifestVersion: 1;
  sdkVersion: 1;
  key: string;
  version: string;
  displayName: string;
  description: string;
  capabilities: ConnectorCapability[];
  configSchema: ConnectorConfigField[];
  secrets: ConnectorSecretDeclaration[];
  limits: {
    maxExecutionMs: number;
    maxInputBytes: number;
    maxOutputBytes: number;
  };
}

export interface ConnectorSecretReference {
  kind: "environment";
  environmentVariable: string;
}

export type ConnectorSecretReferences = Record<string, ConnectorSecretReference>;

export interface ConnectorExecutionContext {
  workspaceId: string;
  capability: ConnectorCapability;
  config: Record<string, ConnectorConfigScalar>;
  input: unknown;
  signal: AbortSignal;
  secret(key: string): Promise<string>;
}

export interface ConnectorExecutionResult {
  output: unknown;
  summary: Record<string, string | number | boolean | null>;
}

export type ConnectorExecutor = (
  context: ConnectorExecutionContext
) => Promise<ConnectorExecutionResult>;

export interface ConnectorDefinition {
  manifest: ConnectorManifestV1;
  execute: ConnectorExecutor;
}

export interface ConnectorValidationResult {
  valid: boolean;
  errors: string[];
}

const KEY_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const ENV_PATTERN = /^[A-Z][A-Z0-9_]{2,127}$/;

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function jsonBytes(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

export function validateConnectorManifest(
  value: unknown
): ConnectorValidationResult {
  const errors: string[] = [];
  const manifest = object(value) as Partial<ConnectorManifestV1> | null;
  if (!manifest) return { valid: false, errors: ["Manifest must be an object."] };

  if (manifest.manifestVersion !== CONNECTOR_MANIFEST_VERSION) {
    errors.push("Unsupported connector manifest version.");
  }
  if (manifest.sdkVersion !== CONNECTOR_SDK_VERSION) {
    errors.push("Connector SDK version is incompatible.");
  }
  if (typeof manifest.key !== "string" || !KEY_PATTERN.test(manifest.key)) {
    errors.push("Connector key must be a stable lowercase dotted/dashed identifier.");
  }
  if (typeof manifest.version !== "string" || !VERSION_PATTERN.test(manifest.version)) {
    errors.push("Connector version must use semantic x.y.z form.");
  }
  if (
    typeof manifest.displayName !== "string" ||
    !manifest.displayName.trim() ||
    manifest.displayName.length > 120
  ) {
    errors.push("Connector display name is required and bounded.");
  }
  if (
    typeof manifest.description !== "string" ||
    !manifest.description.trim() ||
    manifest.description.length > 1000
  ) {
    errors.push("Connector description is required and bounded.");
  }

  const capabilities = Array.isArray(manifest.capabilities)
    ? manifest.capabilities
    : [];
  if (!capabilities.length) errors.push("At least one connector capability is required.");
  const seenCapabilities = new Set<string>();
  for (const capability of capabilities) {
    if (!CONNECTOR_CAPABILITIES.includes(capability as ConnectorCapability)) {
      errors.push("Unsupported connector capability: " + String(capability));
    }
    if (seenCapabilities.has(String(capability))) {
      errors.push("Connector capabilities must be unique.");
    }
    seenCapabilities.add(String(capability));
  }

  const configSchema = Array.isArray(manifest.configSchema) ? manifest.configSchema : [];
  const configKeys = new Set<string>();
  for (const field of configSchema) {
    const item = object(field) as Partial<ConnectorConfigField> | null;
    if (!item || typeof item.key !== "string" || !KEY_PATTERN.test(item.key)) {
      errors.push("Every config field requires a stable key.");
      continue;
    }
    if (configKeys.has(item.key)) errors.push("Config field keys must be unique.");
    configKeys.add(item.key);
    if (!["string", "number", "boolean"].includes(String(item.type))) {
      errors.push("Config field type is unsupported: " + item.key);
    }
    if (item.allowedValues && item.type !== "string") {
      errors.push("allowedValues is supported only for string config fields.");
    }
  }

  const secrets = Array.isArray(manifest.secrets) ? manifest.secrets : [];
  const secretKeys = new Set<string>();
  for (const secret of secrets) {
    const item = object(secret) as Partial<ConnectorSecretDeclaration> | null;
    if (
      !item ||
      typeof item.key !== "string" ||
      !KEY_PATTERN.test(item.key) ||
      typeof item.environmentVariable !== "string" ||
      !ENV_PATTERN.test(item.environmentVariable)
    ) {
      errors.push("Secret declarations require a stable key and fixed environment variable.");
      continue;
    }
    if (secretKeys.has(item.key)) errors.push("Secret keys must be unique.");
    secretKeys.add(item.key);
  }

  const limits = object(manifest.limits);
  const maxExecutionMs = Number(limits?.maxExecutionMs);
  const maxInputBytes = Number(limits?.maxInputBytes);
  const maxOutputBytes = Number(limits?.maxOutputBytes);
  if (
    !Number.isInteger(maxExecutionMs) ||
    maxExecutionMs < 100 ||
    maxExecutionMs > 30_000
  ) {
    errors.push("maxExecutionMs must be between 100 and 30000.");
  }
  if (
    !Number.isInteger(maxInputBytes) ||
    maxInputBytes < 1024 ||
    maxInputBytes > 1_000_000
  ) {
    errors.push("maxInputBytes must be between 1024 and 1000000.");
  }
  if (
    !Number.isInteger(maxOutputBytes) ||
    maxOutputBytes < 1024 ||
    maxOutputBytes > 1_000_000
  ) {
    errors.push("maxOutputBytes must be between 1024 and 1000000.");
  }

  return { valid: errors.length === 0, errors };
}

export function normalizeConnectorConfig(
  manifest: ConnectorManifestV1,
  value: unknown
) {
  const source = object(value) ?? {};
  const allowed = new Set(manifest.configSchema.map((field) => field.key));
  for (const key of Object.keys(source)) {
    if (!allowed.has(key)) throw new Error("connector_config_unknown_field:" + key);
  }

  const normalized: Record<string, ConnectorConfigScalar> = {};
  for (const field of manifest.configSchema) {
    let current = source[field.key];
    if (current === undefined) current = field.defaultValue;
    if (current === undefined) {
      if (field.required) throw new Error("connector_config_required:" + field.key);
      continue;
    }
    if (typeof current !== field.type) {
      throw new Error("connector_config_type:" + field.key);
    }
    if (
      field.type === "string" &&
      field.allowedValues?.length &&
      !field.allowedValues.includes(current as string)
    ) {
      throw new Error("connector_config_value:" + field.key);
    }
    if (
      field.type === "number" &&
      (field.minimum !== undefined || field.maximum !== undefined)
    ) {
      const numeric = current as number;
      if (field.minimum !== undefined && numeric < field.minimum) {
        throw new Error("connector_config_minimum:" + field.key);
      }
      if (field.maximum !== undefined && numeric > field.maximum) {
        throw new Error("connector_config_maximum:" + field.key);
      }
    }
    normalized[field.key] = current as ConnectorConfigScalar;
  }
  return normalized;
}

export function validateConnectorSecretReferences(
  manifest: ConnectorManifestV1,
  value: unknown
): ConnectorSecretReferences {
  const source = object(value) ?? {};
  const allowed = new Set(manifest.secrets.map((secret) => secret.key));
  for (const key of Object.keys(source)) {
    if (!allowed.has(key)) throw new Error("connector_secret_unknown:" + key);
  }

  const result: ConnectorSecretReferences = {};
  for (const declaration of manifest.secrets) {
    const raw = source[declaration.key];
    if (raw === undefined) {
      if (declaration.required) {
        throw new Error("connector_secret_reference_required:" + declaration.key);
      }
      continue;
    }
    const reference = object(raw);
    if (
      reference?.kind !== "environment" ||
      reference.environmentVariable !== declaration.environmentVariable
    ) {
      throw new Error("connector_secret_reference_invalid:" + declaration.key);
    }
    result[declaration.key] = {
      kind: "environment",
      environmentVariable: declaration.environmentVariable
    };
  }
  return result;
}

export function assertConnectorCapability(
  manifest: ConnectorManifestV1,
  grantedCapabilities: readonly string[],
  requested: ConnectorCapability
) {
  if (!manifest.capabilities.includes(requested)) {
    throw new Error("connector_capability_unsupported");
  }
  if (!grantedCapabilities.includes(requested)) {
    throw new Error("connector_capability_not_granted");
  }
}

export function assertConnectorInputBound(
  manifest: ConnectorManifestV1,
  input: unknown
) {
  if (jsonBytes(input) > manifest.limits.maxInputBytes) {
    throw new Error("connector_input_too_large");
  }
}

export function assertConnectorOutputBound(
  manifest: ConnectorManifestV1,
  output: unknown
) {
  if (jsonBytes(output) > manifest.limits.maxOutputBytes) {
    throw new Error("connector_output_too_large");
  }
}

export function defineConnector(
  manifest: ConnectorManifestV1,
  execute: ConnectorExecutor
): ConnectorDefinition {
  const validation = validateConnectorManifest(manifest);
  if (!validation.valid) {
    throw new Error("Invalid connector manifest: " + validation.errors.join(" "));
  }
  return { manifest, execute };
}
