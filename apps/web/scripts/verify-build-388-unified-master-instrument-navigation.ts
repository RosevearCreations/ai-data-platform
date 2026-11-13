import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  BUILD_388,
  MASTER_INSTRUMENT_MODULES,
  MASTER_INSTRUMENT_THEME_VERSION,
  evaluateMasterThemeGovernance,
  isMasterInstrumentPath
} from "../lib/master-instrument-navigation";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(BUILD_388, 388);
assert.equal(MASTER_INSTRUMENT_THEME_VERSION, "rosevear-master-instrument.v1");
assert.deepEqual(
  MASTER_INSTRUMENT_MODULES.map((item) => item.id),
  ["ai-data-platform", "rosevear-comms-hub", "rosevear-ai-hub"]
);
assert.equal(isMasterInstrumentPath("/master-suite"), true);
assert.equal(isMasterInstrumentPath("/comms-complementary-plane"), true);
assert.equal(isMasterInstrumentPath("/source-shell-onboarding"), true);
assert.equal(isMasterInstrumentPath("/data-library"), false);

const compliant = evaluateMasterThemeGovernance([
  {
    shellId: "ai-data-platform",
    themeVersion: MASTER_INSTRUMENT_THEME_VERSION,
    persistentNavigation: true,
    moduleRail: true,
    instrumentKpis: true,
    responsiveDesktop: true,
    responsiveTablet: true,
    responsiveMobile: true,
    semanticStatusColors: true,
    authorityBoundariesPreserved: true
  },
  {
    shellId: "yw",
    themeVersion: MASTER_INSTRUMENT_THEME_VERSION,
    persistentNavigation: true,
    moduleRail: true,
    instrumentKpis: true,
    responsiveDesktop: true,
    responsiveTablet: true,
    responsiveMobile: true,
    semanticStatusColors: true,
    authorityBoundariesPreserved: true
  }
]);
assert.equal(compliant.allCompliant, true);
assert.equal(compliant.compliantShells, 2);

const held = evaluateMasterThemeGovernance([
  {
    shellId: "icamp",
    themeVersion: MASTER_INSTRUMENT_THEME_VERSION,
    persistentNavigation: true,
    moduleRail: true,
    instrumentKpis: true,
    responsiveDesktop: true,
    responsiveTablet: true,
    responsiveMobile: false,
    semanticStatusColors: true,
    authorityBoundariesPreserved: true
  }
]);
assert.equal(held.allCompliant, false);
assert.deepEqual(held.nonCompliantShellIds, ["icamp"]);

const appShell = source("app/application-shell.tsx");
for (const token of [
  "masterInstrumentActive",
  "masterInstrumentTopnav",
  "MASTER_INSTRUMENT_MODULES",
  "Master Suite",
  "YW / iCamp"
]) {
  assert.ok(appShell.includes(token), "application shell token " + token);
}

const page = source("app/master-suite/page.tsx");
for (const token of [
  "One Master Console, Three Authority-Preserving Modules",
  "MASTER_INSTRUMENT_MODULES",
  "MASTER_INSTRUMENT_CHILD_SHELLS",
  "masterFusionGrid",
  "Fusion is navigation, not authority transfer."
]) {
  assert.ok(page.includes(token), "Master Suite page token " + token);
}

const css = source("app/master-instrument-shell.css");
for (const token of [
  ".masterInstrumentTopnav",
  ".masterFusionGrid",
  ".masterAuthorityBoundary",
  ".masterChildShellGrid",
  ".masterGovernanceGrid",
  "@media (max-width: 680px)"
]) {
  assert.ok(css.includes(token), "Master instrument CSS token " + token);
}

const navigation = source("lib/application-navigation.ts");
assert.ok(navigation.includes('href: "/master-suite"'));
assert.ok(navigation.includes('label: "Unified Master Suite"'));

const migration = source("../../db/migrations/0152_master_instrument_theme_governance.sql");
for (const token of [
  "master_build388_theme_governance_audits",
  "master_build388_module_fusion_audits",
  "rosevear-master-instrument.v1",
  "authority_boundaries_preserved",
  "force row level security",
  "ai_data_protected_runtime",
  "revoke update,delete"
]) {
  assert.ok(migration.includes(token), "migration token " + token);
}

const docs = source("../../docs/BUILD_388_UNIFIED_MASTER_INSTRUMENT_NAVIGATION.md");
for (const token of [
  "AI Data Platform remains the Master intelligence/evidence/analytics plane.",
  "Rosevear Comms Hub remains the communications and operator-control plane.",
  "Rosevear AI Hub remains the independently authenticated local runtime/support host.",
  "Yard Workers and iCamp remain product-shell identities",
  "Visual GREEN cannot substitute for runtime evidence or source acceptance."
]) {
  assert.ok(docs.includes(token), "documentation token " + token);
}

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build388_theme_governance_audits"',
  '"master_build388_module_fusion_audits"',
  '"0152_master_instrument_theme_governance.sql"'
]) {
  assert.ok(spine.includes(token), "spine token " + token);
}

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-388-unified-master-instrument-navigation.ts";
assert.equal(String(pkg.scripts["verify:build388"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

console.log(
  "Build 388 Unified Master Instrument Navigation, Master Module Fusion Layout & Cross-Shell Theme Governance verification passed."
);
