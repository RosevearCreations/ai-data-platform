import type {
  ExtractionRecipe,
  RecipeFieldCompatibility,
  ScraperCompatibilityReport
} from "./types";

export function inspectSavedScraperCompatibility(
  recipe: ExtractionRecipe
): ScraperCompatibilityReport {
  const warnings: string[] = [];
  let records: Element[] = [];
  try {
    records = Array.from(document.querySelectorAll(recipe.recordSelector));
  } catch {
    return {
      checkedAt: new Date().toISOString(),
      url: window.location.href,
      status: "broken",
      recordMatches: 0,
      sampledRecords: 0,
      fields: [],
      warnings: ["Record selector is invalid CSS: " + recipe.recordSelector]
    };
  }
  if (!records.length) {
    return {
      checkedAt: new Date().toISOString(),
      url: window.location.href,
      status: "broken",
      recordMatches: 0,
      sampledRecords: 0,
      fields: [],
      warnings: ["Record selector matched no elements on the current page."]
    };
  }
  const sample = records.slice(0, 100);
  const fields: RecipeFieldCompatibility[] = recipe.fields.map((field) => {
    let matchedRecords = 0;
    let validSelector = true;
    for (const record of sample) {
      try {
        const element = field.selector === ":scope" ? record : record.querySelector(field.selector);
        if (element) matchedRecords += 1;
      } catch {
        validSelector = false;
        break;
      }
    }
    const coverage = sample.length ? Number((matchedRecords / sample.length).toFixed(2)) : 0;
    if (!validSelector) {
      warnings.push(field.label + ": invalid selector " + field.selector);
    } else if (field.required && coverage < 0.8) {
      warnings.push(field.label + ": required field coverage is " + Math.round(coverage * 100) + "%.");
    } else if (coverage < 0.5) {
      warnings.push(field.label + ": selector coverage fell to " + Math.round(coverage * 100) + "%.");
    }
    return {
      key: field.key,
      label: field.label,
      matchedRecords,
      sampledRecords: sample.length,
      coverage,
      required: field.required,
      validSelector
    };
  });
  const invalidFields = fields.filter((field) => !field.validSelector);
  const brokenRequired = fields.filter((field) => field.required && field.coverage === 0);
  const weakFields = fields.filter((field) => field.coverage < 0.5);
  let status: ScraperCompatibilityReport["status"] = "healthy";
  if (invalidFields.length || brokenRequired.length) status = "broken";
  else if (records.length < 2 || weakFields.length || warnings.length) status = "degraded";
  return {
    checkedAt: new Date().toISOString(),
    url: window.location.href,
    status,
    recordMatches: records.length,
    sampledRecords: sample.length,
    fields,
    warnings
  };
}
