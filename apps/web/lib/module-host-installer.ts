import { createHash } from "node:crypto";

import {
  generateModuleHostScaffold,
  getModuleHostAdapter,
  MODULE_HOST_ADAPTER_KINDS,
  type ModuleHostAdapterKind
} from "./module-host-adapter-pack";
import {
  createSecureTransportManifest,
  SECURE_TRANSPORT_KINDS,
  TRANSPORT_SECURITY_LEVELS,
  type SecureTransportKind,
  type TransportSecurityLevel
} from "./secure-transport-selection";
import {
  AI_DATA_MODULE_ID,
  AI_DATA_MODULE_VERSION,
  MODULE_HEADLESS_CAPABILITIES,
  MODULE_SURFACES,
  UNIVERSAL_HOST_CONTRACT_VERSION,
  UNIVERSAL_MODULE_PROTOCOL_VERSION,
  type HostEnvironment,
  type ModuleHeadlessCapability
} from "./universal-module-contract";

export const MODULE_HOST_INSTALLER_VERSION = "1.0.0" as const;
export const MODULE_HOST_INSTALL_MANIFEST_SCHEMA =
  "rosevear.ai-data-platform.host-install-manifest.v1" as const;
export const MODULE_HOST_INSTALL_DRY_RUN_SCHEMA =
  "rosevear.ai-data-platform.host-install-dry-run.v1" as const;
export const MODULE_HOST_INSTALL_PACKAGE_SCHEMA =
  "rosevear.ai-data-platform.host-install-package.v1" as const;

export const INSTALLER_CREDENTIAL_REFERENCE_KINDS = [
  "environment-variable",
  "external-vault-reference",
  "provider-managed-reference"
] as const;

export type InstallerCredentialReferenceKind =
  (typeof INSTALLER_CREDENTIAL_REFERENCE_KINDS)[number];

export type HostInstallCredentialRequirement = {
  requirementId: string;
  label: string;
  required: boolean;
  acceptedReferenceKinds: InstallerCredentialReferenceKind[];
};

export type HostInstallCredentialBinding = {
  requirementId: string;
  credentialRefId: string;
};

export type HostInstallCredentialEvidence = {
  requirementId: string;
  credentialRefId: string;
  workspaceId: string;
  referenceKind: InstallerCredentialReferenceKind;
  lifecycleStatus: "active" | "revoked";
  expiresAt: string | null;
};

export type HostInstallTransportInput = {
  transportId: string;
  displayName: string;
  kind: SecureTransportKind;
  destinationOrigin: string;
  securityLevel: TransportSecurityLevel;
  localRelay: {
    relayId: string;
    trustReference: string;
  } | null;
};

export type HostInstallManifest = {
  schema: typeof MODULE_HOST_INSTALL_MANIFEST_SCHEMA;
  manifestVersion: 1;
  hostContractVersion: number;
  protocolVersion: number;
  hostApplication: {
    id: string;
    instanceId: string;
    environment: HostEnvironment;
    displayName: string;
  };
  tenancy: {
    hostTenantId: string;
    platformTenantId: string;
    workspaceId: string;
  };
  runtime: {
    framework: ModuleHostAdapterKind;
  };
  defaultSurface: string;
  requestedCapabilities: string[];
  credentialRequirements: HostInstallCredentialRequirement[];
  credentialBindings: HostInstallCredentialBinding[];
  transport: HostInstallTransportInput;
};

export type HostInstallCheck = {
  id:
    | "manifest"
    | "compatibility"
    | "adapter"
    | "tenant-workspace"
    | "capabilities"
    | "credential-references"
    | "transport"
    | "security-boundary";
  state: "pass" | "held";
  detail: string;
};

export type HostInstallDryRun = {
  schema: typeof MODULE_HOST_INSTALL_DRY_RUN_SCHEMA;
  version: typeof MODULE_HOST_INSTALLER_VERSION;
  manifestSha256: string;
  state: "pass" | "held";
  ownerApprovalEligible: boolean;
  host: {
    hostApplicationId: string;
    hostInstanceId: string;
    environment: HostEnvironment;
    hostTenantId: string;
    platformTenantId: string;
    workspaceId: string;
  };
  adapter: {
    kind: ModuleHostAdapterKind;
    adapterId: string;
    displayName: string;
  };
  capabilityPreview: {
    requested: string[];
    supported: string[];
    unsupported: string[];
    granted: [];
  };
  credentialPreview: {
    requirements: number;
    required: number;
    satisfied: number;
    missingRequired: string[];
    invalidBindings: string[];
    rawSecretValuesRead: false;
  };
  transportPreparation: {
    transportId: string;
    kind: SecureTransportKind;
    destinationOrigin: string;
    securityLevel: TransportSecurityLevel;
    healthVerified: false;
    runtimeSelectionPerformed: false;
    networkRequestPerformed: false;
    authorizationGranted: false;
  };
  checks: HostInstallCheck[];
  security: {
    connectionActivated: false;
    trustAuthorized: false;
    capabilitiesGranted: false;
    credentialsCreated: false;
    rawSecretsAccepted: false;
    hostFilesWritten: false;
    networkRequestPerformed: false;
  };
};

export type HostInstallPackage = {
  schema: typeof MODULE_HOST_INSTALL_PACKAGE_SCHEMA;
  version: typeof MODULE_HOST_INSTALLER_VERSION;
  enrollmentId: string;
  approvalEventId: string;
  manifestSha256: string;
  dryRunSha256: string;
  packageSha256: string;
  generatedAt: string;
  host: HostInstallDryRun["host"];
  adapter: HostInstallDryRun["adapter"];
  files: Array<{
    path: string;
    content: string;
  }>;
  security: {
    generatedAfterOwnerApproval: true;
    rawSecretsIncluded: false;
    credentialLocatorsIncluded: false;
    connectionActivated: false;
    trustAuthorized: false;
    capabilitiesGranted: false;
    hostFilesWrittenByPlatform: false;
  };
};

const APPLICATION_ID_PATTERN =
  /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const OPAQUE_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:@/+-]{2,159}$/;
const REQUIREMENT_ID_PATTERN =
  /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const FORBIDDEN_SECRET_KEYS = new Set([
  "password",
  "secret",
  "token",
  "authorization",
  "cookie",
  "apikey",
  "accesstoken",
  "refreshtoken",
  "clientsecret",
  "privatekey",
  "credentialvalue"
]);

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const encoded = JSON.stringify(value);
    return encoded === undefined ? "null" : encoded;
  }
  if (Array.isArray(value)) {
    return "[" + value.map(stableJson).join(",") + "]";
  }
  const object = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(object)
      .sort()
      .map(
        (key) =>
          JSON.stringify(key) + ":" + stableJson(object[key])
      )
      .join(",") +
    "}"
  );
}

function sha256(value: unknown) {
  return createHash("sha256")
    .update(
      typeof value === "string" ? value : stableJson(value),
      "utf8"
    )
    .digest("hex");
}

export function hostInstallSha256(value: unknown) {
  return sha256(value);
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizedKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findForbiddenSecretPath(
  value: unknown,
  path = "manifest"
): string | null {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findForbiddenSecretPath(
        value[index],
        path + "[" + index + "]"
      );
      if (found) return found;
    }
    return null;
  }

  const object = record(value);
  if (!object) return null;
  for (const [key, child] of Object.entries(object)) {
    if (FORBIDDEN_SECRET_KEYS.has(normalizedKey(key))) {
      return path + "." + key;
    }
    const found = findForbiddenSecretPath(
      child,
      path + "." + key
    );
    if (found) return found;
  }
  return null;
}

function strictKeys(
  object: Record<string, unknown>,
  allowed: readonly string[],
  code: string
) {
  const set = new Set(allowed);
  if (Object.keys(object).some((key) => !set.has(key))) {
    throw new Error(code);
  }
}

function text(
  value: unknown,
  code: string,
  minimum = 1,
  maximum = 160
) {
  const result = String(value ?? "").trim();
  if (
    result.length < minimum ||
    result.length > maximum ||
    /[\r\n\0]/.test(result)
  ) {
    throw new Error(code);
  }
  return result;
}

function opaqueId(value: unknown, code: string) {
  const result = text(value, code, 3, 160);
  if (!OPAQUE_ID_PATTERN.test(result)) {
    throw new Error(code);
  }
  return result;
}

function applicationId(value: unknown) {
  const result = text(
    value,
    "module_installer_host_application_invalid",
    3,
    120
  );
  if (!APPLICATION_ID_PATTERN.test(result)) {
    throw new Error("module_installer_host_application_invalid");
  }
  return result;
}

function environment(value: unknown): HostEnvironment {
  const result = String(value ?? "") as HostEnvironment;
  if (
    result !== "development" &&
    result !== "test" &&
    result !== "staging" &&
    result !== "production"
  ) {
    throw new Error("module_installer_environment_invalid");
  }
  return result;
}

function adapterKind(value: unknown): ModuleHostAdapterKind {
  const result = String(value ?? "") as ModuleHostAdapterKind;
  if (!MODULE_HOST_ADAPTER_KINDS.includes(result)) {
    throw new Error("module_installer_adapter_invalid");
  }
  return result;
}

function surface(value: unknown) {
  const result = String(value ?? "");
  if (!MODULE_SURFACES.some((item) => item.id === result)) {
    throw new Error("module_installer_surface_invalid");
  }
  return result;
}

function credentialReferenceKind(
  value: unknown
): InstallerCredentialReferenceKind {
  const result = String(value ?? "") as InstallerCredentialReferenceKind;
  if (!INSTALLER_CREDENTIAL_REFERENCE_KINDS.includes(result)) {
    throw new Error(
      "module_installer_credential_reference_kind_invalid"
    );
  }
  return result;
}

function credentialRequirement(
  value: unknown
): HostInstallCredentialRequirement {
  const object = record(value);
  if (!object) {
    throw new Error(
      "module_installer_credential_requirement_invalid"
    );
  }
  strictKeys(
    object,
    [
      "requirementId",
      "label",
      "required",
      "acceptedReferenceKinds"
    ],
    "module_installer_credential_requirement_unknown_field"
  );
  const requirementId = text(
    object.requirementId,
    "module_installer_credential_requirement_id_invalid",
    3,
    80
  );
  if (!REQUIREMENT_ID_PATTERN.test(requirementId)) {
    throw new Error(
      "module_installer_credential_requirement_id_invalid"
    );
  }
  if (!Array.isArray(object.acceptedReferenceKinds)) {
    throw new Error(
      "module_installer_credential_reference_kinds_invalid"
    );
  }
  const acceptedReferenceKinds = [
    ...new Set(
      object.acceptedReferenceKinds.map(
        credentialReferenceKind
      )
    )
  ];
  if (
    acceptedReferenceKinds.length < 1 ||
    acceptedReferenceKinds.length > 3
  ) {
    throw new Error(
      "module_installer_credential_reference_kinds_invalid"
    );
  }

  return Object.freeze({
    requirementId,
    label: text(
      object.label,
      "module_installer_credential_requirement_label_invalid",
      3,
      120
    ),
    required: object.required !== false,
    acceptedReferenceKinds
  });
}

function credentialBinding(
  value: unknown
): HostInstallCredentialBinding {
  const object = record(value);
  if (!object) {
    throw new Error("module_installer_credential_binding_invalid");
  }
  strictKeys(
    object,
    ["requirementId", "credentialRefId"],
    "module_installer_credential_binding_unknown_field"
  );
  return Object.freeze({
    requirementId: text(
      object.requirementId,
      "module_installer_credential_binding_requirement_invalid",
      3,
      80
    ),
    credentialRefId: opaqueId(
      object.credentialRefId,
      "module_installer_credential_binding_reference_invalid"
    )
  });
}

function transportInput(
  value: unknown
): HostInstallTransportInput {
  const object = record(value);
  if (!object) {
    throw new Error("module_installer_transport_invalid");
  }
  strictKeys(
    object,
    [
      "transportId",
      "displayName",
      "kind",
      "destinationOrigin",
      "securityLevel",
      "localRelay"
    ],
    "module_installer_transport_unknown_field"
  );
  const kind = String(object.kind ?? "") as SecureTransportKind;
  if (!SECURE_TRANSPORT_KINDS.includes(kind)) {
    throw new Error("module_installer_transport_kind_invalid");
  }
  const securityLevel = String(
    object.securityLevel ?? ""
  ) as TransportSecurityLevel;
  if (!TRANSPORT_SECURITY_LEVELS.includes(securityLevel)) {
    throw new Error(
      "module_installer_transport_security_invalid"
    );
  }
  let localRelay: HostInstallTransportInput["localRelay"] = null;
  if (object.localRelay !== null && object.localRelay !== undefined) {
    const relay = record(object.localRelay);
    if (!relay) {
      throw new Error(
        "module_installer_transport_local_relay_invalid"
      );
    }
    strictKeys(
      relay,
      ["relayId", "trustReference"],
      "module_installer_transport_local_relay_unknown_field"
    );
    localRelay = {
      relayId: opaqueId(
        relay.relayId,
        "module_installer_transport_relay_id_invalid"
      ),
      trustReference: opaqueId(
        relay.trustReference,
        "module_installer_transport_trust_reference_invalid"
      )
    };
  }

  return Object.freeze({
    transportId: applicationId(object.transportId),
    displayName: text(
      object.displayName,
      "module_installer_transport_name_invalid",
      3,
      160
    ),
    kind,
    destinationOrigin: text(
      object.destinationOrigin,
      "module_installer_transport_origin_invalid",
      8,
      300
    ),
    securityLevel,
    localRelay
  });
}

function normalizeManifest(input: unknown): HostInstallManifest {
  const secretPath = findForbiddenSecretPath(input);
  if (secretPath) {
    throw new Error(
      "module_installer_raw_secret_field_forbidden:" + secretPath
    );
  }

  const object = record(input);
  if (!object) {
    throw new Error("module_installer_manifest_invalid");
  }
  strictKeys(
    object,
    [
      "schema",
      "manifestVersion",
      "hostContractVersion",
      "protocolVersion",
      "hostApplication",
      "tenancy",
      "runtime",
      "defaultSurface",
      "requestedCapabilities",
      "credentialRequirements",
      "credentialBindings",
      "transport"
    ],
    "module_installer_manifest_unknown_field"
  );
  if (
    object.schema !== MODULE_HOST_INSTALL_MANIFEST_SCHEMA ||
    object.manifestVersion !== 1
  ) {
    throw new Error("module_installer_manifest_version_invalid");
  }

  const hostApplication = record(object.hostApplication);
  const tenancy = record(object.tenancy);
  const runtime = record(object.runtime);
  if (!hostApplication || !tenancy || !runtime) {
    throw new Error("module_installer_manifest_structure_invalid");
  }
  strictKeys(
    hostApplication,
    ["id", "instanceId", "environment", "displayName"],
    "module_installer_host_application_unknown_field"
  );
  strictKeys(
    tenancy,
    ["hostTenantId", "platformTenantId", "workspaceId"],
    "module_installer_tenancy_unknown_field"
  );
  strictKeys(
    runtime,
    ["framework"],
    "module_installer_runtime_unknown_field"
  );

  if (!Array.isArray(object.requestedCapabilities)) {
    throw new Error("module_installer_capabilities_invalid");
  }
  const requestedCapabilities = [
    ...new Set(object.requestedCapabilities.map(String))
  ];
  if (
    requestedCapabilities.length < 1 ||
    requestedCapabilities.length > 32
  ) {
    throw new Error("module_installer_capabilities_invalid");
  }

  if (!Array.isArray(object.credentialRequirements)) {
    throw new Error(
      "module_installer_credential_requirements_invalid"
    );
  }
  const credentialRequirements =
    object.credentialRequirements.map(credentialRequirement);
  if (
    credentialRequirements.length > 20 ||
    new Set(
      credentialRequirements.map((item) => item.requirementId)
    ).size !== credentialRequirements.length
  ) {
    throw new Error(
      "module_installer_credential_requirements_invalid"
    );
  }

  if (!Array.isArray(object.credentialBindings)) {
    throw new Error(
      "module_installer_credential_bindings_invalid"
    );
  }
  const credentialBindings =
    object.credentialBindings.map(credentialBinding);
  if (
    credentialBindings.length > 20 ||
    new Set(
      credentialBindings.map((item) => item.requirementId)
    ).size !== credentialBindings.length
  ) {
    throw new Error(
      "module_installer_credential_bindings_invalid"
    );
  }

  return Object.freeze({
    schema: MODULE_HOST_INSTALL_MANIFEST_SCHEMA,
    manifestVersion: 1 as const,
    hostContractVersion: Number(object.hostContractVersion),
    protocolVersion: Number(object.protocolVersion),
    hostApplication: Object.freeze({
      id: applicationId(hostApplication.id),
      instanceId: opaqueId(
        hostApplication.instanceId,
        "module_installer_host_instance_invalid"
      ),
      environment: environment(hostApplication.environment),
      displayName: text(
        hostApplication.displayName,
        "module_installer_host_display_name_invalid",
        2,
        160
      )
    }),
    tenancy: Object.freeze({
      hostTenantId: opaqueId(
        tenancy.hostTenantId,
        "module_installer_host_tenant_invalid"
      ),
      platformTenantId: opaqueId(
        tenancy.platformTenantId,
        "module_installer_platform_tenant_invalid"
      ),
      workspaceId: opaqueId(
        tenancy.workspaceId,
        "module_installer_workspace_invalid"
      )
    }),
    runtime: Object.freeze({
      framework: adapterKind(runtime.framework)
    }),
    defaultSurface: surface(object.defaultSurface),
    requestedCapabilities,
    credentialRequirements,
    credentialBindings,
    transport: transportInput(object.transport)
  });
}

function check(
  id: HostInstallCheck["id"],
  state: HostInstallCheck["state"],
  detail: string
): HostInstallCheck {
  return Object.freeze({ id, state, detail });
}

export function buildHostInstallDryRun(input: {
  manifest: unknown;
  credentialEvidence: readonly HostInstallCredentialEvidence[];
  now?: string;
}): HostInstallDryRun {
  const manifest = normalizeManifest(input.manifest);
  const checks: HostInstallCheck[] = [];
  const nowMs = Date.parse(input.now ?? new Date().toISOString());
  if (!Number.isFinite(nowMs)) {
    throw new Error("module_installer_dry_run_time_invalid");
  }

  checks.push(
    check(
      "manifest",
      "pass",
      "Manifest structure is valid and contains no raw secret-like fields."
    )
  );

  const compatibilityPass =
    manifest.hostContractVersion ===
      UNIVERSAL_HOST_CONTRACT_VERSION &&
    manifest.protocolVersion ===
      UNIVERSAL_MODULE_PROTOCOL_VERSION;
  checks.push(
    check(
      "compatibility",
      compatibilityPass ? "pass" : "held",
      compatibilityPass
        ? "Host contract and module protocol versions are compatible."
        : "Host contract or protocol version is incompatible."
    )
  );

  const adapter = getModuleHostAdapter(
    manifest.runtime.framework
  );
  checks.push(
    check(
      "adapter",
      "pass",
      "Selected " +
        adapter.displayName +
        " from the host runtime manifest."
    )
  );

  checks.push(
    check(
      "tenant-workspace",
      "pass",
      "Exact host tenant, platform tenant and workspace mapping is explicit; no fallback is inferred."
    )
  );

  const supportedSet = new Set<string>(
    MODULE_HEADLESS_CAPABILITIES
  );
  const unsupported = manifest.requestedCapabilities.filter(
    (capability) => !supportedSet.has(capability)
  );
  const supported = manifest.requestedCapabilities.filter(
    (capability) => supportedSet.has(capability)
  );
  checks.push(
    check(
      "capabilities",
      unsupported.length === 0 ? "pass" : "held",
      unsupported.length === 0
        ? "Every requested capability is discoverable; none is granted by this preview."
        : "Unsupported requested capabilities: " +
            unsupported.join(", ")
    )
  );

  const requirementById = new Map(
    manifest.credentialRequirements.map((item) => [
      item.requirementId,
      item
    ])
  );
  const bindingByRequirement = new Map(
    manifest.credentialBindings.map((item) => [
      item.requirementId,
      item
    ])
  );
  const evidenceByReference = new Map(
    input.credentialEvidence.map((item) => [
      item.credentialRefId,
      item
    ])
  );

  const missingRequired: string[] = [];
  const invalidBindings: string[] = [];
  let satisfied = 0;

  for (const requirement of manifest.credentialRequirements) {
    const binding = bindingByRequirement.get(
      requirement.requirementId
    );
    if (!binding) {
      if (requirement.required) {
        missingRequired.push(requirement.requirementId);
      }
      continue;
    }
    const evidence = evidenceByReference.get(
      binding.credentialRefId
    );
    const expiryMs =
      evidence?.expiresAt === null || evidence?.expiresAt === undefined
        ? null
        : Date.parse(evidence.expiresAt);
    if (
      !evidence ||
      evidence.workspaceId !== manifest.tenancy.workspaceId ||
      evidence.requirementId !== requirement.requirementId ||
      evidence.lifecycleStatus !== "active" ||
      !requirement.acceptedReferenceKinds.includes(
        evidence.referenceKind
      ) ||
      (expiryMs !== null &&
        (!Number.isFinite(expiryMs) || expiryMs <= nowMs))
    ) {
      invalidBindings.push(requirement.requirementId);
      continue;
    }
    satisfied += 1;
  }

  for (const binding of manifest.credentialBindings) {
    if (!requirementById.has(binding.requirementId)) {
      invalidBindings.push(binding.requirementId);
    }
  }

  const credentialPass =
    missingRequired.length === 0 &&
    invalidBindings.length === 0;
  checks.push(
    check(
      "credential-references",
      credentialPass ? "pass" : "held",
      credentialPass
        ? "Required credential-reference metadata is satisfied without reading secret values."
        : [
            missingRequired.length
              ? "missing: " + missingRequired.join(", ")
              : null,
            invalidBindings.length
              ? "invalid: " +
                [...new Set(invalidBindings)].join(", ")
              : null
          ]
            .filter(Boolean)
            .join("; ")
    )
  );

  const transport = createSecureTransportManifest({
    transportId: manifest.transport.transportId,
    displayName: manifest.transport.displayName,
    kind: manifest.transport.kind,
    environment: manifest.hostApplication.environment,
    destinationOrigin:
      manifest.transport.destinationOrigin,
    originAllowlist: [
      manifest.transport.destinationOrigin
    ],
    enabled: true,
    failoverEligible: false,
    securityLevel: manifest.transport.securityLevel,
    health: {
      method: "GET",
      path: "/health",
      expectedStatuses: [200],
      timeoutMs: 3_000
    },
    localRelay: manifest.transport.localRelay
  });
  checks.push(
    check(
      "transport",
      "pass",
      "Transport configuration is valid. No runtime transport health probe or network selection was performed."
    )
  );

  checks.push(
    check(
      "security-boundary",
      "pass",
      "Dry run grants no trust, capability, credential, connection or host-file authority."
    )
  );

  const state = checks.every(
    (item) => item.state === "pass"
  )
    ? ("pass" as const)
    : ("held" as const);

  return Object.freeze({
    schema: MODULE_HOST_INSTALL_DRY_RUN_SCHEMA,
    version: MODULE_HOST_INSTALLER_VERSION,
    manifestSha256: sha256(manifest),
    state,
    ownerApprovalEligible: state === "pass",
    host: Object.freeze({
      hostApplicationId: manifest.hostApplication.id,
      hostInstanceId: manifest.hostApplication.instanceId,
      environment: manifest.hostApplication.environment,
      hostTenantId: manifest.tenancy.hostTenantId,
      platformTenantId: manifest.tenancy.platformTenantId,
      workspaceId: manifest.tenancy.workspaceId
    }),
    adapter: Object.freeze({
      kind: adapter.kind,
      adapterId: adapter.adapterId,
      displayName: adapter.displayName
    }),
    capabilityPreview: Object.freeze({
      requested: [...manifest.requestedCapabilities],
      supported,
      unsupported,
      granted: [] as []
    }),
    credentialPreview: Object.freeze({
      requirements: manifest.credentialRequirements.length,
      required: manifest.credentialRequirements.filter(
        (item) => item.required
      ).length,
      satisfied,
      missingRequired,
      invalidBindings: [...new Set(invalidBindings)],
      rawSecretValuesRead: false as const
    }),
    transportPreparation: Object.freeze({
      transportId: transport.transportId,
      kind: transport.kind,
      destinationOrigin: transport.destinationOrigin,
      securityLevel: transport.securityLevel,
      healthVerified: false as const,
      runtimeSelectionPerformed: false as const,
      networkRequestPerformed: false as const,
      authorizationGranted: false as const
    }),
    checks,
    security: Object.freeze({
      connectionActivated: false as const,
      trustAuthorized: false as const,
      capabilitiesGranted: false as const,
      credentialsCreated: false as const,
      rawSecretsAccepted: false as const,
      hostFilesWritten: false as const,
      networkRequestPerformed: false as const
    })
  });
}

export function normalizeHostInstallManifest(
  input: unknown
): HostInstallManifest {
  return normalizeManifest(input);
}

export function generateApprovedHostInstallPackage(input: {
  enrollmentId: string;
  approvalEventId: string;
  approvedAt: string;
  manifest: unknown;
  dryRun: HostInstallDryRun;
  dryRunSha256: string;
  generatedAt?: string;
}): HostInstallPackage {
  const manifest = normalizeManifest(input.manifest);
  if (
    input.dryRun.state !== "pass" ||
    input.dryRun.ownerApprovalEligible !== true ||
    input.dryRun.manifestSha256 !== sha256(manifest)
  ) {
    throw new Error(
      "module_installer_approved_package_dry_run_invalid"
    );
  }

  const capabilities =
    manifest.requestedCapabilities as ModuleHeadlessCapability[];
  const scaffold = generateModuleHostScaffold({
    adapter: manifest.runtime.framework,
    hostApplicationId: manifest.hostApplication.id,
    environment: manifest.hostApplication.environment,
    defaultSurface: manifest.defaultSurface,
    requestedCapabilities: capabilities
  });

  const installation = {
    schema:
      "rosevear.ai-data-platform.host-installation-config.v1",
    module: {
      id: AI_DATA_MODULE_ID,
      version: AI_DATA_MODULE_VERSION,
      protocolVersion: UNIVERSAL_MODULE_PROTOCOL_VERSION,
      hostContractVersion: UNIVERSAL_HOST_CONTRACT_VERSION
    },
    enrollmentId: input.enrollmentId,
    approvalEventId: input.approvalEventId,
    approvedAt: new Date(input.approvedAt).toISOString(),
    host: input.dryRun.host,
    adapter: input.dryRun.adapter,
    defaultSurface: manifest.defaultSurface,
    requestedCapabilities: manifest.requestedCapabilities,
    credentialReferences: manifest.credentialBindings.map(
      (binding) => ({
        requirementId: binding.requirementId,
        credentialRefId: binding.credentialRefId
      })
    ),
    transport: {
      transportId:
        input.dryRun.transportPreparation.transportId,
      kind: input.dryRun.transportPreparation.kind,
      destinationOrigin:
        input.dryRun.transportPreparation.destinationOrigin,
      securityLevel:
        input.dryRun.transportPreparation.securityLevel,
      healthVerified: false,
      runtimeSelectionPerformed: false
    },
    authority: {
      ownerPreparationApproved: true,
      connectionActivated: false,
      trustAuthorized: false,
      capabilitiesGranted: false,
      credentialValuesIncluded: false
    }
  };

  const ownerReadme = [
    "# Build 327 owner-approved host integration package",
    "",
    "This package was generated after an explicit owner/admin approval of the Build 327 installation dry run.",
    "",
    "Enrollment: " + input.enrollmentId,
    "Approval event: " + input.approvalEventId,
    "Host: " + manifest.hostApplication.id,
    "Instance: " + manifest.hostApplication.instanceId,
    "Environment: " + manifest.hostApplication.environment,
    "",
    "Important boundaries:",
    "",
    "- Approval authorizes generation of this preparation package only.",
    "- The package does not activate a connection.",
    "- The package does not authorize trust or capability grants.",
    "- It contains credential-reference IDs only, never secret values or credential locators.",
    "- The selected transport is configuration only; runtime health evidence and Build 323 selection are still required.",
    "- The host must apply the files itself. AI Data Platform did not write into the host repository or filesystem.",
    "- Build 326 autonomy remains fail closed until a separate per-host policy is explicitly configured.",
    ""
  ].join("\n");

  const files = [
    ...scaffold.files,
    {
      path: "ai-data-installation.json",
      content: JSON.stringify(installation, null, 2) + "\n"
    },
    {
      path: "OWNER-APPROVAL.md",
      content: ownerReadme
    }
  ];

  const generatedAt = new Date(
    input.generatedAt ?? new Date().toISOString()
  ).toISOString();
  const packageSha256 = sha256(
    files.map((file) => [file.path, file.content])
  );

  return Object.freeze({
    schema: MODULE_HOST_INSTALL_PACKAGE_SCHEMA,
    version: MODULE_HOST_INSTALLER_VERSION,
    enrollmentId: input.enrollmentId,
    approvalEventId: input.approvalEventId,
    manifestSha256: input.dryRun.manifestSha256,
    dryRunSha256: input.dryRunSha256,
    packageSha256,
    generatedAt,
    host: input.dryRun.host,
    adapter: input.dryRun.adapter,
    files,
    security: Object.freeze({
      generatedAfterOwnerApproval: true as const,
      rawSecretsIncluded: false as const,
      credentialLocatorsIncluded: false as const,
      connectionActivated: false as const,
      trustAuthorized: false as const,
      capabilitiesGranted: false as const,
      hostFilesWrittenByPlatform: false as const
    })
  });
}

export function moduleHostInstallerDescriptor() {
  return Object.freeze({
    schema:
      "rosevear.ai-data-platform.host-installer-descriptor.v1",
    version: MODULE_HOST_INSTALLER_VERSION,
    moduleId: AI_DATA_MODULE_ID,
    moduleVersion: AI_DATA_MODULE_VERSION,
    discovery: {
      explicitManifestInput: true,
      filesystemScanPerformed: false,
      networkScanPerformed: false,
      rawSecretsAccepted: false
    },
    adapters: [...MODULE_HOST_ADAPTER_KINDS],
    surfaces: MODULE_SURFACES.map((item) => item.id),
    capabilities: [...MODULE_HEADLESS_CAPABILITIES],
    credentialReferenceKinds: [
      ...INSTALLER_CREDENTIAL_REFERENCE_KINDS
    ],
    transportKinds: [...SECURE_TRANSPORT_KINDS],
    workflow: [
      "manifest-discovery",
      "adapter-selection",
      "tenant-workspace-mapping",
      "capability-preview",
      "credential-reference-validation",
      "transport-configuration-selection",
      "compatibility-validation",
      "install-dry-run",
      "owner-approval",
      "package-generation"
    ] as const,
    security: {
      preparationOnly: true,
      ownerApprovalRequiredForPackage: true,
      ownerApprovalActivatesConnection: false,
      ownerApprovalAuthorizesTrust: false,
      capabilityPreviewGrantsAuthorization: false,
      credentialValuesRead: false,
      credentialLocatorsIncludedInPackage: false,
      transportPreparationPerformsNetworkRequest: false,
      runtimeTransportHealthStillRequired: true,
      hostFilesWrittenAutomatically: false,
      autonomyPolicyCreatedAutomatically: false
    }
  });
}
