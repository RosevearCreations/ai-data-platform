import assert from "node:assert/strict";

import {
  deterministicSuggestions,
  estimateGatewayCost,
  parseSuggestionRequest,
  sanitizeGatewaySuggestions
} from "../lib/ai-suggestions";

const parsed = parseSuggestionRequest({
  intent: "Extract product name, price, product URL and image",
  pageUrl: "https://example.com/products",
  recordSelector: ".product-card",
  sampleRecords: [
    {
      text: "Rose Soap $14.99 6 oz",
      link: "/products/rose-soap",
      image: "/images/rose.jpg",
      fieldHints: ["heading", "link", "image"]
    }
  ],
  existingFields: [
    {
      key: "existing_name",
      label: "Existing name",
      source: "text"
    }
  ]
});

assert.equal(parsed.sampleRecords.length, 1);
assert.equal(parsed.existingFields?.length, 1);

const fallback = deterministicSuggestions(parsed);
assert.equal(fallback.telemetry.mode, "deterministic-fallback");
assert.ok(fallback.suggestions.some((field) => field.semantic === "price"));
assert.ok(fallback.suggestions.some((field) => field.semantic === "url"));
assert.ok(fallback.suggestions.some((field) => field.semantic === "image"));

const sanitized = sanitizeGatewaySuggestions({
  summary: "Suggested fields based on the bounded sample.",
  suggestions: [
    {
      key: "product_name",
      label: "Product name",
      semantic: "name",
      preferredSource: "text",
      required: true,
      transforms: ["trim", "collapse-whitespace"],
      confidence: 0.96,
      reason: "Primary record label.",
      selectorStrategy: "derive-from-picker"
    }
  ]
});

assert.equal(sanitized.suggestions[0]?.key, "product_name");
assert.equal(sanitized.suggestions[0]?.required, true);

assert.equal(
  estimateGatewayCost("openai/gpt-5.4-mini", 1_000_000, 1_000_000),
  5.25
);
assert.equal(
  estimateGatewayCost("some/other-model", 1000, 1000),
  null
);

assert.throws(
  () =>
    parseSuggestionRequest({
      intent: "",
      sampleRecords: [{ text: "example" }]
    }),
  /intent/i
);

console.log("AI suggestion verification passed.");
