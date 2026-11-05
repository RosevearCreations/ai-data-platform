import { appendFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const baseRef = process.env.GITHUB_BASE_REF?.trim();
const eventName = process.env.GITHUB_EVENT_NAME ?? "local";
let changed = [];
let legacyRequired = false;
let reason = "current promotion surfaces only";

if (eventName === "schedule") {
  legacyRequired = true;
  reason = "scheduled weekly legacy audit";
} else if (eventName === "workflow_dispatch") {
  legacyRequired = process.env.MANUAL_LEGACY === "true";
  reason = legacyRequired
    ? "manual legacy audit requested"
    : "manual compact promotion gate requested";
} else if (!baseRef) {
  legacyRequired = true;
  reason = "no pull-request base available; fail-safe legacy audit";
} else {
  try {
    changed = execFileSync(
      "git",
      ["diff", "--name-only", "origin/" + baseRef + "...HEAD"],
      { encoding: "utf8" }
    )
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);

    const legacyVerifier = /^apps\/web\/scripts\/verify-build-(\d+)-/;
    const genericVerifier = /^apps\/web\/scripts\/verify-/;
    const currentVerifier = /^apps\/web\/scripts\/verify-build-(28[1-9]|29[0-2])-|^apps\/web\/scripts\/verify-build-292a-|^apps\/web\/scripts\/verify-production-build-migrations\.ts$|^apps\/web\/scripts\/verify-ql(246|253)-/;
    const committedMigration = /^db\/migrations\/(\d{4})_/;

    for (const file of changed) {
      const buildMatch = file.match(legacyVerifier);
      if (buildMatch && Number(buildMatch[1]) <= 280) {
        legacyRequired = true;
        reason = "historical build verifier changed: " + file;
        break;
      }

      const migrationMatch = file.match(committedMigration);
      if (migrationMatch && Number(migrationMatch[1]) <= 95) {
        legacyRequired = true;
        reason = "previously committed migration changed: " + file;
        break;
      }

      if (
        genericVerifier.test(file) &&
        !currentVerifier.test(file) &&
        !file.includes("ci-integration-spine-database")
      ) {
        legacyRequired = true;
        reason = "historical/general verifier changed: " + file;
        break;
      }
    }
  } catch (error) {
    legacyRequired = true;
    reason =
      "impact detection failed closed: " +
      (error instanceof Error ? error.message : String(error));
  }
}

console.log(
  JSON.stringify(
    {
      eventName,
      baseRef: baseRef || null,
      changedFileCount: changed.length,
      legacyRequired,
      reason
    },
    null,
    2
  )
);

if (process.env.GITHUB_OUTPUT) {
  await appendFile(
    process.env.GITHUB_OUTPUT,
    "legacy_required=" + String(legacyRequired) + "\n" +
      "legacy_reason=" + reason.replace(/[\r\n]+/g, " ") + "\n",
    "utf8"
  );
}
