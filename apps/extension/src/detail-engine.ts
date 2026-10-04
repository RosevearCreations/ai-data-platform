import type {
  DetailFieldRecipe,
  ExtractionTransform
} from "./types";

export interface DetailExtractionOutput {
  values: Record<string, string | number | null>;
  warnings: string[];
}

function cleanString(value: string | null | undefined) {
  return value ?? "";
}

function attributeAllowed(name: string) {
  const normalized = name.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  if (
    normalized === "value" ||
    normalized === "srcdoc" ||
    normalized.startsWith("on")
  ) {
    return false;
  }

  return /^[a-z_:][a-z0-9_.:-]*$/i.test(normalized);
}

function absoluteUrl(value: string, baseUrl: string) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value, baseUrl).href;
  } catch {
    return value;
  }
}

function applyTransforms(
  initialValue: string,
  transforms: ExtractionTransform[]
): string | number | null {
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
      const normalized = String(value).replace(/[^0-9+.\-]/g, "");
      const numberValue = Number(normalized);
      value = Number.isFinite(numberValue) ? numberValue : "";
    } else if (transform === "currency") {
      const normalized = String(value)
        .replace(/\s/g, "")
        .replace(/[^0-9,.\-]/g, "");

      let numeric = normalized;

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

      const numberValue = Number(numeric);
      value = Number.isFinite(numberValue) ? numberValue : "";
    }
  }

  if (typeof value === "string" && value === "") {
    return null;
  }

  return value;
}

export function normalizeDetailUrl(
  value: string | number | null | undefined,
  parentUrl: string
) {
  if (value === null || value === undefined) {
    return "";
  }

  const raw = String(value).trim();

  if (!raw) {
    return "";
  }

  try {
    const url = new URL(raw, parentUrl);

    if (!["http:", "https:"].includes(url.protocol)) {
      return "";
    }

    url.hash = "";
    return url.href;
  } catch {
    return "";
  }
}

export function sameOrigin(url: string, origin: string) {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

export function extractDetailFields(
  html: string,
  baseUrl: string,
  fields: DetailFieldRecipe[]
): DetailExtractionOutput {
  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");
  const values: Record<string, string | number | null> = {};
  const warnings: string[] = [];

  for (const field of fields) {
    let element: Element | null = null;

    try {
      element = document.querySelector(field.selector);
    } catch {
      warnings.push(
        `${field.label}: invalid selector "${field.selector}".`
      );
    }

    let raw = "";

    if (element) {
      if (field.source === "text") {
        raw = cleanString(element.textContent);
      } else if (field.source === "link") {
        const link = element.matches("a[href]")
          ? element
          : element.querySelector("a[href]");
        raw = absoluteUrl(cleanString(link?.getAttribute("href")), baseUrl);
      } else if (field.source === "image") {
        const image = element.matches("img")
          ? element
          : element.querySelector("img");
        raw = absoluteUrl(
          cleanString(
            image?.getAttribute("src") || image?.getAttribute("data-src")
          ),
          baseUrl
        );
      } else if (field.source === "meta") {
        raw = cleanString(element.getAttribute("content"));
      } else if (field.source === "attribute") {
        if (!attributeAllowed(field.attribute)) {
          warnings.push(
            `${field.label}: attribute "${field.attribute}" is not allowed.`
          );
        } else {
          raw = cleanString(element.getAttribute(field.attribute));
        }
      }
    }

    const transformed = applyTransforms(raw, field.transforms);
    values[field.key] = transformed;

    if (
      field.required &&
      (transformed === null || transformed === "")
    ) {
      warnings.push(`${field.label}: required value is missing.`);
    }
  }

  return { values, warnings };
}
