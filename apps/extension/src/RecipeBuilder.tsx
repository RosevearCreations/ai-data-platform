import { useMemo, useState } from "react";

import {
  deriveFieldRecipe,
  executeExtractionRecipe
} from "./recipe-engine";
import { PaginationRunner } from "./PaginationRunner";
import { SpreadsheetReview } from "./SpreadsheetReview";
import type {
  DerivedFieldResult,
  ExtractionFieldRecipe,
  ExtractionRecipe,
  ExtractionRunResult,
  ExtractionSource,
  ExtractionTransform,
  RecordGroupCandidate,
  VisualPickResult
} from "./types";

interface RecipeBuilderProps {
  candidate: RecordGroupCandidate;
  pickedElement: VisualPickResult | null;
  onClose: () => void;
}

const TRANSFORMS: Array<{
  value: ExtractionTransform;
  label: string;
}> = [
  { value: "trim", label: "Trim" },
  { value: "collapse-whitespace", label: "Collapse spaces" },
  { value: "lowercase", label: "Lowercase" },
  { value: "uppercase", label: "Uppercase" },
  { value: "number", label: "Number" },
  { value: "currency", label: "Currency" }
];

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab?.id) {
    throw new Error("No active browser tab is available.");
  }

  return tab;
}

function uniqueKey(fields: ExtractionFieldRecipe[], requested: string) {
  const base = requested || "field";
  const existing = new Set(fields.map((field) => field.key));

  if (!existing.has(base)) {
    return base;
  }

  let counter = 2;
  while (existing.has(`${base}_${counter}`)) {
    counter += 1;
  }

  return `${base}_${counter}`;
}

function createBlankField(index: number): ExtractionFieldRecipe {
  return {
    id: `manual-${Date.now()}-${index}`,
    key: `field_${index}`,
    label: `Field ${index}`,
    selector: ":scope",
    source: "text",
    attribute: "",
    required: false,
    transforms: ["trim", "collapse-whitespace"]
  };
}

export function RecipeBuilder({
  candidate,
  pickedElement,
  onClose
}: RecipeBuilderProps) {
  const [name, setName] = useState("Untitled extraction recipe");
  const [fields, setFields] = useState<ExtractionFieldRecipe[]>([]);
  const [derived, setDerived] = useState<DerivedFieldResult | null>(null);
  const [run, setRun] = useState<ExtractionRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const recipe = useMemo<ExtractionRecipe>(
    () => ({
      version: 1,
      name: name.trim() || "Untitled extraction recipe",
      sourceUrl: "",
      recordSelector: candidate.recordSelector,
      fields
    }),
    [candidate.recordSelector, fields, name]
  );

  function updateField(
    id: string,
    updater: (field: ExtractionFieldRecipe) => ExtractionFieldRecipe
  ) {
    setFields((current) =>
      current.map((field) => (field.id === id ? updater(field) : field))
    );
    setRun(null);
  }

  async function addSelectedField() {
    if (!pickedElement) {
      setError("Pick a field on the page first.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const tab = await getActiveTab();
      const injection = {
        target: { tabId: tab.id! },
        func: deriveFieldRecipe,
        args: [
          candidate.recordSelector,
          pickedElement.generalizedSelector,
          pickedElement.text.slice(0, 50)
        ]
      } as unknown as Parameters<typeof chrome.scripting.executeScript>[0];

      const results = await chrome.scripting.executeScript(injection);
      const result = results[0]?.result as DerivedFieldResult | undefined;

      if (!result) {
        throw new Error("Field derivation did not return a result.");
      }

      const nextField = {
        ...result.field,
        key: uniqueKey(fields, result.field.key)
      };

      setFields((current) => [...current, nextField]);
      setDerived({ ...result, field: nextField });
      setRun(null);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to derive a field from the selected element."
      );
    } finally {
      setPending(false);
    }
  }

  function addBlankField() {
    const next = createBlankField(fields.length + 1);
    next.key = uniqueKey(fields, next.key);
    setFields((current) => [...current, next]);
    setDerived(null);
    setRun(null);
  }

  async function runRecipe() {
    setPending(true);
    setError(null);

    try {
      const tab = await getActiveTab();
      const executableRecipe: ExtractionRecipe = {
        ...recipe,
        sourceUrl: tab.url ?? ""
      };
      const injection = {
        target: { tabId: tab.id! },
        func: executeExtractionRecipe,
        args: [executableRecipe]
      } as unknown as Parameters<typeof chrome.scripting.executeScript>[0];

      const results = await chrome.scripting.executeScript(injection);
      const result = results[0]?.result as ExtractionRunResult | undefined;

      if (!result) {
        throw new Error("Recipe execution did not return a result.");
      }

      setRun(result);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to execute the extraction recipe."
      );
    } finally {
      setPending(false);
    }
  }

  function toggleTransform(
    field: ExtractionFieldRecipe,
    transform: ExtractionTransform
  ) {
    const enabled = field.transforms.includes(transform);
    const transforms = enabled
      ? field.transforms.filter((value) => value !== transform)
      : [...field.transforms, transform];

    updateField(field.id, (current) => ({
      ...current,
      transforms
    }));
  }

  return (
    <section className="recipeBuilder">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Build 006</p>
          <h2>Extraction recipe</h2>
        </div>
        <button className="recipeClose" onClick={onClose} type="button">
          Close
        </button>
      </div>

      <div className="recipeRecordBoundary">
        <span>Record boundary</span>
        <code>{candidate.recordSelector}</code>
        <small>
          {candidate.recordCount} records · confidence {candidate.confidence}
        </small>
      </div>

      <label className="recipeLabel">
        Recipe name
        <input
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
      </label>

      <div className="recipeActions">
        <button
          className="recipePrimary"
          disabled={pending || !pickedElement}
          onClick={addSelectedField}
          type="button"
        >
          {pending ? "Working…" : "Add picked element as field"}
        </button>
        <button className="recipeSecondary" onClick={addBlankField} type="button">
          Add manual field
        </button>
      </div>

      {!pickedElement ? (
        <p className="recipeHint">
          Pick an element on the page to derive a reusable field selector, or add
          a manual field.
        </p>
      ) : null}

      {derived ? (
        <div className="recipeDerivation">
          <strong>Field selector derived</strong>
          <p>
            {derived.matchedRecords} of {derived.recordCount} records matched ·{" "}
            {Math.round(derived.coverage * 100)}% coverage
          </p>
          {derived.samples.length ? (
            <small>{derived.samples.slice(0, 3).join(" · ")}</small>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="errorBox" role="alert">
          <strong>Recipe error</strong>
          <p>{error}</p>
        </div>
      ) : null}

      <div className="recipeFields">
        {fields.map((field, index) => (
          <article className="recipeField" key={field.id}>
            <div className="recipeFieldHeader">
              <strong>Field {index + 1}</strong>
              <button
                onClick={() => {
                  setFields((current) =>
                    current.filter((item) => item.id !== field.id)
                  );
                  setRun(null);
                }}
                type="button"
              >
                Remove
              </button>
            </div>

            <div className="recipeFieldGrid">
              <label>
                Label
                <input
                  onChange={(event) =>
                    updateField(field.id, (current) => ({
                      ...current,
                      label: event.target.value
                    }))
                  }
                  value={field.label}
                />
              </label>

              <label>
                Key
                <input
                  onChange={(event) =>
                    updateField(field.id, (current) => ({
                      ...current,
                      key: event.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9_]+/g, "_")
                        .replace(/^_+/, "")
                    }))
                  }
                  value={field.key}
                />
              </label>
            </div>

            <label>
              Relative selector
              <input
                className="monoInput"
                onChange={(event) =>
                  updateField(field.id, (current) => ({
                    ...current,
                    selector: event.target.value
                  }))
                }
                value={field.selector}
              />
            </label>

            <div className="recipeFieldGrid">
              <label>
                Extract
                <select
                  onChange={(event) =>
                    updateField(field.id, (current) => ({
                      ...current,
                      source: event.target.value as ExtractionSource
                    }))
                  }
                  value={field.source}
                >
                  <option value="text">Text</option>
                  <option value="link">Link href</option>
                  <option value="image">Image src</option>
                  <option value="attribute">Attribute</option>
                </select>
              </label>

              {field.source === "attribute" ? (
                <label>
                  Attribute
                  <input
                    onChange={(event) =>
                      updateField(field.id, (current) => ({
                        ...current,
                        attribute: event.target.value
                      }))
                    }
                    placeholder="data-price"
                    value={field.attribute}
                  />
                </label>
              ) : (
                <label className="requiredToggle">
                  <input
                    checked={field.required}
                    onChange={(event) =>
                      updateField(field.id, (current) => ({
                        ...current,
                        required: event.target.checked
                      }))
                    }
                    type="checkbox"
                  />
                  Required
                </label>
              )}
            </div>

            {field.source === "attribute" ? (
              <label className="requiredToggle">
                <input
                  checked={field.required}
                  onChange={(event) =>
                    updateField(field.id, (current) => ({
                      ...current,
                      required: event.target.checked
                    }))
                  }
                  type="checkbox"
                />
                Required
              </label>
            ) : null}

            <div className="transformList">
              <span>Transforms</span>
              <div>
                {TRANSFORMS.map((transform) => (
                  <label key={transform.value}>
                    <input
                      checked={field.transforms.includes(transform.value)}
                      onChange={() => toggleTransform(field, transform.value)}
                      type="checkbox"
                    />
                    {transform.label}
                  </label>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>

      <button
        className="runRecipe"
        disabled={pending || fields.length === 0}
        onClick={runRecipe}
        type="button"
      >
        {pending ? "Running recipe…" : "Run recipe test"}
      </button>

      {run ? (
        <div className="recipeRun">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Test result</p>
              <h2>
                {run.records.length} rows · {run.fieldCount} fields
              </h2>
            </div>
            <span className="recipeVersion">v{run.recipeVersion}</span>
          </div>

          <div className="recipeStats">
            <div>
              <strong>{run.stats.populatedCells}</strong>
              <span>populated</span>
            </div>
            <div>
              <strong>{run.stats.emptyCells}</strong>
              <span>empty</span>
            </div>
            <div>
              <strong>{run.stats.requiredMissingCells}</strong>
              <span>required missing</span>
            </div>
          </div>

          {run.warnings.length ? (
            <ul className="diagnostics">
              {run.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}

          <SpreadsheetReview
            fields={fields}
            recipeName={recipe.name}
            run={run}
          />

          <PaginationRunner
            initialRun={run}
            recipe={{
              ...recipe,
              sourceUrl: run.sourceUrl
            }}
          />

          <details className="recipeJson">
            <summary>Portable recipe JSON</summary>
            <pre>
              {JSON.stringify(
                {
                  ...recipe,
                  sourceUrl: run.sourceUrl
                },
                null,
                2
              )}
            </pre>
          </details>

          <details className="recipeJson aiContextExport">
            <summary>AI suggestion context JSON</summary>
            <p className="recipeHint">
              This is the bounded context accepted by the authenticated web AI
              suggestion surface. It contains samples and recipe metadata, not
              the full page DOM.
            </p>
            <pre>
              {JSON.stringify(
                {
                  pageUrl: run.sourceUrl,
                  recordSelector: candidate.recordSelector,
                  sampleRecords: candidate.samples.slice(0, 8).map((sample) => ({
                    text: sample.text,
                    link: sample.link || undefined,
                    image: sample.image || undefined,
                    fieldHints: sample.fieldHints
                  })),
                  existingFields: fields.map((field) => ({
                    key: field.key,
                    label: field.label,
                    source: field.source
                  }))
                },
                null,
                2
              )}
            </pre>
          </details>
        </div>
      ) : null}
    </section>
  );
}
