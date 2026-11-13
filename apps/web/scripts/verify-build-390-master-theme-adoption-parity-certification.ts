import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  BUILD_390,
  BUILD_390_THEME_VERSION,
  certifyBuild390ThemeAdoption
} from "../lib/master-theme-adoption-certification";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(BUILD_390, 390);
assert.equal(BUILD_390_THEME_VERSION, "rosevear-master-instrument.v1");

const accepted = certifyBuild390ThemeAdoption(
  ["ai-data-platform","rosevear-comms-hub","rosevear-ai-hub","yw","icamp"].map(
    (shellId) => ({
      shellId: shellId as
        | "ai-data-platform"
        | "rosevear-comms-hub"
        | "rosevear-ai-hub"
        | "yw"
        | "icamp",
      themeVersion: BUILD_390_THEME_VERSION,
      navigationAccepted: true,
      instrumentKpisAccepted: true,
      semanticStatusesAccepted: true,
      desktopAccepted: true,
      tabletAccepted: true,
      mobileAccepted: true,
      authorityBoundaryPreserved: true,
      independentlyVerified: true
    })
  )
);
assert.equal(accepted.certificationState, "CERTIFIED");
assert.equal(accepted.masterNavigationAccepted, true);
assert.equal(accepted.visualParityCertified, true);
assert.equal(accepted.acceptedShells.length, 5);

const held = certifyBuild390ThemeAdoption([
  {
    shellId: "yw",
    themeVersion: BUILD_390_THEME_VERSION,
    navigationAccepted: true,
    instrumentKpisAccepted: true,
    semanticStatusesAccepted: true,
    desktopAccepted: true,
    tabletAccepted: true,
    mobileAccepted: false,
    authorityBoundaryPreserved: true,
    independentlyVerified: true
  },
  {
    shellId: "icamp",
    themeVersion: BUILD_390_THEME_VERSION,
    navigationAccepted: true,
    instrumentKpisAccepted: true,
    semanticStatusesAccepted: true,
    desktopAccepted: true,
    tabletAccepted: true,
    mobileAccepted: true,
    authorityBoundaryPreserved: true,
    independentlyVerified: true
  }
]);
assert.equal(held.certificationState, "HOLD");
assert.equal(held.visualParityCertified, false);
assert.ok(held.missingShells.includes("ai-data-platform"));

const appShell = source("app/application-shell.tsx");
for (const token of [
  "masterInstrumentTopnav",
  "Master Suite",
  "MASTER_INSTRUMENT_MODULES",
  "YW / iCamp"
]) assert.ok(appShell.includes(token), "navigation token " + token);

const masterPage = source("app/master-suite/page.tsx");
for (const token of [
  "One Master Console, Three Authority-Preserving Modules",
  "masterFusionGrid",
  "Yard Workers and iCamp oversight",
  "Cross-shell visual contract"
]) assert.ok(masterPage.includes(token), "master suite token " + token);

const migration = source(
  "../../db/migrations/0153_master_theme_adoption_parity_certification.sql"
);
for (const token of [
  "master_build390_theme_adoption_receipts",
  "master_build390_navigation_acceptance_audits",
  "master_build390_yw_icamp_visual_parity_certifications",
  "rosevear-master-instrument.v1",
  "CERTIFIED",
  "force row level security",
  "ai_data_protected_runtime",
  "revoke update,delete"
]) assert.ok(migration.includes(token), "migration token " + token);

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build390_theme_adoption_receipts"',
  '"master_build390_navigation_acceptance_audits"',
  '"master_build390_yw_icamp_visual_parity_certifications"',
  '"0153_master_theme_adoption_parity_certification.sql"'
]) assert.ok(spine.includes(token), "spine token " + token);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-390-master-theme-adoption-parity-certification.ts";
assert.equal(String(pkg.scripts["verify:build390"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

console.log(
  "Build 390 Cross-Shell Theme Adoption Receipts, Master Navigation Acceptance & YW/iCamp Visual-Parity Certification verification passed."
);
