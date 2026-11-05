import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const suite = process.argv[2];
if (!["promotion", "legacy"].includes(suite)) {
  console.error("Usage: node ci-suite-runner.mjs <promotion|legacy>");
  process.exit(2);
}

const suites = {
  promotion: [
    ["pnpm", ["typecheck"], "workspace typecheck"],
    ["pnpm", ["lint"], "workspace lint"],
    ["pnpm", ["--filter", "@rosevear/ai-data-connector-sdk", "build"], "connector SDK build + tests"],
    ["pnpm", ["--filter", "@rosevear/ai-data-web", "ci:spine"], "current integration spine"],
    ["pnpm", ["--filter", "@rosevear/ai-data-web", "exec", "node", "--import", "tsx", "scripts/verify-ql337-comms-broker.ts"], "QL-337 Comms broker contract and no-delivery gate"],
    ["pnpm", ["--filter", "@rosevear/ai-data-web", "ci:db-core"], "core database + integration schema"],
    ["pnpm", ["--filter", "@rosevear/ai-data-web", "build"], "production-equivalent web build"]
  ],
  legacy: [
    ["pnpm", ["--filter", "@rosevear/ai-data-web", "test"], "historical application verifier audit"],
    ["pnpm", ["--filter", "@rosevear/ai-data-web", "db:verify"], "historical database verifier audit"]
  ]
};

const started = Date.now();
const results = [];

for (const [command, args, label] of suites[suite]) {
  const commandStarted = Date.now();
  console.log("\n[ci-suite] " + label);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32"
  });
  const durationMs = Date.now() - commandStarted;
  const exitCode = result.status ?? 1;
  results.push({ label, command: [command, ...args].join(" "), durationMs, exitCode });
  if (exitCode !== 0) {
    await persist(false);
    process.exit(exitCode);
  }
}

await persist(true);

async function persist(passed) {
  const durationMs = Date.now() - started;
  const metrics = {
    schema: "rosevear.ai-data-platform.ci-suite.v1",
    suite,
    passed,
    durationMs,
    commandCount: results.length,
    recordedAt: new Date().toISOString(),
    results
  };

  const directory = path.resolve(process.cwd(), ".ci-metrics");
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, suite + ".json"),
    JSON.stringify(metrics, null, 2) + "\n",
    "utf8"
  );

  console.log(
    "\n[ci-suite] " +
      suite +
      " " +
      (passed ? "PASSED" : "FAILED") +
      " in " +
      Math.round(durationMs / 1000) +
      "s across " +
      results.length +
      " grouped commands."
  );

  if (process.env.GITHUB_STEP_SUMMARY) {
    const rows = results
      .map(
        (entry) =>
          "| " +
          entry.label +
          " | " +
          Math.round(entry.durationMs / 1000) +
          "s | " +
          (entry.exitCode === 0 ? "PASS" : "FAIL") +
          " |"
      )
      .join("\n");
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      [
        "## CI suite: " + suite,
        "",
        "- Result: **" + (passed ? "PASS" : "FAIL") + "**",
        "- Grouped commands: **" + results.length + "**",
        "- Duration: **" + Math.round(durationMs / 1000) + "s**",
        "",
        "| Group | Duration | Result |",
        "| --- | ---: | --- |",
        rows,
        ""
      ].join("\n"),
      "utf8"
    );
  }
}
