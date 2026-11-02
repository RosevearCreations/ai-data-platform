import { readFile } from "node:fs/promises";
import path from "node:path";

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error("Build 270 verification failed: " + message);
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

async function main() {
  const [model, page, nav, doc, status, queue] = await Promise.all([
    source("lib/capacity-planning.ts"),
    source("app/capacity-planning/page.tsx"),
    source("lib/application-navigation.ts"),
    source("../../docs/BUILD_270_CAPACITY_COST_USAGE_PLANNING.md"),
    source("../../docs/integration/ql266-ai-data-platform-build270-review.json"),
    source("../../docs/NEXT_BUILDS_254_272.md")
  ]);

  for (const token of [
    "storage",
    "records",
    "provider-units",
    "collection-frequency",
    "integration-volume",
    "retention"
  ]) ensure(model.includes(token), "planning metric " + token);

  ensure(model.includes('actualBillingImported: false'), "actual billing boundary");
  ensure(model.includes('currencyPricingApplied: false'), "currency pricing boundary");
  ensure(model.includes("CAPACITY_SCENARIOS"), "planning scenarios");
  ensure(page.includes("Capacity, Cost &amp; Usage Planning"), "capacity planning page");
  ensure(page.includes("Planning estimate — not a bill"), "billing disclaimer");
  ensure(nav.includes('href: "/capacity-planning"') && nav.includes("Capacity Planning"), "navigation");
  ensure(doc.includes("cost proxies") && doc.includes("Build 271"), "documentation");

  const parsed = JSON.parse(status);
  ensure(parsed.build === 270, "status build");
  ensure(parsed.capacity_cost_usage_planning.actual_billing_imported === false, "no billing import");
  ensure(parsed.capacity_cost_usage_planning.currency_pricing_applied === false, "no currency pricing");
  ensure(parsed.connection_state === "DISCONNECTED", "QL-266 disconnected");
  ensure(parsed.new_ql266_test_started === false, "no QL-266 restart");
  ensure(parsed.next_build === 271, "next build");
  ensure(
    queue.includes("Build 271 — Accessibility, Mobile, Performance & Failure-Recovery Hardening"),
    "queue Build 271"
  );

  console.log("Build 270 Capacity, Cost & Usage Planning verification passed.");
}

void main();
