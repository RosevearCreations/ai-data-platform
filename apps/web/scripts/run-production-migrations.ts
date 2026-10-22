import { spawnSync } from "node:child_process";

import { shouldRunProductionMigrations } from "../lib/production-build-migrations";

if (!shouldRunProductionMigrations()) {
  console.log("Skipping database migrations outside the Vercel production environment.");
  process.exit(0);
}

console.log("Applying committed database migrations before the Vercel production build.");

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(command, ["db:migrate"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit"
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log("Production database migrations completed.");
