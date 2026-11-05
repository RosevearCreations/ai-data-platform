import {
  assertConnectorCapability,
  assertConnectorInputBound,
  assertConnectorOutputBound,
  createExecutionHttpClient,
  normalizeConnectorConfig,
  validateConnectorSecretReferences,
  type ConnectorAuditEvent,
  type ConnectorCapability,
  type ConnectorDefinition,
  type ConnectorSecretReferences
} from "@rosevear/ai-data-connector-sdk";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function freeze(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
  return value;
}

export async function executeConnectorBoundary(input: {
  definition: ConnectorDefinition;
  workspaceId: string;
  capability: ConnectorCapability;
  grantedCapabilities: string[];
  config: unknown;
  secretRefs: unknown;
  payload: unknown;
}) {
  const manifest = input.definition.manifest;
  assertConnectorCapability(manifest, input.grantedCapabilities, input.capability);
  const config = normalizeConnectorConfig(manifest, input.config);
  const secretRefs = validateConnectorSecretReferences(manifest, input.secretRefs);
  assertConnectorInputBound(manifest, input.payload);

  const payload = freeze(clone(input.payload));
  const frozenConfig = freeze(clone(config)) as Record<string, string | number | boolean>;
  const controller = new AbortController();
  const startedAt = Date.now();
  const sdkAuditEvents: ConnectorAuditEvent[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  const resolveSecret = async (key: string) => {
    const declaration = manifest.secrets.find((item) => item.key === key);
    if (!declaration) throw new Error("connector_secret_not_declared");
    const reference = (secretRefs as ConnectorSecretReferences)[key];
    if (
      !reference ||
      reference.kind !== "environment" ||
      reference.environmentVariable !== declaration.environmentVariable
    ) {
      throw new Error("connector_secret_reference_invalid:" + key);
    }
    const value = process.env[declaration.environmentVariable];
    if (!value) throw new Error("connector_secret_not_configured:" + key);
    return value;
  };

  const http = createExecutionHttpClient({
    manifest,
    config: frozenConfig,
    secret: resolveSecret,
    signal: controller.signal,
    audit: {
      record(event) {
        if (sdkAuditEvents.length < 100) sdkAuditEvents.push(clone(event));
      }
    }
  });

  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error("connector_execution_timeout"));
      }, manifest.limits.maxExecutionMs);
    });
    const result = await Promise.race([
      input.definition.execute({
        workspaceId: input.workspaceId,
        capability: input.capability,
        config: frozenConfig,
        input: payload,
        signal: controller.signal,
        secret: resolveSecret,
        http
      }),
      timeout
    ]);
    assertConnectorOutputBound(manifest, result.output);
    return {
      output: clone(result.output),
      summary: clone(result.summary),
      durationMs: Date.now() - startedAt,
      sdkVersion: manifest.sdkVersion,
      manifestVersion: manifest.manifestVersion,
      transportKind:
        manifest.manifestVersion === 2 ? manifest.transport.kind : "legacy",
      transportEvidence: http?.evidence() ?? null,
      sdkAuditEvents: clone(sdkAuditEvents)
    };
  } finally {
    if (timer) clearTimeout(timer);
    controller.abort();
  }
}
