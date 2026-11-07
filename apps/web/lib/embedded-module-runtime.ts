import {
  AI_DATA_MODULE_ID,
  AI_DATA_MODULE_VERSION,
  MODULE_SURFACES
} from "./universal-module-contract";

export const EMBEDDED_MODULE_RUNTIME_VERSION = "1.0.0" as const;
export const EMBEDDED_MODULE_RUNTIME_SCHEMA =
  "rosevear.ai-data-platform.embedded-module-runtime.v1" as const;
export const EMBEDDED_MODULE_ELEMENT_TAG =
  "rosevear-ai-data-module" as const;

export const EMBEDDED_MODULE_SANDBOX =
  "allow-forms allow-scripts allow-same-origin" as const;
export const EMBEDDED_MODULE_REFERRER_POLICY = "origin" as const;

export const EMBEDDED_HOST_MESSAGE_TYPES = [
  "runtime.ping",
  "runtime.reload",
  "surface.navigate"
] as const;

export const EMBEDDED_MODULE_MESSAGE_TYPES = [
  "runtime.ready",
  "runtime.pong",
  "runtime.error",
  "runtime.unmounting",
  "surface.changed"
] as const;

export type EmbeddedHostMessageType =
  (typeof EMBEDDED_HOST_MESSAGE_TYPES)[number];
export type EmbeddedModuleMessageType =
  (typeof EMBEDDED_MODULE_MESSAGE_TYPES)[number];

export type EmbeddedSurfaceId = (typeof MODULE_SURFACES)[number]["id"];

export type EmbeddedSurfaceDescriptor = {
  id: EmbeddedSurfaceId;
  route: string;
  mutating: boolean;
};

export type EmbeddedRuntimeState =
  | "idle"
  | "mounted"
  | "reloading"
  | "unmounted"
  | "failed";

export type EmbeddedMountDescriptor = {
  schema: typeof EMBEDDED_MODULE_RUNTIME_SCHEMA;
  runtimeVersion: typeof EMBEDDED_MODULE_RUNTIME_VERSION;
  moduleId: typeof AI_DATA_MODULE_ID;
  moduleVersion: typeof AI_DATA_MODULE_VERSION;
  runtimeInstanceId: string;
  auditCorrelationId: string;
  hostOrigin: string;
  moduleOrigin: string;
  surface: EmbeddedSurfaceDescriptor;
  iframe: {
    src: string;
    sandbox: typeof EMBEDDED_MODULE_SANDBOX;
    referrerPolicy: typeof EMBEDDED_MODULE_REFERRER_POLICY;
    loading: "eager";
    allow: "";
  };
  security: {
    exactTargetOriginRequired: true;
    wildcardOriginsAllowed: false;
    rawHostSecretsAccepted: false;
    mountGrantsAuthorization: false;
    frameAncestorsMustBeServerEnforced: true;
  };
};

export type EmbeddedHostToModuleMessage =
  | {
      schema: "rosevear.ai-data-platform.embed-host-message.v1";
      type: "runtime.ping";
      runtimeInstanceId: string;
      auditCorrelationId: string;
    }
  | {
      schema: "rosevear.ai-data-platform.embed-host-message.v1";
      type: "runtime.reload";
      runtimeInstanceId: string;
      auditCorrelationId: string;
    }
  | {
      schema: "rosevear.ai-data-platform.embed-host-message.v1";
      type: "surface.navigate";
      runtimeInstanceId: string;
      auditCorrelationId: string;
      surfaceId: EmbeddedSurfaceId;
    };

export type EmbeddedModuleToHostMessage =
  | {
      schema: "rosevear.ai-data-platform.embed-module-message.v1";
      type: "runtime.ready" | "runtime.pong" | "runtime.unmounting";
      runtimeInstanceId: string;
      auditCorrelationId: string;
      surfaceId: EmbeddedSurfaceId;
    }
  | {
      schema: "rosevear.ai-data-platform.embed-module-message.v1";
      type: "surface.changed";
      runtimeInstanceId: string;
      auditCorrelationId: string;
      surfaceId: EmbeddedSurfaceId;
    }
  | {
      schema: "rosevear.ai-data-platform.embed-module-message.v1";
      type: "runtime.error";
      runtimeInstanceId: string;
      auditCorrelationId: string;
      surfaceId: EmbeddedSurfaceId;
      errorCode:
        | "invalid_origin"
        | "invalid_message"
        | "invalid_surface"
        | "reload_failed";
    };

export type EmbeddedFramePort = {
  mount(descriptor: EmbeddedMountDescriptor): void | Promise<void>;
  reload(descriptor: EmbeddedMountDescriptor): void | Promise<void>;
  navigate(descriptor: EmbeddedMountDescriptor): void | Promise<void>;
  unmount(): void | Promise<void>;
};

export class EmbeddedModuleRuntimeError extends Error {
  readonly code:
    | "invalid_origin"
    | "invalid_surface"
    | "invalid_runtime_identity"
    | "invalid_message"
    | "runtime_not_mounted"
    | "runtime_mount_failed"
    | "runtime_reload_failed"
    | "runtime_navigation_failed"
    | "runtime_unmount_failed";

  constructor(
    code: EmbeddedModuleRuntimeError["code"],
    message: string
  ) {
    super(message);
    this.name = "EmbeddedModuleRuntimeError";
    this.code = code;
  }
}

const OPAQUE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/+-]{7,127}$/;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype
  );
}

function exactKeys(
  value: Record<string, unknown>,
  keys: readonly string[]
) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function assertOpaqueIdentity(value: string, label: string) {
  if (!OPAQUE_ID_PATTERN.test(value)) {
    throw new EmbeddedModuleRuntimeError(
      "invalid_runtime_identity",
      label + " is invalid."
    );
  }
}

export function normalizeTrustedOrigin(value: string): string {
  const input = value.trim();
  if (!input || input === "*" || input.includes(" ")) {
    throw new EmbeddedModuleRuntimeError(
      "invalid_origin",
      "Embedded module origins must be exact origins; wildcards are not allowed."
    );
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new EmbeddedModuleRuntimeError(
      "invalid_origin",
      "Embedded module origin is not a valid absolute URL."
    );
  }

  const localHttp =
    url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname);

  if (url.protocol !== "https:" && !localHttp) {
    throw new EmbeddedModuleRuntimeError(
      "invalid_origin",
      "Embedded module origins require HTTPS except for local development."
    );
  }

  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new EmbeddedModuleRuntimeError(
      "invalid_origin",
      "Embedded module origin must not contain credentials, path, query or fragment."
    );
  }

  return url.origin;
}

export function parseConfiguredEmbedHostOrigins(
  raw: string | undefined
): string[] {
  if (!raw?.trim()) return [];

  const values = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizeTrustedOrigin);

  return [...new Set(values)];
}

export function resolveEmbeddedSurface(
  value: string
): EmbeddedSurfaceDescriptor {
  const surface = MODULE_SURFACES.find((candidate) => candidate.id === value);
  if (!surface) {
    throw new EmbeddedModuleRuntimeError(
      "invalid_surface",
      "Requested embedded module surface is unsupported."
    );
  }

  return {
    id: surface.id,
    route: surface.route,
    mutating: surface.mutating
  };
}

export function createEmbeddedFrameUrl(input: {
  moduleOrigin: string;
  hostOrigin: string;
  surfaceId: string;
  runtimeInstanceId: string;
  auditCorrelationId: string;
}) {
  const moduleOrigin = normalizeTrustedOrigin(input.moduleOrigin);
  const hostOrigin = normalizeTrustedOrigin(input.hostOrigin);
  const surface = resolveEmbeddedSurface(input.surfaceId);
  assertOpaqueIdentity(input.runtimeInstanceId, "Runtime instance ID");
  assertOpaqueIdentity(input.auditCorrelationId, "Audit correlation ID");

  const url = new URL(
    "/module-embed/" + encodeURIComponent(surface.id),
    moduleOrigin
  );
  url.searchParams.set("runtimeId", input.runtimeInstanceId);
  url.searchParams.set("hostOrigin", hostOrigin);
  url.searchParams.set("auditCorrelationId", input.auditCorrelationId);
  return url.toString();
}

export function createEmbeddedMountDescriptor(input: {
  moduleOrigin: string;
  hostOrigin: string;
  surfaceId: string;
  runtimeInstanceId: string;
  auditCorrelationId: string;
}): EmbeddedMountDescriptor {
  const hostOrigin = normalizeTrustedOrigin(input.hostOrigin);
  const moduleOrigin = normalizeTrustedOrigin(input.moduleOrigin);
  const surface = resolveEmbeddedSurface(input.surfaceId);

  return Object.freeze({
    schema: EMBEDDED_MODULE_RUNTIME_SCHEMA,
    runtimeVersion: EMBEDDED_MODULE_RUNTIME_VERSION,
    moduleId: AI_DATA_MODULE_ID,
    moduleVersion: AI_DATA_MODULE_VERSION,
    runtimeInstanceId: input.runtimeInstanceId,
    auditCorrelationId: input.auditCorrelationId,
    hostOrigin,
    moduleOrigin,
    surface,
    iframe: {
      src: createEmbeddedFrameUrl({
        moduleOrigin,
        hostOrigin,
        surfaceId: surface.id,
        runtimeInstanceId: input.runtimeInstanceId,
        auditCorrelationId: input.auditCorrelationId
      }),
      sandbox: EMBEDDED_MODULE_SANDBOX,
      referrerPolicy: EMBEDDED_MODULE_REFERRER_POLICY,
      loading: "eager",
      allow: ""
    },
    security: {
      exactTargetOriginRequired: true,
      wildcardOriginsAllowed: false,
      rawHostSecretsAccepted: false,
      mountGrantsAuthorization: false,
      frameAncestorsMustBeServerEnforced: true
    }
  });
}

export function validateEmbeddedHostMessage(input: {
  expectedHostOrigin: string;
  eventOrigin: string;
  runtimeInstanceId: string;
  auditCorrelationId: string;
  value: unknown;
}): EmbeddedHostToModuleMessage {
  const expectedHostOrigin = normalizeTrustedOrigin(input.expectedHostOrigin);
  if (input.eventOrigin !== expectedHostOrigin) {
    throw new EmbeddedModuleRuntimeError(
      "invalid_origin",
      "Host message origin did not match the exact trusted host origin."
    );
  }

  if (!isPlainRecord(input.value)) {
    throw new EmbeddedModuleRuntimeError(
      "invalid_message",
      "Host message must be a plain object."
    );
  }

  const type = input.value.type;
  if (
    typeof type !== "string" ||
    !EMBEDDED_HOST_MESSAGE_TYPES.includes(type as EmbeddedHostMessageType)
  ) {
    throw new EmbeddedModuleRuntimeError(
      "invalid_message",
      "Host message type is unsupported."
    );
  }

  const requiredKeys =
    type === "surface.navigate"
      ? [
          "schema",
          "type",
          "runtimeInstanceId",
          "auditCorrelationId",
          "surfaceId"
        ]
      : ["schema", "type", "runtimeInstanceId", "auditCorrelationId"];

  if (!exactKeys(input.value, requiredKeys)) {
    throw new EmbeddedModuleRuntimeError(
      "invalid_message",
      "Host message contains missing or unexpected fields."
    );
  }

  if (
    input.value.schema !==
      "rosevear.ai-data-platform.embed-host-message.v1" ||
    input.value.runtimeInstanceId !== input.runtimeInstanceId ||
    input.value.auditCorrelationId !== input.auditCorrelationId
  ) {
    throw new EmbeddedModuleRuntimeError(
      "invalid_message",
      "Host message runtime identity or correlation did not match."
    );
  }

  if (type === "surface.navigate") {
    if (typeof input.value.surfaceId !== "string") {
      throw new EmbeddedModuleRuntimeError(
        "invalid_surface",
        "Host navigation message surface is invalid."
      );
    }
    const surface = resolveEmbeddedSurface(input.value.surfaceId);
    return {
      schema: "rosevear.ai-data-platform.embed-host-message.v1",
      type: "surface.navigate",
      runtimeInstanceId: input.runtimeInstanceId,
      auditCorrelationId: input.auditCorrelationId,
      surfaceId: surface.id
    };
  }

  return {
    schema: "rosevear.ai-data-platform.embed-host-message.v1",
    type: type as "runtime.ping" | "runtime.reload",
    runtimeInstanceId: input.runtimeInstanceId,
    auditCorrelationId: input.auditCorrelationId
  };
}

export function validateEmbeddedModuleMessage(input: {
  expectedModuleOrigin: string;
  eventOrigin: string;
  runtimeInstanceId: string;
  auditCorrelationId: string;
  value: unknown;
}): EmbeddedModuleToHostMessage {
  const expectedModuleOrigin = normalizeTrustedOrigin(input.expectedModuleOrigin);
  if (input.eventOrigin !== expectedModuleOrigin) {
    throw new EmbeddedModuleRuntimeError(
      "invalid_origin",
      "Module message origin did not match the exact trusted module origin."
    );
  }

  if (!isPlainRecord(input.value)) {
    throw new EmbeddedModuleRuntimeError(
      "invalid_message",
      "Module message must be a plain object."
    );
  }

  const type = input.value.type;
  if (
    typeof type !== "string" ||
    !EMBEDDED_MODULE_MESSAGE_TYPES.includes(type as EmbeddedModuleMessageType)
  ) {
    throw new EmbeddedModuleRuntimeError(
      "invalid_message",
      "Module message type is unsupported."
    );
  }

  const requiredKeys =
    type === "runtime.error"
      ? [
          "schema",
          "type",
          "runtimeInstanceId",
          "auditCorrelationId",
          "surfaceId",
          "errorCode"
        ]
      : [
          "schema",
          "type",
          "runtimeInstanceId",
          "auditCorrelationId",
          "surfaceId"
        ];

  if (!exactKeys(input.value, requiredKeys)) {
    throw new EmbeddedModuleRuntimeError(
      "invalid_message",
      "Module message contains missing or unexpected fields."
    );
  }

  if (
    input.value.schema !==
      "rosevear.ai-data-platform.embed-module-message.v1" ||
    input.value.runtimeInstanceId !== input.runtimeInstanceId ||
    input.value.auditCorrelationId !== input.auditCorrelationId ||
    typeof input.value.surfaceId !== "string"
  ) {
    throw new EmbeddedModuleRuntimeError(
      "invalid_message",
      "Module message runtime identity or correlation did not match."
    );
  }

  const surface = resolveEmbeddedSurface(input.value.surfaceId);

  if (type === "runtime.error") {
    const allowedErrorCodes = [
      "invalid_origin",
      "invalid_message",
      "invalid_surface",
      "reload_failed"
    ] as const;
    if (
      typeof input.value.errorCode !== "string" ||
      !allowedErrorCodes.includes(
        input.value.errorCode as (typeof allowedErrorCodes)[number]
      )
    ) {
      throw new EmbeddedModuleRuntimeError(
        "invalid_message",
        "Module error message code is unsupported."
      );
    }

    return {
      schema: "rosevear.ai-data-platform.embed-module-message.v1",
      type: "runtime.error",
      runtimeInstanceId: input.runtimeInstanceId,
      auditCorrelationId: input.auditCorrelationId,
      surfaceId: surface.id,
      errorCode: input.value.errorCode as
        | "invalid_origin"
        | "invalid_message"
        | "invalid_surface"
        | "reload_failed"
    };
  }

  return {
    schema: "rosevear.ai-data-platform.embed-module-message.v1",
    type: type as
      | "runtime.ready"
      | "runtime.pong"
      | "runtime.unmounting"
      | "surface.changed",
    runtimeInstanceId: input.runtimeInstanceId,
    auditCorrelationId: input.auditCorrelationId,
    surfaceId: surface.id
  };
}

export class EmbeddedModuleRuntimeController {
  private stateValue: EmbeddedRuntimeState = "idle";
  private descriptorValue: EmbeddedMountDescriptor | null = null;
  private readonly port: EmbeddedFramePort;
  private readonly baseInput: {
    moduleOrigin: string;
    hostOrigin: string;
    runtimeInstanceId: string;
    auditCorrelationId: string;
  };

  constructor(input: {
    port: EmbeddedFramePort;
    moduleOrigin: string;
    hostOrigin: string;
    runtimeInstanceId: string;
    auditCorrelationId: string;
  }) {
    this.port = input.port;
    this.baseInput = {
      moduleOrigin: normalizeTrustedOrigin(input.moduleOrigin),
      hostOrigin: normalizeTrustedOrigin(input.hostOrigin),
      runtimeInstanceId: input.runtimeInstanceId,
      auditCorrelationId: input.auditCorrelationId
    };
    assertOpaqueIdentity(input.runtimeInstanceId, "Runtime instance ID");
    assertOpaqueIdentity(input.auditCorrelationId, "Audit correlation ID");
  }

  get state() {
    return this.stateValue;
  }

  get descriptor() {
    return this.descriptorValue;
  }

  async mount(surfaceId: string) {
    const descriptor = createEmbeddedMountDescriptor({
      ...this.baseInput,
      surfaceId
    });

    try {
      await this.port.mount(descriptor);
      this.descriptorValue = descriptor;
      this.stateValue = "mounted";
      return descriptor;
    } catch {
      this.stateValue = "failed";
      throw new EmbeddedModuleRuntimeError(
        "runtime_mount_failed",
        "Embedded module mount failed."
      );
    }
  }

  async navigate(surfaceId: string) {
    if (!this.descriptorValue || this.stateValue === "idle") {
      throw new EmbeddedModuleRuntimeError(
        "runtime_not_mounted",
        "Embedded module must be mounted before navigation."
      );
    }

    const descriptor = createEmbeddedMountDescriptor({
      ...this.baseInput,
      surfaceId
    });

    try {
      await this.port.navigate(descriptor);
      this.descriptorValue = descriptor;
      this.stateValue = "mounted";
      return descriptor;
    } catch {
      this.stateValue = "failed";
      throw new EmbeddedModuleRuntimeError(
        "runtime_navigation_failed",
        "Embedded module navigation failed."
      );
    }
  }

  async reload() {
    if (!this.descriptorValue || this.stateValue !== "mounted") {
      throw new EmbeddedModuleRuntimeError(
        "runtime_not_mounted",
        "Embedded module must be mounted before reload."
      );
    }

    this.stateValue = "reloading";
    try {
      await this.port.reload(this.descriptorValue);
      this.stateValue = "mounted";
      return this.descriptorValue;
    } catch {
      this.stateValue = "failed";
      throw new EmbeddedModuleRuntimeError(
        "runtime_reload_failed",
        "Embedded module reload failed."
      );
    }
  }

  async unmount() {
    if (!this.descriptorValue) {
      this.stateValue = "unmounted";
      return;
    }

    try {
      await this.port.unmount();
      this.descriptorValue = null;
      this.stateValue = "unmounted";
    } catch {
      this.stateValue = "failed";
      throw new EmbeddedModuleRuntimeError(
        "runtime_unmount_failed",
        "Embedded module unmount failed."
      );
    }
  }
}
