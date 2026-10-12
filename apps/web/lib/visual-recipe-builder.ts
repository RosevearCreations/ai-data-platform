export const RECIPE_SOURCES = ["text", "attribute", "link", "image"] as const;
export const RECIPE_TRANSFORMS = [
  "trim",
  "collapse-whitespace",
  "lowercase",
  "uppercase",
  "number",
  "currency"
] as const;

export type VisualRecipeSource = (typeof RECIPE_SOURCES)[number];
export type VisualRecipeTransform = (typeof RECIPE_TRANSFORMS)[number];

export interface VisualRecipeField {
  id: string;
  key: string;
  label: string;
  selector: string;
  source: VisualRecipeSource;
  attribute: string;
  required: boolean;
  transforms: VisualRecipeTransform[];
}

export interface VisualExtractionRecipe {
  version: 1;
  name: string;
  sourceUrl: string;
  recordSelector: string;
  fields: VisualRecipeField[];
}

export interface RecipeValidationIssue {
  level: "error" | "warning";
  code: string;
  message: string;
  fieldId?: string;
}

function text(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function normalizeKey(value: unknown, fallback: string) {
  const normalized = text(value, 80)
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || fallback;
}

export function normalizeRecipeSourceUrl(value: unknown) {
  const raw = text(value, 1000);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("recipe_source_url_invalid");
    }
    return url.toString();
  } catch {
    throw new Error("recipe_source_url_invalid");
  }
}

export function recipeSourceOrigin(value: string) {
  if (!value) return "";
  return new URL(value).origin.toLowerCase();
}

export function parseVisualRecipe(value: unknown): VisualExtractionRecipe {
  const input =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const rawFields = Array.isArray(input.fields) ? input.fields.slice(0, 20) : [];
  const fields = rawFields.map((raw, index): VisualRecipeField => {
    const field =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {};
    const sourceRaw = text(field.source, 20);
    const source = RECIPE_SOURCES.includes(sourceRaw as VisualRecipeSource)
      ? (sourceRaw as VisualRecipeSource)
      : "text";
    const transforms = Array.isArray(field.transforms)
      ? field.transforms
          .filter(
            (item): item is VisualRecipeTransform =>
              typeof item === "string" &&
              RECIPE_TRANSFORMS.includes(item as VisualRecipeTransform)
          )
          .filter((item, position, all) => all.indexOf(item) === position)
          .slice(0, RECIPE_TRANSFORMS.length)
      : [];
    return {
      id: text(field.id, 120) || "field-" + String(index + 1),
      key: normalizeKey(field.key, "field_" + String(index + 1)),
      label: text(field.label, 120) || "Field " + String(index + 1),
      selector: text(field.selector, 500) || ":scope",
      source,
      attribute: source === "attribute" ? text(field.attribute, 120) : "",
      required: field.required === true,
      transforms
    };
  });
  return {
    version: 1,
    name: text(input.name, 120) || "Untitled extraction recipe",
    sourceUrl: normalizeRecipeSourceUrl(input.sourceUrl),
    recordSelector: text(input.recordSelector, 500),
    fields
  };
}

export function validateVisualRecipe(recipe: VisualExtractionRecipe) {
  const issues: RecipeValidationIssue[] = [];
  if (!recipe.recordSelector) {
    issues.push({
      level: "error",
      code: "record-selector-required",
      message: "Record selector is required."
    });
  }
  if (!recipe.fields.length) {
    issues.push({
      level: "error",
      code: "field-required",
      message: "Add at least one extraction field."
    });
  }
  if (recipe.fields.length > 20) {
    issues.push({
      level: "error",
      code: "field-limit",
      message: "Recipes are limited to 20 fields."
    });
  }

  const keys = new Map<string, number>();
  for (const field of recipe.fields) {
    keys.set(field.key, (keys.get(field.key) ?? 0) + 1);
    if (!field.selector) {
      issues.push({
        level: "error",
        code: "field-selector-required",
        fieldId: field.id,
        message: field.label + " needs a relative selector."
      });
    }
    if (field.source === "attribute" && !field.attribute) {
      issues.push({
        level: "error",
        code: "attribute-required",
        fieldId: field.id,
        message: field.label + " needs an attribute name."
      });
    }
    if (!field.transforms.length) {
      issues.push({
        level: "warning",
        code: "no-transforms",
        fieldId: field.id,
        message: field.label + " has no cleanup transforms."
      });
    }
  }
  for (const [key, count] of keys) {
    if (count > 1) {
      issues.push({
        level: "error",
        code: "duplicate-field-key",
        message: 'Field key "' + key + '" is used more than once.'
      });
    }
  }
  return issues;
}

export function recipeCanSave(recipe: VisualExtractionRecipe) {
  return !validateVisualRecipe(recipe).some((issue) => issue.level === "error");
}

export function applyRecipeTransforms(
  raw: string,
  transforms: VisualRecipeTransform[]
): string | number | null {
  let value = raw;
  for (const transform of transforms) {
    if (transform === "trim") value = value.trim();
    if (transform === "collapse-whitespace") value = value.replace(/\s+/g, " ").trim();
    if (transform === "lowercase") value = value.toLowerCase();
    if (transform === "uppercase") value = value.toUpperCase();
    if (transform === "number" || transform === "currency") {
      const cleaned = value.replace(/[^0-9+\-.]/g, "");
      if (!cleaned) return null;
      const number = Number(cleaned);
      if (!Number.isFinite(number)) return null;
      return number;
    }
  }
  return value || null;
}

export function cloneVisualRecipe(recipe: VisualExtractionRecipe): VisualExtractionRecipe {
  return {
    ...recipe,
    fields: recipe.fields.map((field) => ({
      ...field,
      transforms: [...field.transforms]
    }))
  };
}
