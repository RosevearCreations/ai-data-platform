import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";

import {
  MODULE_HOST_ADAPTER_KINDS,
  generateModuleHostScaffold,
  type ModuleHostAdapterKind
} from "../lib/module-host-adapter-pack";
import type { HostEnvironment } from "../lib/universal-module-contract";

const environments = new Set<HostEnvironment>([
  "development",
  "test",
  "staging",
  "production"
]);

function usage() {
  return [
    "Usage:",
    "  pnpm tsx scripts/generate-module-host-scaffold.ts",
    "    --adapter react|nextjs|vite|vanilla|electron",
    "    --app-id example.host",
    "    --environment development|test|staging|production",
    "    --surface data-library|app-connections|integration-health|integration-certification|production-learning",
    "    --out ./generated-host",
    "",
    "The generator accepts no credential, password, cookie, token, API key or secret arguments."
  ].join("\n");
}

function parseArgs(argv: string[]) {
  const allowed = new Set([
    "--adapter",
    "--app-id",
    "--environment",
    "--surface",
    "--out"
  ]);

  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];

    if (!key || !allowed.has(key) || !value || value.startsWith("--")) {
      throw new Error(usage());
    }
    if (values.has(key)) {
      throw new Error("Duplicate generator argument: " + key);
    }
    values.set(key, value);
  }

  const adapter = values.get("--adapter") as ModuleHostAdapterKind | undefined;
  const hostApplicationId = values.get("--app-id");
  const environment = values.get("--environment") as HostEnvironment | undefined;
  const defaultSurface = values.get("--surface");
  const out = values.get("--out");

  if (
    !adapter ||
    !MODULE_HOST_ADAPTER_KINDS.includes(adapter) ||
    !hostApplicationId ||
    !environment ||
    !environments.has(environment) ||
    !defaultSurface ||
    !out
  ) {
    throw new Error(usage());
  }

  return {
    adapter,
    hostApplicationId,
    environment,
    defaultSurface,
    out
  };
}

async function main() {
  const input = parseArgs(process.argv.slice(2));
  const scaffold = generateModuleHostScaffold({
    adapter: input.adapter,
    hostApplicationId: input.hostApplicationId,
    environment: input.environment,
    defaultSurface: input.defaultSurface
  });

  const root = path.resolve(process.cwd(), input.out);
  if (root === path.parse(root).root) {
    throw new Error("Refusing to generate a scaffold at the filesystem root.");
  }

  try {
    await access(root);
    throw new Error(
      "Output directory already exists. Choose a new empty destination."
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "Output directory already exists. Choose a new empty destination."
    ) {
      throw error;
    }
  }

  for (const file of scaffold.files) {
    const destination = path.join(root, file.path);
    const relative = path.relative(root, destination);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error("Generated scaffold path escaped the output directory.");
    }

    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, file.content, {
      encoding: "utf8",
      flag: "wx"
    });
  }

  console.log(
    "Generated " +
      scaffold.adapter.displayName +
      " AI Data Platform host scaffold at " +
      root +
      ". No credentials were generated or embedded."
  );
}

void main();
