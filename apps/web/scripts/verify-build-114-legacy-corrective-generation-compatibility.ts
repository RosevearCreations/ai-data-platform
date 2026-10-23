import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { classifyLegacyCorrectiveGenerationCompatibility } from "../lib/legacy-corrective-generation-compatibility";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const base = {
  hasRegistry: true,
  registryMatches: true,
  hasTerminalRecurrence: false,
  registeredState: "reclosed" as const,
  hasTerminalEvent: false,
  terminalEventMatches: true,
  successorRequired: false,
  hasSuccessor: false,
  successorMatches: true
};

assert(
  classifyLegacyCorrectiveGenerationCompatibility({
    ...base,
    hasRegistry: false
  }) === "missing-lineage",
  "Build 114 must identify completed legacy evidence missing from the lineage registry."
);

assert(
  classifyLegacyCorrectiveGenerationCompatibility({
    ...base,
    registryMatches: false
  }) === "conflict",
  "Build 114 must fail closed when registered lineage disagrees with legacy evidence."
);

assert(
  classifyLegacyCorrectiveGenerationCompatibility({
    ...base,
    hasTerminalRecurrence: true,
    registeredState: "reclosed",
    terminalEventMatches: false
  }) === "late-recurrence-unbridged",
  "Build 114 must identify late recurrence that cannot mutate the immutable registry row."
);

assert(
  classifyLegacyCorrectiveGenerationCompatibility({
    ...base,
    hasTerminalRecurrence: true,
    registeredState: "reclosed",
    hasTerminalEvent: true,
    terminalEventMatches: true,
    successorRequired: true,
    hasSuccessor: false,
    successorMatches: false
  }) === "missing-successor",
  "Build 114 must identify a missing G3 successor after a bridged legacy-following recurrence."
);

assert(
  classifyLegacyCorrectiveGenerationCompatibility({
    ...base,
    hasTerminalRecurrence: true,
    registeredState: "reclosed",
    hasTerminalEvent: true,
    terminalEventMatches: false
  }) === "conflict",
  "Build 114 must fail closed when terminal bridge evidence conflicts."
);

assert(
  classifyLegacyCorrectiveGenerationCompatibility({
    ...base,
    hasTerminalRecurrence: true,
    registeredState: "recurred",
    successorRequired: true,
    hasSuccessor: true,
    successorMatches: false
  }) === "conflict",
  "Build 114 must fail closed when an existing successor disagrees with the legacy recurrence."
);

assert(
  classifyLegacyCorrectiveGenerationCompatibility({
    ...base,
    hasTerminalRecurrence: true,
    registeredState: "reclosed",
    hasTerminalEvent: true,
    terminalEventMatches: true,
    successorRequired: true,
    hasSuccessor: true,
    successorMatches: true
  }) === "compatible",
  "Build 114 must recognize a fully bridged legacy lineage as compatible."
);

const servicePath = fileURLToPath(
  new URL("../lib/legacy-corrective-generation-compatibility.ts", import.meta.url)
);
const planningPath = fileURLToPath(
  new URL("../lib/unified-corrective-generation-planning.ts", import.meta.url)
);
const service = readFileSync(servicePath, "utf8");
const planning = readFileSync(planningPath, "utf8");

for (const required of [
  "workspace_next_corrective_generation_plans",
  "workspace_following_corrective_generation_plans",
  "workspace_cg_legacy_terminal_events",
  "workspace_corrective_generation_registry",
  "workspace_corrective_generation_successors",
  "bridge_legacy_corrective_generation_lineage"
]) {
  assert(service.includes(required), "Build 114 compatibility service missing " + required + ".");
}

assert(
  planning.includes("workspace_cg_legacy_terminal_events") &&
    planning.includes("le.terminal_recurrence_id=s.source_recurrence_id") &&
    planning.includes("le.terminal_recurrence_fingerprint=s.source_recurrence_fingerprint") &&
    planning.includes("le.terminal_regression_fingerprint=s.source_regression_fingerprint"),
  "Build 114 unified planning must bind the exact append-only legacy terminal event."
);

console.log("Build 114 legacy corrective-generation compatibility verification passed.");
