import type {
  ExtractionFieldRecipe,
  ExtractionRecipe,
  RecipeFieldCompatibility,
  ScraperCompatibilityReport,
  ScraperDriftIssue,
  ScraperRepairCandidate
} from "./types";

export function inspectSavedScraperCompatibility(
  recipe: ExtractionRecipe,
  previousReport: ScraperCompatibilityReport | null = null
): ScraperCompatibilityReport {
  const warnings: string[] = [];
  const issues: ScraperDriftIssue[] = [];
  const checkedAt = new Date().toISOString();

  function hash(value: string) {
    let current = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      current ^= value.charCodeAt(index);
      current = Math.imul(current, 16777619);
    }
    return (current >>> 0).toString(16).padStart(8, "0");
  }

  function cleanToken(value: string) {
    return value
      .replace(/[^a-zA-Z0-9_-]+/g, "")
      .trim()
      .slice(0, 80);
  }

  function selectorTokens(selector: string) {
    const tokens = selector
      .split(/[\s>+~.#:[\]="']+/)
      .map(cleanToken)
      .filter((token) => token.length >= 2);
    return Array.from(new Set(tokens)).slice(0, 12);
  }

  function classTokens(element: Element) {
    return Array.from(element.classList)
      .map(cleanToken)
      .filter(Boolean)
      .slice(0, 5);
  }

  function structuralLabel(element: Element) {
    const classes = classTokens(element).slice(0, 3);
    const childLabels = Array.from(element.children)
      .slice(0, 5)
      .map((child) => {
        const childClasses = classTokens(child).slice(0, 2);
        return (
          child.tagName.toLowerCase() +
          (childClasses.length ? "." + childClasses.join(".") : "")
        );
      });
    return (
      element.tagName.toLowerCase() +
      (classes.length ? "." + classes.join(".") : "") +
      (childLabels.length ? " > " + childLabels.join(", ") : "")
    ).slice(0, 260);
  }

  function structuralFingerprint(elements: Element[]) {
    const signatures = elements.slice(0, 16).map(structuralLabel).sort();
    if (!signatures.length) {
      const fallback = Array.from(document.body?.children ?? [])
        .slice(0, 24)
        .map(structuralLabel)
        .sort();
      return hash(fallback.join("|"));
    }
    return hash(signatures.join("|"));
  }

  function relativeSelector(element: Element) {
    const tag = element.tagName.toLowerCase();
    const classes = classTokens(element);
    if (classes.length) {
      return tag + "." + classes.slice(0, 2).join(".");
    }
    return tag;
  }

  function selectorCandidatesFromElement(element: Element) {
    const tag = element.tagName.toLowerCase();
    const classes = classTokens(element);
    const selectors = new Set<string>();
    if (classes.length) {
      selectors.add(tag + "." + classes.slice(0, 2).join("."));
      selectors.add("." + classes[0]);
      if (classes.length > 1) {
        selectors.add("." + classes[0] + "." + classes[1]);
      }
    }
    selectors.add(tag);
    return Array.from(selectors).slice(0, 4);
  }

  function sampleValue(
    element: Element | null,
    field: ExtractionFieldRecipe
  ) {
    if (!element) return "";
    let raw = "";
    if (field.source === "link") {
      raw =
        element instanceof HTMLAnchorElement
          ? element.href
          : element.getAttribute("href") ?? "";
    } else if (field.source === "image") {
      raw =
        element instanceof HTMLImageElement
          ? element.currentSrc || element.src
          : element.getAttribute("src") ?? "";
    } else if (field.source === "attribute") {
      raw = element.getAttribute(field.attribute) ?? "";
    } else {
      raw = element.textContent ?? "";
    }
    return raw.replace(/\s+/g, " ").trim().slice(0, 180);
  }

  function contextFor(elements: Element[]) {
    return Array.from(
      new Set(elements.slice(0, 5).map(structuralLabel))
    ).slice(0, 3);
  }

  function evaluateFieldSelector(
    records: Element[],
    selector: string,
    field: ExtractionFieldRecipe
  ) {
    const sample = records.slice(0, 100);
    let valid = true;
    let matched = 0;
    const matchedElements: Element[] = [];
    const samples: string[] = [];

    for (const record of sample) {
      try {
        const element =
          selector === ":scope" ? record : record.querySelector(selector);
        if (element) {
          matched += 1;
          matchedElements.push(element);
          const value = sampleValue(element, field);
          if (value && samples.length < 4) samples.push(value);
        }
      } catch {
        valid = false;
        break;
      }
    }

    return {
      valid,
      matched,
      sampleCount: sample.length,
      coverage: sample.length
        ? Number((matched / sample.length).toFixed(2))
        : 0,
      matchedElements,
      samples
    };
  }

  function fieldRepairCandidates(
    records: Element[],
    field: ExtractionFieldRecipe
  ): ScraperRepairCandidate[] {
    if (!records.length) return [];
    const oldTokens = new Set(selectorTokens(field.selector));
    const selectorPool = new Set<string>();

    for (const record of records.slice(0, 8)) {
      const descendants = Array.from(record.querySelectorAll("*")).slice(0, 160);
      for (const element of descendants) {
        for (const selector of selectorCandidatesFromElement(element)) {
          selectorPool.add(selector);
          if (selectorPool.size >= 160) break;
        }
        if (selectorPool.size >= 160) break;
      }
      if (selectorPool.size >= 160) break;
    }

    const candidates: ScraperRepairCandidate[] = [];
    for (const selector of selectorPool) {
      if (selector === field.selector) continue;
      const evaluated = evaluateFieldSelector(records, selector, field);
      if (!evaluated.valid || evaluated.coverage < 0.25) continue;

      const candidateTokens = new Set(selectorTokens(selector));
      const overlap = Array.from(candidateTokens).filter((token) =>
        oldTokens.has(token)
      ).length;
      const sourceBoost =
        (field.source === "link" && selector.startsWith("a")) ||
        (field.source === "image" && selector.startsWith("img"))
          ? 0.12
          : 0;
      const requiredBoost =
        field.required && evaluated.coverage >= 0.8 ? 0.08 : 0;
      const score = Math.min(
        1,
        evaluated.coverage * 0.72 +
          Math.min(0.16, overlap * 0.05) +
          sourceBoost +
          requiredBoost
      );

      candidates.push({
        id: "repair-field-" + field.key + "-" + hash(selector),
        target: "field",
        fieldKey: field.key,
        selector,
        score: Number(score.toFixed(3)),
        matchedRecords: evaluated.matched,
        sampledRecords: evaluated.sampleCount,
        coverage: evaluated.coverage,
        reasons: [
          Math.round(evaluated.coverage * 100) + "% sample coverage",
          overlap
            ? overlap + " selector token" + (overlap === 1 ? "" : "s") + " retained"
            : "nearby deterministic descendant selector",
          sourceBoost ? "matches the field source element type" : ""
        ].filter(Boolean),
        context: contextFor(evaluated.matchedElements),
        samples: evaluated.samples
      });
    }

    return candidates
      .sort(
        (left, right) =>
          right.score - left.score ||
          right.coverage - left.coverage ||
          left.selector.localeCompare(right.selector)
      )
      .slice(0, 5);
  }

  function recordRepairCandidates(): ScraperRepairCandidate[] {
    const oldTokens = new Set(selectorTokens(recipe.recordSelector));
    const candidateMap = new Map<
      string,
      {
        selector: string;
        nodes: Element[];
        fieldSupport: number;
        tokenOverlap: number;
      }
    >();

    const all = Array.from(document.querySelectorAll("*")).slice(0, 1800);
    for (const element of all) {
      for (const selector of selectorCandidatesFromElement(element)) {
        if (selector === recipe.recordSelector) continue;
        let nodes: Element[] = [];
        try {
          nodes = Array.from(document.querySelectorAll(selector)).slice(0, 220);
        } catch {
          continue;
        }
        if (nodes.length < 2 || nodes.length > 200) continue;

        let fieldSupport = 0;
        for (const field of recipe.fields.slice(0, 12)) {
          const supportSample = nodes.slice(0, 10);
          let matches = 0;
          for (const record of supportSample) {
            try {
              if (
                field.selector === ":scope" ||
                record.querySelector(field.selector)
              ) {
                matches += 1;
              }
            } catch {
              // Invalid field selectors do not contribute to boundary support.
            }
          }
          if (
            supportSample.length &&
            matches / supportSample.length >= 0.5
          ) {
            fieldSupport += 1;
          }
        }

        const candidateTokens = new Set(selectorTokens(selector));
        const tokenOverlap = Array.from(candidateTokens).filter((token) =>
          oldTokens.has(token)
        ).length;
        const current = candidateMap.get(selector);
        if (
          !current ||
          fieldSupport > current.fieldSupport ||
          nodes.length > current.nodes.length
        ) {
          candidateMap.set(selector, {
            selector,
            nodes,
            fieldSupport,
            tokenOverlap
          });
        }
      }
      if (candidateMap.size >= 120) break;
    }

    return Array.from(candidateMap.values())
      .map((item) => {
        const supportRatio = recipe.fields.length
          ? Math.min(1, item.fieldSupport / recipe.fields.length)
          : 0;
        const countScore =
          item.nodes.length >= 2 && item.nodes.length <= 80 ? 0.22 : 0.1;
        const score = Math.min(
          1,
          supportRatio * 0.58 +
            Math.min(0.2, item.tokenOverlap * 0.06) +
            countScore
        );
        return {
          id: "repair-record-" + hash(item.selector),
          target: "record" as const,
          fieldKey: null,
          selector: item.selector,
          score: Number(score.toFixed(3)),
          matchedRecords: item.nodes.length,
          sampledRecords: Math.min(item.nodes.length, 100),
          coverage: 1,
          reasons: [
            item.nodes.length + " repeated page matches",
            item.fieldSupport +
              "/" +
              recipe.fields.length +
              " recipe fields retain support",
            item.tokenOverlap
              ? item.tokenOverlap +
                " selector token" +
                (item.tokenOverlap === 1 ? "" : "s") +
                " retained"
              : "deterministic nearby structural candidate"
          ],
          context: contextFor(item.nodes),
          samples: item.nodes.slice(0, 3).flatMap((record) => {
            const values = recipe.fields.slice(0, 4).flatMap((field) => {
              let element: Element | null = null;
              try {
                element =
                  field.selector === ":scope"
                    ? record
                    : record.querySelector(field.selector);
              } catch {
                return [];
              }
              const value = sampleValue(element, field);
              return value ? [field.label + "=" + value] : [];
            });
            return values.length ? [values.join(" · ").slice(0, 240)] : [];
          })
        };
      })
      .sort(
        (left, right) =>
          right.score - left.score ||
          right.matchedRecords - left.matchedRecords ||
          left.selector.localeCompare(right.selector)
      )
      .slice(0, 5);
  }

  let records: Element[] = [];
  let recordSelectorValid = true;
  try {
    records = Array.from(document.querySelectorAll(recipe.recordSelector));
  } catch {
    recordSelectorValid = false;
  }

  const pageFingerprint = structuralFingerprint(records);
  const previousFingerprint =
    previousReport?.structuralFingerprint ?? null;
  const structuralChanged =
    Boolean(previousFingerprint) && previousFingerprint !== pageFingerprint;

  if (!recordSelectorValid || !records.length) {
    const candidates = recordRepairCandidates();
    const cause = !recordSelectorValid
      ? "invalid-record-selector"
      : "record-boundary-drift";
    const message = !recordSelectorValid
      ? "Record selector is invalid CSS: " + recipe.recordSelector
      : "Record selector matched no elements on the current page.";
    warnings.push(message);
    issues.push({
      id: "drift-record-boundary",
      severity: "broken",
      cause,
      target: "record",
      fieldKey: null,
      label: "Record boundary",
      currentSelector: recipe.recordSelector,
      previousCoverage: previousReport?.recordMatches
        ? 1
        : null,
      currentCoverage: 0,
      context: candidates.flatMap((candidate) => candidate.context).slice(0, 3),
      candidates
    });

    return {
      checkedAt,
      url: window.location.href,
      status: "broken",
      recordMatches: 0,
      sampledRecords: 0,
      structuralFingerprint: pageFingerprint,
      previousStructuralFingerprint: previousFingerprint,
      structuralChanged,
      fields: [],
      issues,
      repairCandidateCount: candidates.length,
      warnings
    };
  }

  const sample = records.slice(0, 100);
  const previousFields = new Map(
    (previousReport?.fields ?? []).map((field) => [field.key, field])
  );
  const fields: RecipeFieldCompatibility[] = recipe.fields.map((field) => {
    const evaluated = evaluateFieldSelector(sample, field.selector, field);
    const previousCoverage =
      previousFields.get(field.key)?.coverage ?? null;
    const delta =
      previousCoverage === null
        ? null
        : Number((evaluated.coverage - previousCoverage).toFixed(2));
    const trend =
      !evaluated.valid || evaluated.coverage === 0
        ? "broken"
        : previousCoverage === null
          ? "new"
          : delta !== null && delta <= -0.2
            ? "degraded"
            : delta !== null && delta >= 0.2
              ? "improved"
              : "stable";

    if (!evaluated.valid) {
      warnings.push(field.label + ": invalid selector " + field.selector);
    } else if (field.required && evaluated.coverage < 0.8) {
      warnings.push(
        field.label +
          ": required field coverage is " +
          Math.round(evaluated.coverage * 100) +
          "%."
      );
    } else if (
      previousCoverage !== null &&
      previousCoverage - evaluated.coverage >= 0.25
    ) {
      warnings.push(
        field.label +
          ": selector coverage dropped from " +
          Math.round(previousCoverage * 100) +
          "% to " +
          Math.round(evaluated.coverage * 100) +
          "%."
      );
    } else if (evaluated.coverage < 0.5) {
      warnings.push(
        field.label +
          ": selector coverage is " +
          Math.round(evaluated.coverage * 100) +
          "%."
      );
    }

    const shouldDiagnose =
      !evaluated.valid ||
      evaluated.coverage === 0 ||
      (field.required && evaluated.coverage < 0.8) ||
      (previousCoverage !== null &&
        previousCoverage - evaluated.coverage >= 0.25) ||
      evaluated.coverage < 0.5;

    if (shouldDiagnose) {
      const cause = !evaluated.valid
        ? "invalid-field-selector"
        : evaluated.coverage === 0
          ? "field-selector-missing"
          : "coverage-drop";
      const candidates = fieldRepairCandidates(sample, field);
      issues.push({
        id: "drift-field-" + field.key,
        severity:
          !evaluated.valid ||
          (field.required && evaluated.coverage === 0)
            ? "broken"
            : "warning",
        cause,
        target: "field",
        fieldKey: field.key,
        label: field.label,
        currentSelector: field.selector,
        previousCoverage,
        currentCoverage: evaluated.coverage,
        context: contextFor(evaluated.matchedElements),
        candidates
      });
    }

    return {
      key: field.key,
      label: field.label,
      selector: field.selector,
      matchedRecords: evaluated.matched,
      sampledRecords: evaluated.sampleCount,
      coverage: evaluated.coverage,
      previousCoverage,
      trend,
      required: field.required,
      validSelector: evaluated.valid,
      samples: evaluated.samples
    };
  });

  if (records.length < 2) {
    warnings.push("Record selector matched fewer than two repeated records.");
    issues.push({
      id: "drift-low-record-count",
      severity: "warning",
      cause: "low-record-count",
      target: "record",
      fieldKey: null,
      label: "Record boundary",
      currentSelector: recipe.recordSelector,
      previousCoverage: null,
      currentCoverage: records.length ? 1 : 0,
      context: contextFor(records),
      candidates: recordRepairCandidates()
    });
  }

  if (structuralChanged) {
    issues.push({
      id: "drift-structure",
      severity: "warning",
      cause: "structural-drift",
      target: "structure",
      fieldKey: null,
      label: "Record structure",
      currentSelector: recipe.recordSelector,
      previousCoverage: null,
      currentCoverage: null,
      context: contextFor(records),
      candidates: []
    });
  }

  const invalidFields = fields.filter((field) => !field.validSelector);
  const brokenRequired = fields.filter(
    (field) => field.required && field.coverage === 0
  );
  const weakFields = fields.filter((field) => field.coverage < 0.5);
  let status: ScraperCompatibilityReport["status"] = "healthy";
  if (invalidFields.length || brokenRequired.length) {
    status = "broken";
  } else if (
    records.length < 2 ||
    weakFields.length ||
    warnings.length ||
    structuralChanged
  ) {
    status = "degraded";
  }

  return {
    checkedAt,
    url: window.location.href,
    status,
    recordMatches: records.length,
    sampledRecords: sample.length,
    structuralFingerprint: pageFingerprint,
    previousStructuralFingerprint: previousFingerprint,
    structuralChanged,
    fields,
    issues,
    repairCandidateCount: issues.reduce(
      (total, issue) => total + issue.candidates.length,
      0
    ),
    warnings
  };
}
