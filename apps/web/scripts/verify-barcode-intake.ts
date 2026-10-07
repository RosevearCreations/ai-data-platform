import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  barcodeProvenance,
  matchBarcodeAgainstIntelligence,
  normalizeBarcode,
  parseBarcodeCaptureInput
} from "../lib/barcodes";

const upc = normalizeBarcode("036000291452", "upc_a");
assert.equal(upc.format, "upc-a");
assert.equal(upc.validLength, true);
assert.equal(upc.validChecksum, true);
assert.equal(upc.normalizedCode, "00036000291452");

const eanEquivalent = normalizeBarcode("0036000291452", "ean_13");
assert.equal(eanEquivalent.normalizedCode, upc.normalizedCode);

const ean8 = normalizeBarcode("96385074", "ean_8");
assert.equal(ean8.format, "ean-8");
assert.equal(ean8.validChecksum, true);

const invalidChecksum = normalizeBarcode("036000291453", "upc_a");
assert.equal(invalidChecksum.validLength, true);
assert.equal(invalidChecksum.validChecksum, false);

assert.throws(
  () =>
    parseBarcodeCaptureInput({
      workspaceId: "11111111-1111-4111-8111-111111111111",
      target: "personal-movie",
      rawCode: "12345",
      formatHint: "",
      captureMethod: "manual",
      capturedAt: new Date().toISOString()
    }),
  /8, 12, 13 or 14 digit/i
);

const capturedAt = "2026-10-07T16:00:00.000Z";
const parsed = parseBarcodeCaptureInput({
  workspaceId: "11111111-1111-4111-8111-111111111111",
  target: "personal-movie",
  rawCode: "0360 0029 1452",
  formatHint: "upc_a",
  captureMethod: "camera",
  capturedAt,
  offlineQueuedAt: "2026-10-07T15:59:00.000Z",
  latitude: 43.0,
  longitude: -80.0
});
assert.equal(parsed.rawCode, "036000291452");
assert.equal(parsed.captureMethod, "camera");

const provenance = barcodeProvenance(parsed);
assert.equal(provenance.includesLocation, false);
assert.equal("latitude" in provenance, false);
assert.equal("longitude" in provenance, false);

const movieMatch = matchBarcodeAgainstIntelligence({
  target: "personal-movie",
  normalizedCode: upc.normalizedCode,
  intelligencePayload: {
    collection: [
      {
        id: "movie-1",
        title: "Fixture Movie",
        year: 2026,
        upc: "036000291452",
        ownership: {
          format: "Blu-ray",
          shelfLocation: "Private shelf",
          condition: "Owned",
          notes: "Must remain private from capture match payload."
        }
      }
    ]
  }
});
assert.equal(movieMatch.status, "exact");
assert.equal(movieMatch.payload.recordId, "movie-1");
assert.equal("ownership" in movieMatch.payload, false);
assert.equal("notes" in movieMatch.payload, false);

const supplierMatch = matchBarcodeAgainstIntelligence({
  target: "devil-supplier",
  normalizedCode: upc.normalizedCode,
  intelligencePayload: {
    items: [
      {
        id: "supplier-stage-1",
        reviewStatus: "pending",
        product: {
          supplierName: "Fixture Supplier",
          productName: "Fixture Resin",
          supplierSku: "036000291452",
          internalLocation: "Must not cross barcode handoff"
        }
      }
    ]
  }
});
assert.equal(supplierMatch.status, "exact");
assert.equal(supplierMatch.payload.stagingItemId, "supplier-stage-1");
assert.equal("internalLocation" in supplierMatch.payload, false);

const captureSource = await readFile(
  new URL("../app/capture/barcode-capture-client.tsx", import.meta.url),
  "utf8"
);
assert.match(captureSource, /navigator\.mediaDevices\.getUserMedia/);
assert.match(captureSource, /track\.stop\(\)/);
assert.equal(captureSource.includes("navigator.geolocation"), false);
assert.equal(captureSource.includes("watchPosition"), false);
assert.equal(captureSource.includes("getCurrentPosition"), false);

const getUserMediaCalls =
  captureSource.match(/navigator\.mediaDevices\.getUserMedia/g)?.length ?? 0;
assert.equal(
  getUserMediaCalls,
  1,
  "Camera permission should have one explicit acquisition path."
);

console.log(
  "Build 024 UPC/EAN normalization, privacy, matching and explicit-camera-path verification passed."
);
