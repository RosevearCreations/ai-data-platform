import type {
  DerivedFieldResult,
  ExtractionFieldRecipe,
  ExtractionRecipe,
  ExtractionRunResult
} from "./types";

export function deriveFieldRecipe(
  recordSelector: string,
  selectedSelector: string,
  suggestedLabel = ""
): DerivedFieldResult {
  const MAX_RECORDS = 200;

  const cleanText = (value: string | null | undefined, max = 260) =>
    (value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

  const stableToken = (value: string) =>
    /^[A-Za-z_][A-Za-z0-9_-]{0,48}$/.test(value) &&
    !/[a-f0-9]{14,}/i.test(value) &&
    !/^(css|jsx|sc|emotion)-?[a-z0-9]{8,}$/i.test(value);

  const records = Array.from(document.querySelectorAll(recordSelector)).slice(
    0,
    MAX_RECORDS
  );
  const selected = Array.from(document.querySelectorAll(selectedSelector));

  let target: Element | null = null;
  let targetRecord: Element | null = null;

  for (const record of records) {
    const match = selected.find(
      (element) => element === record || record.contains(element)
    );

    if (match) {
      target = match;
      targetRecord = record;
      break;
    }
  }

  if (!target || !targetRecord) {
    throw new Error("The selected field is not inside the chosen record group.");
  }

  const relativePath = (element: Element, record: Element) => {
    if (element === record) {
      return ":scope";
    }

    const segments: string[] = [];
    let current: Element | null = element;

    while (current && current !== record && segments.length < 6) {
      const tag = current.tagName.toLowerCase();
      const classes = Array.from(current.classList)
        .filter(stableToken)
        .slice(0, 2);
      const parentElement: Element | null = current.parentElement;
      let segment = tag;

      if (classes.length) {
        segment += classes.map((value: string) => `.${CSS.escape(value)}`).join("");
      } else if (parentElement) {
        const currentTagName = current.tagName;
        const sameTag: Element[] = Array.from(parentElement.children).filter(
          (child: Element) => child.tagName === currentTagName
        );

        if (sameTag.length > 1) {
          segment += `:nth-of-type(${sameTag.indexOf(current) + 1})`;
        }
      }

      segments.unshift(segment);
      current = parentElement;
    }

    return segments.join(" > ");
  };

  const candidates = new Set<string>();
  const tag = target.tagName.toLowerCase();

  if (target === targetRecord) {
    candidates.add(":scope");
  }

  for (const name of ["itemprop", "role", "name"]) {
    const value = target.getAttribute(name);
    if (value && value.length <= 100) {
      candidates.add(`${tag}[${name}="${CSS.escape(value)}"]`);
    }
  }

  const classes = Array.from(target.classList)
    .filter(stableToken)
    .slice(0, 4);

  for (let count = Math.min(3, classes.length); count >= 1; count -= 1) {
    candidates.add(
      `${tag}${classes
        .slice(0, count)
        .map((value) => `.${CSS.escape(value)}`)
        .join("")}`
    );
  }

  candidates.add(tag);
  candidates.add(relativePath(target, targetRecord));

  const evaluate = (selector: string) => {
    let matchedRecords = 0;
    let uniqueRecords = 0;

    for (const record of records) {
      let matches: Element[] = [];

      try {
        matches =
          selector === ":scope"
            ? [record]
            : Array.from(record.querySelectorAll(selector));
      } catch {
        return null;
      }

      if (matches.length > 0) {
        matchedRecords += 1;
      }
      if (matches.length === 1) {
        uniqueRecords += 1;
      }
    }

    if (!matchedRecords) {
      return null;
    }

    const coverage = matchedRecords / Math.max(records.length, 1);
    const uniqueCoverage = uniqueRecords / Math.max(records.length, 1);
    const score =
      coverage * 100 +
      uniqueCoverage * 70 -
      Math.min(selector.length / 8, 12);

    return {
      selector,
      matchedRecords,
      coverage,
      uniqueCoverage,
      score
    };
  };

  const evaluations = Array.from(candidates)
    .map(evaluate)
    .filter((value): value is NonNullable<typeof value> => Boolean(value))
    .sort((left, right) => right.score - left.score);

  const best = evaluations[0];

  if (!best) {
    throw new Error("Unable to derive a reusable field selector.");
  }

  const source =
    tag === "img"
      ? "image"
      : tag === "a"
        ? "link"
        : "text";

  const labelSeed =
    suggestedLabel ||
    cleanText(target.getAttribute("aria-label"), 80) ||
    cleanText(target.getAttribute("itemprop"), 80) ||
    cleanText(target.textContent, 60) ||
    tag;

  const label = labelSeed || "Field";
  const keyBase = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  const key = keyBase || `field_${tag}`;

  const field: ExtractionFieldRecipe = {
    id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    key,
    label,
    selector: best.selector,
    source,
    attribute: "",
    required: false,
    transforms:
      source === "text"
        ? ["trim", "collapse-whitespace"]
        : ["trim"]
  };

  const readRaw = (record: Element) => {
    const element =
      best.selector === ":scope"
        ? record
        : record.querySelector(best.selector);

    if (!element) {
      return "";
    }

    if (source === "link") {
      return cleanText(element.getAttribute("href"), 260);
    }

    if (source === "image") {
      return cleanText(
        element.getAttribute("src") || element.getAttribute("data-src"),
        260
      );
    }

    return cleanText(element.textContent, 260);
  };

  return {
    field,
    matchedRecords: best.matchedRecords,
    recordCount: records.length,
    coverage: Number(best.coverage.toFixed(2)),
    samples: records
      .map(readRaw)
      .filter(Boolean)
      .slice(0, 5)
  };
}

export function executeExtractionRecipe(
  recipe: ExtractionRecipe
): ExtractionRunResult {
  const MAX_RECORDS = 500;

  const cleanString = (value: string | null | undefined) => value ?? "";

  const absoluteUrl = (value: string) => {
    if (!value) {
      return "";
    }

    try {
      return new URL(value, window.location.href).href;
    } catch {
      return value;
    }
  };

  const applyTransforms = (
    initialValue: string,
    transforms: ExtractionFieldRecipe["transforms"]
  ): string | number | null => {
    let value: string | number = initialValue;

    for (const transform of transforms) {
      if (transform === "trim") {
        value = String(value).trim();
      } else if (transform === "collapse-whitespace") {
        value = String(value).replace(/\s+/g, " ").trim();
      } else if (transform === "lowercase") {
        value = String(value).toLowerCase();
      } else if (transform === "uppercase") {
        value = String(value).toUpperCase();
      } else if (transform === "number") {
        const normalized: string = String(value).replace(/[^0-9+.\-]/g, "");
        const numberValue: number = Number(normalized);
        value = Number.isFinite(numberValue) ? numberValue : "";
      } else if (transform === "currency") {
        const normalized: string = String(value)
          .replace(/\s/g, "")
          .replace(/[^0-9,.\-]/g, "");

        let numeric: string = normalized;

        if (normalized.includes(",") && normalized.includes(".")) {
          numeric =
            normalized.lastIndexOf(".") > normalized.lastIndexOf(",")
              ? normalized.replace(/,/g, "")
              : normalized.replace(/\./g, "").replace(",", ".");
        } else if (
          normalized.includes(",") &&
          !normalized.includes(".") &&
          /,\d{2}$/.test(normalized)
        ) {
          numeric = normalized.replace(",", ".");
        } else {
          numeric = normalized.replace(/,/g, "");
        }

        const numberValue: number = Number(numeric);
        value = Number.isFinite(numberValue) ? numberValue : "";
      }
    }

    if (typeof value === "string" && value === "") {
      return null;
    }

    return value;
  };

  const records = Array.from(document.querySelectorAll(recipe.recordSelector));
  const limitedRecords = records.slice(0, MAX_RECORDS);
  const warnings: string[] = [];

  if (records.length > MAX_RECORDS) {
    warnings.push(
      `Record execution is capped at ${MAX_RECORDS} records in Build 006.`
    );
  }

  let populatedCells = 0;
  let emptyCells = 0;
  let requiredMissingCells = 0;

  const extracted = limitedRecords.map((record, index) => {
    const values: Record<string, string | number | null> = {};
    const recordWarnings: string[] = [];

    for (const field of recipe.fields) {
      let element: Element | null = null;

      try {
        element =
          field.selector === ":scope"
            ? record
            : record.querySelector(field.selector);
      } catch {
        recordWarnings.push(
          `${field.label}: invalid selector "${field.selector}".`
        );
      }

      let raw = "";

      if (element) {
        if (field.source === "text") {
          raw = cleanString(element.textContent);
        } else if (field.source === "link") {
          const link =
            element.matches("a[href]")
              ? element
              : element.querySelector("a[href]");
          raw = absoluteUrl(cleanString(link?.getAttribute("href")));
        } else if (field.source === "image") {
          const image =
            element.matches("img")
              ? element
              : element.querySelector("img");
          raw = absoluteUrl(
            cleanString(
              image?.getAttribute("src") || image?.getAttribute("data-src")
            )
          );
        } else if (field.source === "attribute") {
          raw = cleanString(element.getAttribute(field.attribute));
        }
      }

      const transformed = applyTransforms(raw, field.transforms);
      values[field.key] = transformed;

      if (transformed === null || transformed === "") {
        emptyCells += 1;

        if (field.required) {
          requiredMissingCells += 1;
          recordWarnings.push(`${field.label}: required value is missing.`);
        }
      } else {
        populatedCells += 1;
      }
    }

    return {
      index,
      values,
      warnings: recordWarnings
    };
  });

  if (!recipe.fields.length) {
    warnings.push("Recipe has no fields.");
  }

  if (!records.length) {
    warnings.push("Record selector matched no elements.");
  }

  return {
    recipeVersion: 1,
    sourceUrl: window.location.href,
    recordSelector: recipe.recordSelector,
    recordCount: records.length,
    fieldCount: recipe.fields.length,
    records: extracted,
    warnings,
    stats: {
      populatedCells,
      emptyCells,
      requiredMissingCells
    },
    truncated: records.length > MAX_RECORDS
  };
}
