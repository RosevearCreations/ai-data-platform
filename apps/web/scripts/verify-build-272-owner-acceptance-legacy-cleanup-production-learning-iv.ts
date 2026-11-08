import { readFile } from "node:fs/promises";
import path from "node:path";

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error("Build 272 verification failed: " + message);
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

async function main() {
  const [owner, learning, shell, home, data, connectors, delivery, nav, pkg, doc, status, queue] = await Promise.all([
    source("app/owner-acceptance/page.tsx"),
    source("app/production-learning/page.tsx"),
    source("app/application-shell.tsx"),
    source("app/page.tsx"),
    source("app/data-library/page.tsx"),
    source("app/connectors/page.tsx"),
    source("app/integration-delivery/page.tsx"),
    source("lib/application-navigation.ts"),
    source("package.json"),
    source("../../docs/BUILD_272_OWNER_ACCEPTANCE_LEGACY_CLEANUP_PRODUCTION_LEARNING_IV.md"),
    source("../../docs/integration/ql266-ai-data-platform-build272-review.json"),
    source("../../docs/NEXT_BUILDS_254_272.md")
  ]);

  ensure(owner.includes("Owner Acceptance, Legacy Cleanup &amp; Production Learning IV"), "owner acceptance page");
  ensure(owner.includes("buildProductionLearningReview") && owner.includes("buildHardeningAudit"), "evidence-backed owner acceptance");
  ensure(owner.includes('href="/evidence-baseline"') && owner.includes("Historical checkpoint"), "historical owner-acceptance handoff retained");
  ensure(learning.includes("Production Learning IV"), "Production Learning IV label");
  ensure(learning.includes("No speculative Build 273+ queue"), "Production Learning renewal rule");
  ensure(shell.includes("Operations Command") && shell.includes("Marble Standard") && shell.includes("Current evidence"), "canonical shell footer");
  ensure(!shell.includes("legacy verifier marker"), "shell legacy marker cleanup");
  ensure(!shell.includes("Build 259 · Operations Command"), "stale shell build branding removed");

  for (const [label, content] of [["home", home], ["data", data], ["connectors", connectors], ["delivery", delivery]] as const) {
    ensure(!content.includes("legacy verifier marker"), label + " legacy marker cleanup");
  }

  ensure(!nav.includes('href: "/owner-acceptance"'), "historical owner acceptance removed from active navigation");
  ensure(pkg.includes("verify-build-272-owner-acceptance-legacy-cleanup-production-learning-iv.ts"), "verifier registered");

  const parsed = JSON.parse(status);
  ensure(parsed.build === 272, "status build");
  ensure(parsed.owner_acceptance.production_learning_iv === true, "Production Learning IV status");
  ensure(parsed.owner_acceptance.speculative_build_273_plus_queue === false, "no speculative next queue");
  ensure(parsed.legacy_cleanup.shell_build_number_markers_removed === true, "legacy cleanup status");
  ensure(parsed.roadmap.renewal_checkpoint === true && parsed.roadmap.automatic_next_batch === false, "renewal checkpoint");
  ensure(parsed.roadmap.owner_authorized_next_batch === true && parsed.roadmap.next_build_number === 273, "owner-authorized next build");
  ensure(parsed.roadmap.next_batch_range === "273-280", "owner-authorized next batch range");
  ensure(parsed.ql266_status === "UNDER_REVIEW" && parsed.connection_state === "DISCONNECTED", "QL-266 boundary");
  ensure(parsed.new_ql266_test_started === false, "no QL-266 restart");

  ensure(doc.includes("Build 250–259 verifiers remain executable"), "historical verifier preservation");
  ensure(doc.includes("No long speculative Build 273+ queue"), "documentation roadmap rule");
  ensure(queue.includes("Build 272 — Owner Acceptance, Legacy Cleanup & Production Learning IV"), "Build 272 roadmap entry");
  ensure(queue.includes("No long speculative Build 273+ queue"), "roadmap stop rule");

  console.log("Build 272 owner acceptance, legacy cleanup and Production Learning IV verification passed.");
}

void main();
