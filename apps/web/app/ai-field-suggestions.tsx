"use client";

import { FormEvent, useMemo, useState } from "react";

import type {
  AiSuggestionRequest,
  AiSuggestionResponse
} from "@/lib/ai-suggestions";

const EXAMPLE_CONTEXT = {
  pageUrl: "https://example.com/products",
  recordSelector: ".product-card",
  sampleRecords: [
    {
      text: "Example Product $24.99 12 oz",
      link: "https://example.com/products/example",
      image: "https://example.com/example.jpg",
      fieldHints: ["heading", "link", "image"]
    }
  ],
  existingFields: []
};

function formatCost(value: number | null) {
  if (value === null) {
    return "—";
  }

  if (value === 0) {
    return "$0";
  }

  return `$${value.toFixed(6)}`;
}

export function AiFieldSuggestions() {
  const [intent, setIntent] = useState(
    "Extract the product name, price, package size, product URL and image."
  );
  const [contextJson, setContextJson] = useState(
    JSON.stringify(EXAMPLE_CONTEXT, null, 2)
  );
  const [result, setResult] = useState<AiSuggestionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const suggestionCount = result?.suggestions.length ?? 0;

  const telemetryLabel = useMemo(() => {
    if (!result) {
      return "";
    }

    return result.telemetry.mode === "gateway"
      ? "AI Gateway"
      : "Deterministic fallback";
  }, [result]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setResult(null);

    try {
      const parsed = JSON.parse(contextJson) as Partial<AiSuggestionRequest>;
      const requestBody: AiSuggestionRequest = {
        intent,
        pageUrl: parsed.pageUrl,
        recordSelector: parsed.recordSelector,
        sampleRecords: Array.isArray(parsed.sampleRecords)
          ? parsed.sampleRecords
          : [],
        existingFields: Array.isArray(parsed.existingFields)
          ? parsed.existingFields
          : []
      };

      const response = await fetch("/api/ai/suggest-fields", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      const data = (await response.json()) as
        | AiSuggestionResponse
        | { error?: string };

      if (!response.ok || !("suggestions" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "Suggestion request failed."
        );
      }

      setResult(data);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to generate field suggestions."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="aiSuggestions" aria-labelledby="ai-suggestions-heading">
      <div className="sectionHeading">
        <p className="eyebrow">Build 008</p>
        <h2 id="ai-suggestions-heading">AI suggested fields</h2>
      </div>

      <p className="aiSuggestionIntro">
        Describe the data we want and provide a bounded record sample. The AI
        suggests field semantics only; deterministic tools still choose and
        verify selectors.
      </p>

      <form className="aiSuggestionForm" onSubmit={submit}>
        <label>
          Extraction intent
          <textarea
            maxLength={1200}
            onChange={(event) => setIntent(event.target.value)}
            required
            rows={3}
            value={intent}
          />
        </label>

        <label>
          Bounded page context JSON
          <textarea
            className="aiContextInput"
            onChange={(event) => setContextJson(event.target.value)}
            required
            rows={12}
            value={contextJson}
          />
        </label>

        <button disabled={pending} type="submit">
          {pending ? "Generating suggestions…" : "Suggest extraction fields"}
        </button>
      </form>

      {error ? (
        <div className="aiSuggestionError" role="alert">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="aiSuggestionResults">
          <div className="aiSuggestionSummary">
            <div>
              <strong>{suggestionCount} field suggestions</strong>
              <p>{result.summary}</p>
            </div>
            <span>{telemetryLabel}</span>
          </div>

          <div className="aiSuggestionTelemetry">
            <div>
              <strong>{result.telemetry.model}</strong>
              <span>model</span>
            </div>
            <div>
              <strong>{result.telemetry.inputTokens}</strong>
              <span>input tokens</span>
            </div>
            <div>
              <strong>{result.telemetry.outputTokens}</strong>
              <span>output tokens</span>
            </div>
            <div>
              <strong>
                {formatCost(
                  result.telemetry.actualCostUsd ??
                    result.telemetry.estimatedCostUsd
                )}
              </strong>
              <span>
                {result.telemetry.actualCostUsd !== null
                  ? "actual cost"
                  : "estimated cost"}
              </span>
            </div>
          </div>

          <div className="aiSuggestedFieldList">
            {result.suggestions.map((field) => (
              <article key={field.key}>
                <div className="aiSuggestedFieldHeader">
                  <div>
                    <strong>{field.label}</strong>
                    <code>{field.key}</code>
                  </div>
                  <span>{Math.round(field.confidence * 100)}%</span>
                </div>
                <p>{field.reason}</p>
                <dl>
                  <div>
                    <dt>Semantic</dt>
                    <dd>{field.semantic}</dd>
                  </div>
                  <div>
                    <dt>Source</dt>
                    <dd>{field.preferredSource}</dd>
                  </div>
                  <div>
                    <dt>Selector</dt>
                    <dd>{field.selectorStrategy}</dd>
                  </div>
                  <div>
                    <dt>Required</dt>
                    <dd>{field.required ? "yes" : "no"}</dd>
                  </div>
                </dl>
                {field.transforms.length ? (
                  <small>{field.transforms.join(" · ")}</small>
                ) : null}
              </article>
            ))}
          </div>

          {result.warnings.length ? (
            <div className="aiSuggestionWarnings">
              {result.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
