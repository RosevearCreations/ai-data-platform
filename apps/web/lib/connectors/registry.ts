import {
  defineConnector,
  type ConnectorDefinition,
  type ConnectorManifest
} from "@rosevear/ai-data-connector-sdk";

function transformText(value: string, mode: string, trim: boolean) {
  const base = trim ? value.trim().replace(/\s+/g, " ") : value;
  if (mode === "lower") return base.toLowerCase();
  if (mode === "upper") return base.toUpperCase();
  return base;
}

const exampleNormalizer = defineConnector(
  {
    manifestVersion: 2,
    sdkVersion: 2,
    key: "example.no-secret-normalizer",
    version: "2.0.0",
    displayName: "Example no-secret normalizer",
    description:
      "Build 289 SDK v2 sample connector. It normalizes bounded records locally without credentials or network access.",
    capabilities: ["import", "enrichment"],
    configSchema: [
      {
        key: "trim",
        label: "Trim whitespace",
        description: "Trim and collapse repeated whitespace in string fields.",
        type: "boolean",
        required: true,
        defaultValue: true
      },
      {
        key: "case",
        label: "Text case",
        description: "Optional string case transform.",
        type: "string",
        required: true,
        defaultValue: "preserve",
        allowedValues: ["preserve", "lower", "upper"]
      }
    ],
    secrets: [],
    limits: { maxExecutionMs: 2000, maxInputBytes: 50000, maxOutputBytes: 50000 },
    transport: { kind: "local" }
  },
  async ({ input, config, signal }) => {
    if (signal.aborted) throw new Error("connector_execution_aborted");
    const source =
      input && typeof input === "object" && !Array.isArray(input)
        ? (input as Record<string, unknown>)
        : {};
    const records = Array.isArray(source.records) ? source.records.slice(0, 100) : [];
    const trim = config.trim !== false;
    const mode = typeof config.case === "string" ? config.case : "preserve";
    const normalized = records.map((record) => {
      if (!record || typeof record !== "object" || Array.isArray(record)) return record;
      return Object.fromEntries(
        Object.entries(record as Record<string, unknown>).map(([key, value]) => [
          key,
          typeof value === "string" ? transformText(value, mode, trim) : value
        ])
      );
    });
    return {
      output: { records: normalized },
      summary: { records: normalized.length, case: mode, trimmed: trim, sdk: 2 }
    };
  }
);

const definitions = [exampleNormalizer] as const;
const registry = new Map<string, ConnectorDefinition>(
  definitions.map((definition) => [definition.manifest.key, definition])
);

export function listRegisteredConnectorManifests(): ConnectorManifest[] {
  return definitions.map((definition) => definition.manifest);
}

export function getRegisteredConnector(key: string) {
  return registry.get(key) ?? null;
}
