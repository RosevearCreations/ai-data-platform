export const DEFAULT_AI_SUGGESTION_MODEL = "openai/gpt-5.4-mini";

export const FIELD_SEMANTICS = [
  "name",
  "price",
  "url",
  "image",
  "sku",
  "category",
  "location",
  "year",
  "description",
  "quantity",
  "rating",
  "phone",
  "email",
  "other"
] as const;

export const FIELD_SOURCES = ["text", "link", "image", "attribute"] as const;

export const FIELD_TRANSFORMS = [
  "trim",
  "collapse-whitespace",
  "lowercase",
  "uppercase",
  "number",
  "currency"
] as const;

export type FieldSemantic = (typeof FIELD_SEMANTICS)[number];
export type FieldSource = (typeof FIELD_SOURCES)[number];
export type FieldTransform = (typeof FIELD_TRANSFORMS)[number];

export interface AiSuggestionSampleRecord {
  text: string;
  link?: string;
  image?: string;
  fieldHints?: string[];
}

export interface AiSuggestionExistingField {
  key: string;
  label: string;
  source: FieldSource;
}

export interface AiSuggestionRequest {
  intent: string;
  pageUrl?: string;
  recordSelector?: string;
  sampleRecords: AiSuggestionSampleRecord[];
  existingFields?: AiSuggestionExistingField[];
}

export interface AiSuggestedField {
  key: string;
  label: string;
  semantic: FieldSemantic;
  preferredSource: FieldSource;
  required: boolean;
  transforms: FieldTransform[];
  confidence: number;
  reason: string;
  selectorStrategy: "derive-from-picker" | "manual";
}

export interface AiSuggestionTelemetry {
  mode: "gateway" | "deterministic-fallback";
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number | null;
  actualCostUsd: number | null;
}

export interface AiSuggestionResponse {
  summary: string;
  suggestions: AiSuggestedField[];
  telemetry: AiSuggestionTelemetry;
  warnings: string[];
}

const MAX_INTENT_LENGTH = 1200;
const MAX_SAMPLE_RECORDS = 8;
const MAX_SAMPLE_TEXT = 1200;
const MAX_EXISTING_FIELDS = 24;

function cleanString(value: unknown, max: number) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, max)
    : "";
}

function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

function isFieldSource(value: unknown): value is FieldSource {
  return FIELD_SOURCES.includes(value as FieldSource);
}

export function parseSuggestionRequest(input: unknown): AiSuggestionRequest {
  if (!input || typeof input !== "object") {
    throw new Error("Request body must be an object.");
  }

  const body = input as Record<string, unknown>;
  const intent = cleanString(body.intent, MAX_INTENT_LENGTH);

  if (!intent) {
    throw new Error("Extraction intent is required.");
  }

  const rawSamples = Array.isArray(body.sampleRecords)
    ? body.sampleRecords.slice(0, MAX_SAMPLE_RECORDS)
    : [];

  if (!rawSamples.length) {
    throw new Error("At least one sample record is required.");
  }

  const sampleRecords = rawSamples.map((sample) => {
    const record =
      sample && typeof sample === "object"
        ? (sample as Record<string, unknown>)
        : {};

    return {
      text: cleanString(record.text, MAX_SAMPLE_TEXT),
      link: cleanString(record.link, 700) || undefined,
      image: cleanString(record.image, 700) || undefined,
      fieldHints: Array.isArray(record.fieldHints)
        ? record.fieldHints
            .map((value) => cleanString(value, 80))
            .filter(Boolean)
            .slice(0, 12)
        : undefined
    };
  });

  const rawExisting = Array.isArray(body.existingFields)
    ? body.existingFields.slice(0, MAX_EXISTING_FIELDS)
    : [];

  const existingFields = rawExisting
    .map((field) => {
      const record =
        field && typeof field === "object"
          ? (field as Record<string, unknown>)
          : {};
      const key = normalizeKey(cleanString(record.key, 60));
      const label = cleanString(record.label, 100);
      const source = record.source;

      if (!key || !label || !isFieldSource(source)) {
        return null;
      }

      return { key, label, source };
    })
    .filter((field): field is AiSuggestionExistingField => Boolean(field));

  return {
    intent,
    pageUrl: cleanString(body.pageUrl, 1000) || undefined,
    recordSelector: cleanString(body.recordSelector, 1000) || undefined,
    sampleRecords,
    existingFields
  };
}

function suggestion(
  key: string,
  label: string,
  semantic: FieldSemantic,
  preferredSource: FieldSource,
  reason: string,
  confidence: number,
  transforms: FieldTransform[] = ["trim", "collapse-whitespace"],
  required = false
): AiSuggestedField {
  return {
    key,
    label,
    semantic,
    preferredSource,
    required,
    transforms,
    confidence,
    reason,
    selectorStrategy: "derive-from-picker"
  };
}

export function deterministicSuggestions(
  request: AiSuggestionRequest
): AiSuggestionResponse {
  const combined = request.sampleRecords
    .map((record) => record.text)
    .join("\n");
  const suggestions = new Map<string, AiSuggestedField>();

  for (const field of request.existingFields ?? []) {
    suggestions.set(
      field.key,
      suggestion(
        field.key,
        field.label,
        "other",
        field.source,
        "Existing recipe field preserved as a high-confidence starting point.",
        0.98
      )
    );
  }

  const intent = request.intent.toLowerCase();
  const hasPrice =
    /\b(price|cost|amount|rate|fee|msrp|sale)\b/.test(intent) ||
    /[$€£]\s?\d|\b\d+[.,]\d{2}\b/.test(combined);
  const hasYear =
    /\byear\b/.test(intent) ||
    /\b(19|20)\d{2}\b/.test(combined);
  const hasSku = /\b(sku|upc|model|product code|item number)\b/.test(intent);
  const hasQuantity = /\b(quantity|qty|count|units|package size)\b/.test(intent);
  const hasLocation =
    /\b(location|city|service area|address|region)\b/.test(intent);
  const hasDescription =
    /\b(description|details|summary|features)\b/.test(intent);

  if (
    /\b(name|title|product|movie|business|service|package)\b/.test(intent) ||
    request.sampleRecords.some((record) =>
      record.fieldHints?.some((hint) => hint === "heading")
    )
  ) {
    suggestions.set(
      "name",
      suggestion(
        "name",
        "Name / title",
        "name",
        "text",
        "The intent or sample structure indicates a primary human-readable record name.",
        0.9,
        ["trim", "collapse-whitespace"],
        true
      )
    );
  }

  if (hasPrice) {
    suggestions.set(
      "price",
      suggestion(
        "price",
        "Price",
        "price",
        "text",
        "Currency-like content or pricing language appears in the requested extraction.",
        0.92,
        ["trim", "collapse-whitespace", "currency"]
      )
    );
  }

  if (request.sampleRecords.some((record) => Boolean(record.link))) {
    suggestions.set(
      "url",
      suggestion(
        "url",
        "Record URL",
        "url",
        "link",
        "Sample records contain links that can preserve source evidence and support later detail-page enrichment.",
        0.96,
        ["trim"]
      )
    );
  }

  if (request.sampleRecords.some((record) => Boolean(record.image))) {
    suggestions.set(
      "image",
      suggestion(
        "image",
        "Image URL",
        "image",
        "image",
        "Sample records contain images.",
        0.94,
        ["trim"]
      )
    );
  }

  if (hasYear) {
    suggestions.set(
      "year",
      suggestion(
        "year",
        "Year",
        "year",
        "text",
        "The intent or sample text contains year-like values.",
        0.82,
        ["trim", "number"]
      )
    );
  }

  if (hasSku) {
    suggestions.set(
      "sku",
      suggestion(
        "sku",
        "SKU / product code",
        "sku",
        "text",
        "The requested extraction mentions a stable product identifier.",
        0.86
      )
    );
  }

  if (hasQuantity) {
    suggestions.set(
      "quantity",
      suggestion(
        "quantity",
        "Quantity / package size",
        "quantity",
        "text",
        "The intent requests quantity, units, or package-size information.",
        0.84
      )
    );
  }

  if (hasLocation) {
    suggestions.set(
      "location",
      suggestion(
        "location",
        "Location / service area",
        "location",
        "text",
        "The intent requests geographic or service-area information.",
        0.84
      )
    );
  }

  if (hasDescription) {
    suggestions.set(
      "description",
      suggestion(
        "description",
        "Description",
        "description",
        "text",
        "The intent requests descriptive or feature content.",
        0.78
      )
    );
  }

  if (!suggestions.size) {
    suggestions.set(
      "name",
      suggestion(
        "name",
        "Name / title",
        "name",
        "text",
        "A primary display field is a useful default when no stronger semantic signal is available.",
        0.62,
        ["trim", "collapse-whitespace"],
        true
      )
    );
  }

  return {
    summary:
      "AI Gateway is not configured, so the platform generated deterministic field suggestions from your intent and bounded samples.",
    suggestions: Array.from(suggestions.values()).slice(0, 12),
    telemetry: {
      mode: "deterministic-fallback",
      model: "none",
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      actualCostUsd: null
    },
    warnings: [
      "Live AI suggestions require AI_GATEWAY_API_KEY on the server."
    ]
  };
}

export const suggestionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "suggestions"],
  properties: {
    summary: { type: "string", maxLength: 500 },
    suggestions: {
      type: "array",
      minItems: 1,
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "key",
          "label",
          "semantic",
          "preferredSource",
          "required",
          "transforms",
          "confidence",
          "reason",
          "selectorStrategy"
        ],
        properties: {
          key: {
            type: "string",
            pattern: "^[a-z][a-z0-9_]{0,47}$"
          },
          label: { type: "string", minLength: 1, maxLength: 100 },
          semantic: { type: "string", enum: FIELD_SEMANTICS },
          preferredSource: { type: "string", enum: FIELD_SOURCES },
          required: { type: "boolean" },
          transforms: {
            type: "array",
            maxItems: 6,
            items: { type: "string", enum: FIELD_TRANSFORMS }
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          reason: { type: "string", minLength: 1, maxLength: 360 },
          selectorStrategy: {
            type: "string",
            enum: ["derive-from-picker", "manual"]
          }
        }
      }
    }
  }
} as const;

export function estimateGatewayCost(
  model: string,
  inputTokens: number,
  outputTokens: number
) {
  // Current AI Gateway catalog pricing on 2026-10-03 for GPT-5.4 Mini.
  if (model !== "openai/gpt-5.4-mini") {
    return null;
  }

  const inputPerMillion = 0.75;
  const outputPerMillion = 4.5;

  return Number(
    (
      (inputTokens * inputPerMillion + outputTokens * outputPerMillion) /
      1_000_000
    ).toFixed(8)
  );
}

export function sanitizeGatewaySuggestions(
  raw: unknown
): Pick<AiSuggestionResponse, "summary" | "suggestions"> {
  if (!raw || typeof raw !== "object") {
    throw new Error("AI response was not an object.");
  }

  const record = raw as Record<string, unknown>;
  const summary = cleanString(record.summary, 500);
  const rawSuggestions = Array.isArray(record.suggestions)
    ? record.suggestions.slice(0, 12)
    : [];

  const suggestions = rawSuggestions
    .map((value) => {
      if (!value || typeof value !== "object") {
        return null;
      }

      const item = value as Record<string, unknown>;
      const key = normalizeKey(cleanString(item.key, 48));
      const label = cleanString(item.label, 100);
      const semantic = item.semantic as FieldSemantic;
      const preferredSource = item.preferredSource as FieldSource;
      const transforms = Array.isArray(item.transforms)
        ? item.transforms.filter((transform): transform is FieldTransform =>
            FIELD_TRANSFORMS.includes(transform as FieldTransform)
          )
        : [];
      const confidence =
        typeof item.confidence === "number"
          ? Math.max(0, Math.min(1, item.confidence))
          : 0.5;
      const reason = cleanString(item.reason, 360);
      const selectorStrategy =
        item.selectorStrategy === "manual" ? "manual" : "derive-from-picker";

      if (
        !key ||
        !label ||
        !FIELD_SEMANTICS.includes(semantic) ||
        !FIELD_SOURCES.includes(preferredSource) ||
        !reason
      ) {
        return null;
      }

      return {
        key,
        label,
        semantic,
        preferredSource,
        required: item.required === true,
        transforms,
        confidence,
        reason,
        selectorStrategy
      } satisfies AiSuggestedField;
    })
    .filter((value): value is AiSuggestedField => Boolean(value));

  if (!summary || !suggestions.length) {
    throw new Error("AI response did not contain usable field suggestions.");
  }

  return { summary, suggestions };
}
