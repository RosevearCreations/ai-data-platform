import assert from "node:assert/strict";

import {
  deterministicRepairExplanation,
  parseRepairExplanationRequest,
  sanitizeRepairExplanation
} from "../lib/recipe-repair-ai";

const request = parseRepairExplanationRequest({
  workspaceId: "11111111-1111-4111-8111-111111111111",
  pageUrl: "https://example.test/products",
  recipeName: "Fixture products",
  issue: {
    cause: "coverage-drop",
    label: "Price",
    currentSelector: ".old-price",
    currentCoverage: 0.25,
    previousCoverage: 1,
    context: ["article.product > h2.title, span.price"]
  },
  candidates: [
    {
      id: "candidate-low",
      selector: ".price-secondary",
      score: 0.61,
      coverage: 0.75,
      reasons: ["75% sample coverage"],
      context: ["span.price-secondary"],
      samples: ["$10", "$20"]
    },
    {
      id: "candidate-high",
      selector: "span.price",
      score: 0.94,
      coverage: 1,
      reasons: ["100% sample coverage", "selector token retained"],
      context: ["span.price"],
      samples: ["$10", "$20", "$30"]
    }
  ]
});

assert.equal(request.candidates.length, 2);

const deterministic = deterministicRepairExplanation(request);
assert.equal(deterministic.telemetry.mode, "deterministic-fallback");
assert.equal(deterministic.rankings[0]?.candidateId, "candidate-high");
assert.equal(deterministic.rankings[1]?.candidateId, "candidate-low");

const sanitized = sanitizeRepairExplanation(
  {
    summary: "The higher coverage candidate is better supported.",
    rankings: [
      {
        candidateId: "invented-selector",
        rank: 1,
        confidence: 1,
        reason: "This must be discarded."
      },
      {
        candidateId: "candidate-high",
        rank: 2,
        confidence: 0.91,
        reason: "Supported by the supplied deterministic evidence."
      }
    ]
  },
  request
);

assert.equal(sanitized.rankings.length, 1);
assert.equal(sanitized.rankings[0]?.candidateId, "candidate-high");

assert.throws(
  () =>
    sanitizeRepairExplanation(
      {
        summary: "Only an invented candidate.",
        rankings: [
          {
            candidateId: "invented-selector",
            rank: 1,
            confidence: 1,
            reason: "Not allowed."
          }
        ]
      },
      request
    ),
  /no usable rankings/i
);

assert.throws(
  () =>
    parseRepairExplanationRequest({
      workspaceId: "11111111-1111-4111-8111-111111111111",
      recipeName: "No candidates",
      issue: {
        cause: "coverage-drop",
        label: "Price",
        currentSelector: ".price"
      },
      candidates: []
    }),
  /deterministic repair candidate/i
);

console.log(
  "Build 023 repair explanation parsing, deterministic ranking and AI candidate allowlist verification passed."
);
