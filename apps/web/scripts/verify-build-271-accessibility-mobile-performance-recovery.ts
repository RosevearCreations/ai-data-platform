import { readFile } from "node:fs/promises";
import path from "node:path";

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error("Build 271 verification failed: " + message);
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

async function main() {
  const [audit, page, loading, error, shell, css, nav, doc, status, queue, pkg] = await Promise.all([
    source("lib/hardening-audit.ts"),
    source("app/hardening/page.tsx"),
    source("app/loading.tsx"),
    source("app/error.tsx"),
    source("app/application-shell.tsx"),
    source("app/globals.css"),
    source("lib/application-navigation.ts"),
    source("../../docs/BUILD_271_ACCESSIBILITY_MOBILE_PERFORMANCE_RECOVERY.md"),
    source("../../docs/integration/ql266-ai-data-platform-build271-review.json"),
    source("../../docs/NEXT_BUILDS_254_272.md"),
    source("package.json")
  ]);

  for (const token of [
    "keyboard-focus",
    "screen-reader-route",
    "reduced-motion",
    "forced-colors",
    "narrow-layout",
    "touch-targets",
    "loading-state",
    "error-retry",
    "page-weight",
    "query-performance"
  ]) ensure(audit.includes(token), "audit item " + token);

  ensure(page.includes("Accessibility, Mobile, Performance &amp; Failure-Recovery Hardening"), "hardening page");
  ensure(loading.includes('role="status"') && loading.includes('aria-busy="true"'), "semantic loading state");
  ensure(error.includes("reset()") && error.includes("Return to Command Center"), "recoverable error state");
  ensure(shell.includes('aria-live="polite"') && shell.includes("applicationRouteStatus"), "route announcement");
  ensure(css.includes("Build 271") && css.includes("@media (max-width: 760px)") && css.includes("@media (forced-colors: active)"), "global hardening styles");
  ensure(nav.includes('href: "/hardening"') && nav.includes("Hardening Audit"), "navigation");
  ensure(doc.includes("360px") && doc.includes("44px") && doc.includes("Build 272"), "documentation");
  ensure(pkg.includes("verify-build-271-accessibility-mobile-performance-recovery.ts"), "verifier registered");

  const parsed = JSON.parse(status);
  ensure(parsed.build === 271, "status build");
  ensure(parsed.hardening.screen_reader_route_announcements === true, "screen reader route status");
  ensure(parsed.hardening.mobile_tap_target_px === 44, "mobile target");
  ensure(parsed.hardening.page_weight_new_runtime_dependencies === 0, "no runtime dependency");
  ensure(parsed.connection_state === "DISCONNECTED", "QL-266 disconnected");
  ensure(parsed.new_ql266_test_started === false, "no QL-266 restart");
  ensure(parsed.next_build === 272, "next build");
  ensure(queue.includes("Build 272 — Owner Acceptance, Legacy Cleanup & Production Learning IV"), "queue Build 272");

  console.log("Build 271 Accessibility, Mobile, Performance & Failure-Recovery verification passed.");
}

void main();
