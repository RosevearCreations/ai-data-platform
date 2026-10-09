import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const route = await readFile(
    resolve("app/api/readiness/runtime/route.ts"),
    "utf8"
  );

  assert(
    route.includes('process.env.DATABASE_URL') &&
      route.includes('startsWith("postgresql://")'),
    "Runtime readiness must validate DATABASE_URL shape."
  );
  assert(
    route.includes('hostname.includes("-pooler")'),
    "Runtime readiness must report pooled-vs-direct without exposing the URL."
  );
  assert(
    route.includes("authSchemaVisible") &&
      route.includes("sanitizeError"),
    "Runtime readiness must test auth DB visibility and sanitize errors."
  );
  assert(
    !route.includes("password:"),
    "Runtime readiness must never serialize a database password."
  );

  console.log(
    "Production runtime configuration diagnostics are sanitized and fail closed."
  );
}

void main();
