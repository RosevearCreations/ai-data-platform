import { createHash } from "node:crypto";

import {
  CONNECTOR_CAPABILITIES,
  validateConnectorManifest,
  type ConnectorCapability,
  type ConnectorManifest
} from "@rosevear/ai-data-connector-sdk";

import {
  AI_DATA_MODULE_VERSION,
  UNIVERSAL_MODULE_PROTOCOL_VERSION
} from "./universal-module-contract";
import { listRegisteredConnectorManifests } from "./connectors/registry";

export const CONNECTOR_DRIVER_REGISTRY_VERSION = "1.0.0" as const;
export const CONNECTOR_DRIVER_SCHEMA =
  "rosevear.ai-data-platform.connector-driver.v1" as const;
export const CONNECTOR_DRIVER_REGISTRY_SCHEMA =
  "rosevear.ai-data-platform.connector-driver-registry.v1" as const;

export type ConnectorDriverInstallState =
  | "available"
  | "installed-disabled"
  | "installed-enabled"
  | "installed-incompatible";

export type ConnectorDriverInstallationSnapshot = {
  connectorKey: string;
  manifestVersion: number;
  sdkVersion: number;
  connectorVersion: string;
  enabled: boolean;
};

export type ConnectorDriverCapabilityMetadata = {
  capability: ConnectorCapability;
  direction: "inbound" | "processing" | "outbound";
  consequential: boolean;
  requiresWorkspaceGrant: true;
};

export type ConnectorDriverHealthContract =
  | {
      kind: "local";
      probeAvailable: false;
      externalNetworkRequest: false;
    }
  | {
      kind: "http";
      probeAvailable: true;
      externalNetworkRequest: true;
      method: "GET" | "HEAD";
      path: string;
      expectedStatuses: number[];
      timeoutMs: number | null;
      healthProbeActivatesConnection: false;
    };

export type ConnectorDriverAuthReferenceRequirement = {
  key: string;
  label: string;
  required: boolean;
  kind: "environment";
  environmentVariable: string;
  rawSecretAcceptedInRegistry: false;
};

export type ConnectorDriverProvenance = {
  packageDigestSha256: string;
  source: "trusted-built-in-registry";
  signature: null | {
    algorithm: "ed25519";
    keyId: string;
    signatureBase64: string;
  };
  signatureStatus: "not-provided" | "metadata-present-unverified";
  signatureVerifiedByRegistry: false;
};

export type ConnectorDriverPackage = {
  schema: typeof CONNECTOR_DRIVER_SCHEMA;
  registryVersion: typeof CONNECTOR_DRIVER_REGISTRY_VERSION;
  driverId: string;
  driverVersion: string;
  connectorKey: string;
  connectorVersion: string;
  manifestVersion: number;
  sdkVersion: number;
  displayName: string;
  description: string;
  capabilities: ConnectorDriverCapabilityMetadata[];
  health: ConnectorDriverHealthContract;
  authReferences: ConnectorDriverAuthReferenceRequirement[];
  compatibility: {
    moduleApiRange: ">=1.0.0 <2.0.0";
    moduleApiVersion: string;
    moduleApiCompatible: boolean;
    universalModuleProtocolVersion: number;
    minimumConnectorSdkVersion: 2;
    installedConnectorVersionCompatible: boolean | null;
  };
  installState: ConnectorDriverInstallState;
  installation: ConnectorDriverInstallationSnapshot | null;
  provenance: ConnectorDriverProvenance;
  validation: {
    valid: boolean;
    errors: string[];
  };
  security: {
    driverPresenceActivatesConnection: false;
    installStateActivatesConnection: false;
    enabledStateProvesLiveConnection: false;
    discoveryGrantsCapabilities: false;
    rawSecretValuesIncluded: false;
    externalHealthProbePerformedDuringDiscovery: false;
  };
};

export type ConnectorDriverRegistry = {
  schema: typeof CONNECTOR_DRIVER_REGISTRY_SCHEMA;
  version: typeof CONNECTOR_DRIVER_REGISTRY_VERSION;
  moduleId: "rosevear.ai-data-platform";
  moduleApiVersion: string;
  drivers: ConnectorDriverPackage[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    installed: number;
    enabled: number;
    incompatible: number;
  };
  validation: {
    valid: boolean;
    errors: string[];
  };
  security: {
    discoveryActivatesConnection: false;
    registryInstallStateActivatesConnection: false;
    enabledStateProvesRemoteAvailability: false;
    rawSecretValuesAccepted: false;
    externalHealthProbePerformed: false;
  };
};

const DRIVER_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;
const KEY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/+-]{1,159}$/;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

function canonical(value: unknown): string {
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonical(record[key]))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(value);
}

function sha256(value: unknown) {
  return createHash("sha256")
    .update(canonical(value), "utf8")
    .digest("hex");
}

function parseSemver(version: string) {
  const match = SEMVER_PATTERN.exec(version);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3])
  };
}

function compareSemver(left: string, right: string) {
  const a = parseSemver(left);
  const b = parseSemver(right);
  if (!a || !b) return null;
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

export function moduleApiVersionCompatible(version: string) {
  const minimum = compareSemver(version, "1.0.0");
  const maximum = compareSemver(version, "2.0.0");
  return minimum !== null && maximum !== null && minimum >= 0 && maximum < 0;
}

function capabilityMetadata(
  capabilities: readonly ConnectorCapability[]
): ConnectorDriverCapabilityMetadata[] {
  return capabilities.map((capability) => ({
    capability,
    direction:
      capability === "import"
        ? ("inbound" as const)
        : capability === "export"
          ? ("outbound" as const)
          : ("processing" as const),
    consequential: capability === "export",
    requiresWorkspaceGrant: true as const
  }));
}

function healthContract(
  manifest: ConnectorManifest
): ConnectorDriverHealthContract {
  if (manifest.manifestVersion !== 2 || manifest.transport.kind === "local") {
    return {
      kind: "local",
      probeAvailable: false,
      externalNetworkRequest: false
    };
  }

  return {
    kind: "http",
    probeAvailable: true,
    externalNetworkRequest: true,
    method: manifest.transport.health.method,
    path: manifest.transport.health.path,
    expectedStatuses: [...manifest.transport.health.expectedStatuses],
    timeoutMs: manifest.transport.health.timeoutMs ?? null,
    healthProbeActivatesConnection: false
  };
}

function authReferenceRequirements(
  manifest: ConnectorManifest
): ConnectorDriverAuthReferenceRequirement[] {
  return manifest.secrets.map((secret) => ({
    key: secret.key,
    label: secret.label,
    required: secret.required,
    kind: "environment" as const,
    environmentVariable: secret.environmentVariable,
    rawSecretAcceptedInRegistry: false as const
  }));
}

function validateSignatureMetadata(
  signature: ConnectorDriverProvenance["signature"]
) {
  if (signature === null) return [];
  const errors: string[] = [];
  if (signature.algorithm !== "ed25519") {
    errors.push("Driver provenance signature algorithm is unsupported.");
  }
  if (!KEY_ID_PATTERN.test(signature.keyId)) {
    errors.push("Driver provenance key ID is invalid.");
  }
  if (
    signature.signatureBase64.length < 40 ||
    signature.signatureBase64.length > 512 ||
    !BASE64_PATTERN.test(signature.signatureBase64)
  ) {
    errors.push("Driver provenance signature metadata is invalid.");
  }
  return errors;
}

function installState(
  manifest: ConnectorManifest,
  installation: ConnectorDriverInstallationSnapshot | null
): ConnectorDriverInstallState {
  if (!installation) return "available";
  const compatible =
    installation.connectorKey === manifest.key &&
    installation.manifestVersion === manifest.manifestVersion &&
    installation.sdkVersion === manifest.sdkVersion &&
    installation.connectorVersion === manifest.version;
  if (!compatible) return "installed-incompatible";
  return installation.enabled
    ? "installed-enabled"
    : "installed-disabled";
}

function installedVersionCompatible(
  manifest: ConnectorManifest,
  installation: ConnectorDriverInstallationSnapshot | null
) {
  if (!installation) return null;
  return (
    installation.connectorKey === manifest.key &&
    installation.manifestVersion === manifest.manifestVersion &&
    installation.sdkVersion === manifest.sdkVersion &&
    installation.connectorVersion === manifest.version
  );
}

export function packageConnectorDriver(input: {
  manifest: ConnectorManifest;
  moduleApiVersion?: string;
  installation?: ConnectorDriverInstallationSnapshot | null;
  signature?: ConnectorDriverProvenance["signature"];
}): ConnectorDriverPackage {
  const moduleApiVersion = input.moduleApiVersion ?? AI_DATA_MODULE_VERSION;
  const installation = input.installation ?? null;
  const manifestValidation = validateConnectorManifest(input.manifest);
  const errors = [...manifestValidation.errors];

  if (!DRIVER_ID_PATTERN.test(input.manifest.key)) {
    errors.push("Connector driver ID is invalid.");
  }
  if (!moduleApiVersionCompatible(moduleApiVersion)) {
    errors.push("Universal module API version is incompatible with this driver package.");
  }
  if (input.manifest.manifestVersion !== 2 || input.manifest.sdkVersion !== 2) {
    errors.push("Build 321 driver packages require Connector SDK/manifest v2.");
  }
  for (const capability of input.manifest.capabilities) {
    if (!(CONNECTOR_CAPABILITIES as readonly string[]).includes(capability)) {
      errors.push("Connector driver capability is unsupported: " + capability);
    }
  }

  const signature = input.signature ?? null;
  errors.push(...validateSignatureMetadata(signature));

  const source = {
    schema: CONNECTOR_DRIVER_SCHEMA,
    driverId: input.manifest.key,
    driverVersion: input.manifest.version,
    manifest: input.manifest,
    moduleApiRange: ">=1.0.0 <2.0.0",
    universalModuleProtocolVersion: UNIVERSAL_MODULE_PROTOCOL_VERSION
  };
  const packageDigestSha256 = sha256(source);

  return Object.freeze({
    schema: CONNECTOR_DRIVER_SCHEMA,
    registryVersion: CONNECTOR_DRIVER_REGISTRY_VERSION,
    driverId: input.manifest.key,
    driverVersion: input.manifest.version,
    connectorKey: input.manifest.key,
    connectorVersion: input.manifest.version,
    manifestVersion: input.manifest.manifestVersion,
    sdkVersion: input.manifest.sdkVersion,
    displayName: input.manifest.displayName,
    description: input.manifest.description,
    capabilities: capabilityMetadata(input.manifest.capabilities),
    health: healthContract(input.manifest),
    authReferences: authReferenceRequirements(input.manifest),
    compatibility: Object.freeze({
      moduleApiRange: ">=1.0.0 <2.0.0" as const,
      moduleApiVersion,
      moduleApiCompatible: moduleApiVersionCompatible(moduleApiVersion),
      universalModuleProtocolVersion: UNIVERSAL_MODULE_PROTOCOL_VERSION,
      minimumConnectorSdkVersion: 2 as const,
      installedConnectorVersionCompatible: installedVersionCompatible(
        input.manifest,
        installation
      )
    }),
    installState: installState(input.manifest, installation),
    installation: installation
      ? Object.freeze({ ...installation })
      : null,
    provenance: Object.freeze({
      packageDigestSha256,
      source: "trusted-built-in-registry" as const,
      signature,
      signatureStatus:
        signature === null
          ? ("not-provided" as const)
          : ("metadata-present-unverified" as const),
      signatureVerifiedByRegistry: false as const
    }),
    validation: Object.freeze({
      valid: errors.length === 0,
      errors: [...errors]
    }),
    security: Object.freeze({
      driverPresenceActivatesConnection: false as const,
      installStateActivatesConnection: false as const,
      enabledStateProvesLiveConnection: false as const,
      discoveryGrantsCapabilities: false as const,
      rawSecretValuesIncluded: false as const,
      externalHealthProbePerformedDuringDiscovery: false as const
    })
  });
}

export function validateConnectorDriverRegistry(
  drivers: readonly ConnectorDriverPackage[]
) {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const driver of drivers) {
    if (ids.has(driver.driverId)) {
      errors.push("Duplicate connector driver ID: " + driver.driverId);
    }
    ids.add(driver.driverId);
    if (!driver.validation.valid) {
      errors.push(
        "Invalid connector driver " +
          driver.driverId +
          ": " +
          driver.validation.errors.join(" | ")
      );
    }
    if (!/^[a-f0-9]{64}$/.test(driver.provenance.packageDigestSha256)) {
      errors.push("Connector driver package digest is invalid: " + driver.driverId);
    }
    if (
      driver.security.driverPresenceActivatesConnection !== false ||
      driver.security.installStateActivatesConnection !== false ||
      driver.security.discoveryGrantsCapabilities !== false
    ) {
      errors.push("Connector driver security boundary is invalid: " + driver.driverId);
    }
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors
  });
}

export function buildConnectorDriverRegistry(input?: {
  installations?: readonly ConnectorDriverInstallationSnapshot[];
  moduleApiVersion?: string;
}): ConnectorDriverRegistry {
  const installations = new Map(
    (input?.installations ?? []).map((item) => [item.connectorKey, item])
  );
  const moduleApiVersion = input?.moduleApiVersion ?? AI_DATA_MODULE_VERSION;
  const drivers = listRegisteredConnectorManifests().map((manifest) =>
    packageConnectorDriver({
      manifest,
      moduleApiVersion,
      installation: installations.get(manifest.key) ?? null
    })
  );
  const validation = validateConnectorDriverRegistry(drivers);

  return Object.freeze({
    schema: CONNECTOR_DRIVER_REGISTRY_SCHEMA,
    version: CONNECTOR_DRIVER_REGISTRY_VERSION,
    moduleId: "rosevear.ai-data-platform" as const,
    moduleApiVersion,
    drivers,
    summary: Object.freeze({
      total: drivers.length,
      valid: drivers.filter((driver) => driver.validation.valid).length,
      invalid: drivers.filter((driver) => !driver.validation.valid).length,
      installed: drivers.filter((driver) => driver.installState !== "available").length,
      enabled: drivers.filter((driver) => driver.installState === "installed-enabled").length,
      incompatible: drivers.filter(
        (driver) => driver.installState === "installed-incompatible"
      ).length
    }),
    validation,
    security: Object.freeze({
      discoveryActivatesConnection: false as const,
      registryInstallStateActivatesConnection: false as const,
      enabledStateProvesRemoteAvailability: false as const,
      rawSecretValuesAccepted: false as const,
      externalHealthProbePerformed: false as const
    })
  });
}

export function findConnectorDriver(
  registry: ConnectorDriverRegistry,
  driverId: string
) {
  return registry.drivers.find((driver) => driver.driverId === driverId) ?? null;
}
