"use client";

import { useMemo, useState, useTransition } from "react";
import {
  RECIPE_SOURCES,
  RECIPE_TRANSFORMS,
  applyRecipeTransforms,
  cloneVisualRecipe,
  parseVisualRecipe,
  validateVisualRecipe,
  type VisualExtractionRecipe,
  type VisualRecipeField,
  type VisualRecipeSource,
  type VisualRecipeTransform
} from "@/lib/visual-recipe-builder";

type WorkspaceOption = {
  id: string;
  name: string;
  role: "owner" | "admin" | "member";
};

type RecipeRecord = {
  workspaceId: string;
  workspaceName: string;
  recordId: string;
  serverVersion: number;
  kind: "scraper" | "template";
  revision: number;
  name: string;
  sourceUrl: string;
  sourceOrigin: string;
  createdAt: string;
  updatedAt: string;
  recipe: VisualExtractionRecipe;
};

type ProjectSourcePreset = {
  workspaceId: string;
  projectName: string;
  sourceId: string;
  displayName: string;
  sourceUrl: string;
  collectionMethod: string;
  readiness: string;
  savedScraperId: string;
};

type PreviewRow = {
  index: number;
  values: Record<string, string | number | null>;
  warnings: string[];
};

function blankRecipe(): VisualExtractionRecipe {
  return {
    version: 1,
    name: "Untitled extraction recipe",
    sourceUrl: "",
    recordSelector: "",
    fields: []
  };
}

function blankField(index: number): VisualRecipeField {
  return {
    id: "web-field-" + crypto.randomUUID(),
    key: "field_" + String(index),
    label: "Field " + String(index),
    selector: ":scope",
    source: "text",
    attribute: "",
    required: false,
    transforms: ["trim", "collapse-whitespace"]
  };
}

function uniqueKey(fields: VisualRecipeField[], requested: string, ignoreId?: string) {
  const base =
    requested
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "") || "field";
  const used = new Set(
    fields.filter((field) => field.id !== ignoreId).map((field) => field.key)
  );
  if (!used.has(base)) return base;
  let count = 2;
  while (used.has(base + "_" + String(count))) count += 1;
  return base + "_" + String(count);
}

function extractValue(
  record: Element,
  field: VisualRecipeField,
  baseUrl: string
): string {
  const element =
    field.selector === ":scope"
      ? record
      : record.querySelector(field.selector);
  if (!element) return "";
  if (field.source === "text") return element.textContent ?? "";
  if (field.source === "attribute") return element.getAttribute(field.attribute) ?? "";
  if (field.source === "link") {
    const raw = element.getAttribute("href") ?? "";
    try {
      return baseUrl ? new URL(raw, baseUrl).toString() : raw;
    } catch {
      return raw;
    }
  }
  const raw = element.getAttribute("src") ?? "";
  try {
    return baseUrl ? new URL(raw, baseUrl).toString() : raw;
  } catch {
    return raw;
  }
}

function runPreview(recipe: VisualExtractionRecipe, html: string) {
  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");
  let records: Element[] = [];
  try {
    records = Array.from(document.querySelectorAll(recipe.recordSelector)).slice(0, 100);
  } catch {
    throw new Error("Record selector is not valid CSS.");
  }
  const rows: PreviewRow[] = records.map((record, index) => {
    const values: PreviewRow["values"] = {};
    const warnings: string[] = [];
    for (const field of recipe.fields) {
      let raw = "";
      try {
        raw = extractValue(record, field, recipe.sourceUrl);
      } catch {
        warnings.push(field.label + ": invalid relative selector.");
      }
      const value = applyRecipeTransforms(raw, field.transforms);
      values[field.key] = value;
      if (field.required && (value === null || value === "")) {
        warnings.push(field.label + ": required value missing.");
      }
    }
    return { index, values, warnings };
  });
  return {
    totalRecords: records.length,
    rows: rows.slice(0, 20),
    truncated: records.length > 20
  };
}

async function saveRecipe(body: Record<string, unknown>) {
  const response = await fetch("/api/recipe-builder", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    status?: string;
    recordId?: string;
    serverVersion?: number;
    revision?: number;
  };
  if (!response.ok) {
    if (response.status === 409) throw new Error("Recipe changed elsewhere. Reload before saving again.");
    throw new Error(payload.error || "Unable to save recipe.");
  }
  return payload;
}

export function VisualRecipeBuilder({
  workspaces,
  records,
  projectSources
}: {
  workspaces: WorkspaceOption[];
  records: RecipeRecord[];
  projectSources: ProjectSourcePreset[];
}) {
  const [pending, startTransition] = useTransition();
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? "");
  const [recordId, setRecordId] = useState("");
  const [expectedServerVersion, setExpectedServerVersion] = useState<number | null>(null);
  const [kind, setKind] = useState<"scraper" | "template">("template");
  const [recipe, setRecipe] = useState<VisualExtractionRecipe>(blankRecipe);
  const [sampleHtml, setSampleHtml] = useState(
    '<div class="product"><h2>Example A</h2><span class="price">$12.50</span></div>\n<div class="product"><h2>Example B</h2><span class="price">$18.00</span></div>'
  );
  const [preview, setPreview] = useState<ReturnType<typeof runPreview> | null>(null);
  const [importJson, setImportJson] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const workspaceRecords = useMemo(
    () => records.filter((item) => item.workspaceId === workspaceId),
    [records, workspaceId]
  );
  const sourcePresets = useMemo(
    () => projectSources.filter((item) => item.workspaceId === workspaceId),
    [projectSources, workspaceId]
  );
  const issues = useMemo(() => validateVisualRecipe(recipe), [recipe]);
  const errors = issues.filter((issue) => issue.level === "error");
  const warnings = issues.filter((issue) => issue.level === "warning");

  function updateRecipe(updater: (value: VisualExtractionRecipe) => VisualExtractionRecipe) {
    setRecipe((current) => updater(current));
    setPreview(null);
    setMessage("");
  }

  function updateField(
    id: string,
    updater: (field: VisualRecipeField) => VisualRecipeField
  ) {
    updateRecipe((current) => ({
      ...current,
      fields: current.fields.map((field) =>
        field.id === id ? updater(field) : field
      )
    }));
  }

  function loadRecord(nextId: string) {
    setRecordId(nextId);
    const found = workspaceRecords.find((item) => item.recordId === nextId);
    if (!found) {
      setExpectedServerVersion(null);
      setKind("template");
      setRecipe(blankRecipe());
      setMessage("");
      setError("");
      return;
    }
    setExpectedServerVersion(found.serverVersion);
    setKind(found.kind);
    setRecipe(cloneVisualRecipe(found.recipe));
    setMessage("Loaded revision " + String(found.revision) + ".");
    setError("");
    setPreview(null);
  }

  function newRecipe() {
    setRecordId("");
    setExpectedServerVersion(null);
    setKind("template");
    setRecipe(blankRecipe());
    setMessage("");
    setError("");
    setPreview(null);
  }

  function moveField(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= recipe.fields.length) return;
    updateRecipe((current) => {
      const fields = [...current.fields];
      const [field] = fields.splice(index, 1);
      fields.splice(nextIndex, 0, field);
      return { ...current, fields };
    });
  }

  function run() {
    setError("");
    try {
      if (errors.length) throw new Error("Fix recipe validation errors before previewing.");
      setPreview(runPreview(recipe, sampleHtml));
    } catch (reason) {
      setPreview(null);
      setError(reason instanceof Error ? reason.message : "Preview failed.");
    }
  }

  function importRecipe() {
    setError("");
    try {
      const parsed = parseVisualRecipe(JSON.parse(importJson));
      setRecordId("");
      setExpectedServerVersion(null);
      setRecipe(parsed);
      setPreview(null);
      setMessage("Imported recipe JSON as a new unsaved recipe.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Recipe JSON is invalid.");
    }
  }

  function copyRecipe() {
    setError("");
    startTransition(async () => {
      try {
        await navigator.clipboard.writeText(JSON.stringify(recipe, null, 2));
        setMessage("Recipe JSON copied to the clipboard.");
      } catch {
        setError("Clipboard access was unavailable. Use the JSON panel to copy manually.");
      }
    });
  }

  function persist() {
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        if (errors.length) throw new Error("Fix recipe validation errors before saving.");
        const result = await saveRecipe({
          workspaceId,
          recordId: recordId || undefined,
          expectedServerVersion,
          kind,
          recipe
        });
        setRecordId(result.recordId ?? recordId);
        setExpectedServerVersion(result.serverVersion ?? expectedServerVersion);
        setMessage(
          "Saved recipe revision " + String(result.revision ?? "?") +
          ". Refresh the page to load the new synchronized record everywhere."
        );
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Unable to save recipe.");
      }
    });
  }

  return (
    <div className="visualRecipeBuilder">
      {error ? <div className="recipeBuilderError" role="alert">{error}</div> : null}
      {message ? <div className="recipeBuilderMessage">{message}</div> : null}

      <section className="recipeBuilderPanel">
        <div className="recipeBuilderHeading">
          <div>
            <p className="eyebrow">Recipe workspace</p>
            <h2>Author or load a recipe</h2>
          </div>
          <button className="secondaryButton" type="button" onClick={newRecipe}>New recipe</button>
        </div>
        <div className="recipeBuilderGrid">
          <label>
            Workspace
            <select
              value={workspaceId}
              onChange={(event) => {
                setWorkspaceId(event.target.value);
                setRecordId("");
                setExpectedServerVersion(null);
                setRecipe(blankRecipe());
              }}
            >
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name} · {workspace.role}
                </option>
              ))}
            </select>
          </label>
          <label>
            Existing synchronized recipe
            <select value={recordId} onChange={(event) => loadRecord(event.target.value)}>
              <option value="">New unsaved recipe</option>
              {workspaceRecords.map((record) => (
                <option key={record.recordId} value={record.recordId}>
                  {record.name} · r{record.revision} · {record.kind}
                </option>
              ))}
            </select>
          </label>
          <label>
            Save as
            <select value={kind} onChange={(event) => setKind(event.target.value as "scraper" | "template")}>
              <option value="template">Template</option>
              <option value="scraper">Scraper</option>
            </select>
          </label>
          <label>
            Collection-project source preset
            <select
              value=""
              onChange={(event) => {
                const preset = sourcePresets.find((item) => item.sourceId === event.target.value);
                if (preset) {
                  updateRecipe((current) => ({ ...current, sourceUrl: preset.sourceUrl }));
                  setMessage(
                    "Loaded source from " + preset.projectName + " · " + preset.displayName +
                    ". Save the recipe, then link its synchronized recipe ID in the collection project if needed."
                  );
                }
              }}
            >
              <option value="">Choose a source…</option>
              {sourcePresets.map((preset) => (
                <option key={preset.sourceId} value={preset.sourceId}>
                  {preset.projectName} · {preset.displayName} · {preset.readiness}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="recipeBuilderGrid">
          <label className="recipeBuilderWide">
            Recipe name
            <input
              value={recipe.name}
              onChange={(event) => updateRecipe((current) => ({ ...current, name: event.target.value }))}
              maxLength={120}
            />
          </label>
          <label className="recipeBuilderWide">
            Source URL {kind === "scraper" ? "(required for scraper)" : "(optional for reusable template)"}
            <input
              type="url"
              value={recipe.sourceUrl}
              onChange={(event) => updateRecipe((current) => ({ ...current, sourceUrl: event.target.value }))}
              placeholder="https://example.com/products"
            />
          </label>
          <label className="recipeBuilderWide">
            Record selector
            <input
              className="recipeMono"
              value={recipe.recordSelector}
              onChange={(event) => updateRecipe((current) => ({ ...current, recordSelector: event.target.value }))}
              placeholder=".product-card"
              maxLength={500}
            />
          </label>
        </div>
      </section>

      <section className="recipeBuilderPanel">
        <div className="recipeBuilderHeading">
          <div>
            <p className="eyebrow">Visual field map</p>
            <h2>{recipe.fields.length} field(s)</h2>
          </div>
          <button
            className="primary"
            type="button"
            disabled={recipe.fields.length >= 20}
            onClick={() =>
              updateRecipe((current) => ({
                ...current,
                fields: [...current.fields, blankField(current.fields.length + 1)]
              }))
            }
          >
            Add field
          </button>
        </div>

        <div className="visualFieldList">
          {recipe.fields.map((field, index) => (
            <article className="visualFieldCard" key={field.id}>
              <div className="visualFieldHeader">
                <strong>{index + 1}. {field.label}</strong>
                <div className="visualFieldActions">
                  <button type="button" onClick={() => moveField(index, -1)} disabled={index === 0}>↑</button>
                  <button type="button" onClick={() => moveField(index, 1)} disabled={index === recipe.fields.length - 1}>↓</button>
                  <button
                    type="button"
                    disabled={recipe.fields.length >= 20}
                    onClick={() =>
                      updateRecipe((current) => {
                        const copy = {
                          ...field,
                          id: "web-field-" + crypto.randomUUID(),
                          key: uniqueKey(current.fields, field.key + "_copy"),
                          label: field.label + " copy",
                          transforms: [...field.transforms]
                        };
                        const fields = [...current.fields];
                        fields.splice(index + 1, 0, copy);
                        return { ...current, fields };
                      })
                    }
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateRecipe((current) => ({
                        ...current,
                        fields: current.fields.filter((item) => item.id !== field.id)
                      }))
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="recipeBuilderGrid">
                <label>
                  Label
                  <input
                    value={field.label}
                    onChange={(event) => updateField(field.id, (current) => ({ ...current, label: event.target.value }))}
                  />
                </label>
                <label>
                  Key
                  <input
                    value={field.key}
                    onChange={(event) =>
                      updateField(field.id, (current) => ({
                        ...current,
                        key: event.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_]+/g, "_")
                          .replace(/^_+/, "")
                      }))
                    }
                  />
                </label>
                <label className="recipeBuilderWide">
                  Relative selector
                  <input
                    className="recipeMono"
                    value={field.selector}
                    onChange={(event) => updateField(field.id, (current) => ({ ...current, selector: event.target.value }))}
                  />
                </label>
                <label>
                  Extract
                  <select
                    value={field.source}
                    onChange={(event) =>
                      updateField(field.id, (current) => ({
                        ...current,
                        source: event.target.value as VisualRecipeSource,
                        attribute: event.target.value === "attribute" ? current.attribute : ""
                      }))
                    }
                  >
                    {RECIPE_SOURCES.map((source) => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                </label>
                {field.source === "attribute" ? (
                  <label>
                    Attribute
                    <input
                      value={field.attribute}
                      onChange={(event) => updateField(field.id, (current) => ({ ...current, attribute: event.target.value }))}
                      placeholder="data-price"
                    />
                  </label>
                ) : (
                  <label className="recipeCheckbox">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(event) => updateField(field.id, (current) => ({ ...current, required: event.target.checked }))}
                    />
                    Required
                  </label>
                )}
              </div>

              {field.source === "attribute" ? (
                <label className="recipeCheckbox">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(event) => updateField(field.id, (current) => ({ ...current, required: event.target.checked }))}
                  />
                  Required
                </label>
              ) : null}

              <div className="recipeTransforms">
                <span>Transforms</span>
                <div>
                  {RECIPE_TRANSFORMS.map((transform) => (
                    <label key={transform}>
                      <input
                        type="checkbox"
                        checked={field.transforms.includes(transform)}
                        onChange={() =>
                          updateField(field.id, (current) => {
                            const enabled = current.transforms.includes(transform as VisualRecipeTransform);
                            return {
                              ...current,
                              transforms: enabled
                                ? current.transforms.filter((item) => item !== transform)
                                : [...current.transforms, transform as VisualRecipeTransform]
                            };
                          })
                        }
                      />
                      {transform}
                    </label>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="recipeBuilderPanel">
        <div className="recipeBuilderHeading">
          <div>
            <p className="eyebrow">Validation</p>
            <h2>{errors.length} error(s) · {warnings.length} warning(s)</h2>
          </div>
          <button className="primary" type="button" disabled={pending || errors.length > 0 || (kind === "scraper" && !recipe.sourceUrl)} onClick={persist}>
            {pending ? "Saving…" : recordId ? "Save new revision" : "Save recipe"}
          </button>
        </div>
        {issues.length ? (
          <ul className="recipeIssueList">
            {issues.map((issue, index) => (
              <li key={issue.code + String(index)} data-level={issue.level}>{issue.message}</li>
            ))}
          </ul>
        ) : (
          <p className="recipeReady">Recipe structure is ready for bounded preview and save.</p>
        )}
      </section>

      <section className="recipeBuilderPanel">
        <div className="recipeBuilderHeading">
          <div>
            <p className="eyebrow">Bounded preview lab</p>
            <h2>Test against sample HTML</h2>
          </div>
          <button className="primary" type="button" disabled={errors.length > 0} onClick={run}>Run preview</button>
        </div>
        <p className="recipeBuilderNote">
          Preview parses only the HTML pasted here in your browser. It does not fetch remote pages, bypass access controls or create collection evidence.
        </p>
        <textarea
          className="recipeHtmlInput"
          value={sampleHtml}
          onChange={(event) => setSampleHtml(event.target.value)}
          maxLength={100000}
        />
        {preview ? (
          <div className="recipePreview">
            <p>{preview.totalRecords} record(s) matched{preview.truncated ? " · showing first 20" : ""}.</p>
            <div className="recipePreviewScroller">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    {recipe.fields.map((field) => <th key={field.id}>{field.label}</th>)}
                    <th>Warnings</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={row.index}>
                      <td>{row.index + 1}</td>
                      {recipe.fields.map((field) => (
                        <td key={field.id}>{String(row.values[field.key] ?? "")}</td>
                      ))}
                      <td>{row.warnings.join(" · ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      <section className="recipeBuilderPanel">
        <div className="recipeBuilderHeading">
          <div>
            <p className="eyebrow">Portable recipe JSON</p>
            <h2>Import / export</h2>
          </div>
          <button className="secondaryButton" type="button" onClick={copyRecipe}>Copy current JSON</button>
        </div>
        <pre className="recipeJsonPreview">{JSON.stringify(recipe, null, 2)}</pre>
        <label className="recipeBuilderWide">
          Import recipe JSON
          <textarea
            className="recipeJsonImport"
            value={importJson}
            onChange={(event) => setImportJson(event.target.value)}
            placeholder='{"version":1,"name":"...","recordSelector":"...","fields":[]}'
          />
        </label>
        <button className="secondaryButton" type="button" disabled={!importJson.trim()} onClick={importRecipe}>Import as new recipe</button>
      </section>
    </div>
  );
}
