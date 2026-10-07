export type BarcodeTarget = "personal-movie" | "devil-supplier";
export type BarcodeCaptureMethod = "camera" | "manual";
export type BarcodeMatchStatus = "exact" | "unmatched" | "duplicate";
export type BarcodeReviewStatus = "pending" | "approved" | "rejected";

export interface NormalizedBarcode {
  rawDigits: string;
  normalizedCode: string;
  displayCode: string;
  format: "ean-8" | "upc-a" | "ean-13" | "gtin-14" | "upc-e" | "unknown";
  validLength: boolean;
  validChecksum: boolean | null;
}

export interface BarcodeCaptureInput {
  workspaceId: string;
  target: BarcodeTarget;
  rawCode: string;
  formatHint: string;
  captureMethod: BarcodeCaptureMethod;
  capturedAt: string;
  offlineQueuedAt: string | null;
}

export interface BarcodeMatchSuggestion {
  status: Exclude<BarcodeMatchStatus, "duplicate">;
  payload: Record<string, unknown>;
}

function digits(value: unknown) {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
}

function checkDigitValid(value: string) {
  if (![8, 12, 13, 14].includes(value.length)) return null;
  const body = value.slice(0, -1);
  const expected = Number(value[value.length - 1]);
  let sum = 0;
  let weightThree = true;

  for (let index = body.length - 1; index >= 0; index -= 1) {
    const digit = Number(body[index]);
    sum += digit * (weightThree ? 3 : 1);
    weightThree = !weightThree;
  }

  const calculated = (10 - (sum % 10)) % 10;
  return calculated === expected;
}

export function normalizeBarcode(
  value: string,
  formatHint = ""
): NormalizedBarcode {
  const rawDigits = digits(value).slice(0, 32);
  const hint = formatHint.toLowerCase().replace(/[_\s]+/g, "-");

  let format: NormalizedBarcode["format"] = "unknown";
  if (hint.includes("upc-e")) format = "upc-e";
  else if (rawDigits.length === 8) format = "ean-8";
  else if (rawDigits.length === 12) format = "upc-a";
  else if (rawDigits.length === 13) format = "ean-13";
  else if (rawDigits.length === 14) format = "gtin-14";

  const validLength =
    format === "upc-e"
      ? rawDigits.length === 8
      : [8, 12, 13, 14].includes(rawDigits.length);

  const normalizedCode =
    format === "upc-e"
      ? "upce:" + rawDigits
      : validLength
        ? rawDigits.padStart(14, "0")
        : rawDigits;

  return {
    rawDigits,
    normalizedCode,
    displayCode: rawDigits,
    format,
    validLength,
    validChecksum:
      format === "upc-e" ? null : checkDigitValid(rawDigits)
  };
}

function cleanString(value: unknown, max: number) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, max)
    : "";
}

export function parseBarcodeCaptureInput(value: unknown): BarcodeCaptureInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Barcode capture request must be an object.");
  }

  const body = value as Record<string, unknown>;
  const workspaceId = cleanString(body.workspaceId, 80);
  const target = body.target;
  const rawCode = cleanString(body.rawCode, 64);
  const formatHint = cleanString(body.formatHint, 40);
  const captureMethod = body.captureMethod;
  const capturedAt = cleanString(body.capturedAt, 60);
  const offlineQueuedAt = cleanString(body.offlineQueuedAt, 60) || null;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      workspaceId
    )
  ) {
    throw new Error("A valid workspace ID is required.");
  }
  if (target !== "personal-movie" && target !== "devil-supplier") {
    throw new Error("Barcode target is not supported.");
  }
  if (captureMethod !== "camera" && captureMethod !== "manual") {
    throw new Error("Capture method must be camera or manual.");
  }

  const normalized = normalizeBarcode(rawCode, formatHint);
  if (!normalized.validLength) {
    throw new Error("Enter or scan an 8, 12, 13 or 14 digit UPC/EAN/GTIN barcode.");
  }
  if (!capturedAt || Number.isNaN(Date.parse(capturedAt))) {
    throw new Error("A valid capture timestamp is required.");
  }
  if (offlineQueuedAt && Number.isNaN(Date.parse(offlineQueuedAt))) {
    throw new Error("Offline queue timestamp is invalid.");
  }

  return {
    workspaceId,
    target,
    rawCode: normalized.rawDigits,
    formatHint,
    captureMethod,
    capturedAt: new Date(capturedAt).toISOString(),
    offlineQueuedAt: offlineQueuedAt
      ? new Date(offlineQueuedAt).toISOString()
      : null
  };
}

function normalizedCandidate(value: unknown) {
  const candidate = normalizeBarcode(String(value ?? ""));
  return candidate.validLength ? candidate.normalizedCode : "";
}

export function matchBarcodeAgainstIntelligence(input: {
  target: BarcodeTarget;
  normalizedCode: string;
  intelligencePayload: Record<string, unknown> | null;
}): BarcodeMatchSuggestion {
  if (!input.intelligencePayload) {
    return {
      status: "unmatched",
      payload: {
        reason: "No synchronized intelligence dataset is available yet."
      }
    };
  }

  if (input.target === "personal-movie") {
    const collection = Array.isArray(input.intelligencePayload.collection)
      ? input.intelligencePayload.collection
      : [];

    const matches = collection.flatMap((raw) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
      const record = raw as Record<string, unknown>;
      if (normalizedCandidate(record.upc) !== input.normalizedCode) return [];

      return [{
        recordId: cleanString(record.id, 120),
        title: cleanString(record.title, 300),
        year:
          typeof record.year === "number" && Number.isFinite(record.year)
            ? record.year
            : null
      }];
    });

    if (matches.length === 1) {
      return {
        status: "exact",
        payload: {
          workflow: "personal-movie",
          matchKind: "owned-upc-exact",
          ...matches[0]
        }
      };
    }

    if (matches.length > 1) {
      return {
        status: "unmatched",
        payload: {
          workflow: "personal-movie",
          reason:
            "Multiple owned movie records share this normalized barcode; manual review is required.",
          competingRecordIds: matches
            .map((match) => match.recordId)
            .filter(Boolean)
            .slice(0, 10)
        }
      };
    }

    return {
      status: "unmatched",
      payload: {
        workflow: "personal-movie",
        reason:
          "No owned movie UPC/EAN matches yet. Approval routes this identifier to the existing movie metadata lookup/review workflow."
      }
    };
  }

  const items = Array.isArray(input.intelligencePayload.items)
    ? input.intelligencePayload.items
    : [];

  const matches = items.flatMap((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const item = raw as Record<string, unknown>;
    const product =
      item.product &&
      typeof item.product === "object" &&
      !Array.isArray(item.product)
        ? (item.product as Record<string, unknown>)
        : null;
    if (!product) return [];

    const sku = cleanString(product.supplierSku, 120);
    if (!sku || normalizedCandidate(sku) !== input.normalizedCode) return [];

    return [{
      stagingItemId: cleanString(item.id, 120),
      supplierName: cleanString(product.supplierName, 240),
      productName: cleanString(product.productName, 300),
      supplierSku: sku,
      reviewStatus: cleanString(item.reviewStatus, 40)
    }];
  });

  if (matches.length === 1) {
    return {
      status: "exact",
      payload: {
        workflow: "devil-supplier",
        matchKind: "supplier-sku-exact",
        ...matches[0]
      }
    };
  }

  if (matches.length > 1) {
    return {
      status: "unmatched",
      payload: {
        workflow: "devil-supplier",
        reason:
          "Multiple supplier staging rows share this barcode-like SKU; manual review is required.",
        competingStagingItemIds: matches
          .map((match) => match.stagingItemId)
          .filter(Boolean)
          .slice(0, 10)
      }
    };
  }

  return {
    status: "unmatched",
    payload: {
      workflow: "devil-supplier",
      reason:
        "No supplier staging SKU matches yet. Approval routes this identifier to supplier/inventory lookup staging without changing internal inventory fields."
    }
  };
}

export function barcodeProvenance(input: BarcodeCaptureInput) {
  return {
    source: "ai-data-platform-mobile-barcode-intake",
    captureMethod: input.captureMethod,
    capturedAt: input.capturedAt,
    offlineQueuedAt: input.offlineQueuedAt,
    formatHint: input.formatHint || null,
    includesLocation: false
  };
}
