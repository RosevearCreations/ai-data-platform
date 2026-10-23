import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { deriveCorrectiveGenerationMachinePhase } from "../lib/corrective-generation-state-machine";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const phases = [
  [{}, "successor-ready"],
  [{ retriageStatus: "open" }, "retriage-open"],
  [{ retriageStatus: "dismissed" }, "retriage-dismissed"],
  [{ retriageStatus: "planned", planStatus: "proposed" }, "plan-proposed"],
  [{ retriageStatus: "approved", planStatus: "approved" }, "plan-approved"],
  [{ planStatus: "approved", activationStatus: "active" }, "activation-active"],
  [{ planStatus: "approved", activationStatus: "revoked" }, "activation-revoked"],
  [{ deliveryStatus: "reserved" }, "delivery-reserved"],
  [{ deliveryStatus: "transport-error" }, "delivery-transport-error"],
  [{ deliveryStatus: "rejected" }, "delivery-rejected"],
  [{ deliveryStatus: "accepted" }, "delivery-accepted"],
  [{ deliveryStatus: "accepted", reconciliationStatus: "transport-error" }, "reconciliation-error"],
  [{ deliveryStatus: "accepted", reconciliationStatus: "drift" }, "reconciliation-drift"],
  [{ deliveryStatus: "accepted", reconciliationStatus: "matched" }, "verified-awaiting-reclosure"],
  [{ hasReclosure: true }, "reclosed-awaiting-monitor"],
  [{ hasReclosure: true, regressionStatus: "stable" }, "reclosed-stable"],
  [{ hasReclosure: true, regressionStatus: "recurred" }, "recurrence-pending-governance"],
  [{ hasReclosure: true, regressionStatus: "recurred", hasRecurrence: true }, "recurred"]
] as const;

for (const [input, expected] of phases) {
  assert(
    deriveCorrectiveGenerationMachinePhase(input) === expected,
    "Build 115 phase derivation failed for " + expected
  );
}

const migrationPath = fileURLToPath(
  new URL("../../../db/migrations/0085_corrective_generation_state_machine_invariants.sql", import.meta.url)
);
const servicePath = fileURLToPath(
  new URL("../lib/corrective-generation-state-machine.ts", import.meta.url)
);
const planningPath = fileURLToPath(
  new URL("../lib/unified-corrective-generation-planning.ts", import.meta.url)
);

const migration = readFileSync(migrationPath, "utf8");
const service = readFileSync(servicePath, "utf8");
const planning = readFileSync(planningPath, "utf8");

for (const required of [
  "cg115_effective_terminal_recurrence",
  "cg115_require_registry_invariants",
  "cg115_require_successor_invariants",
  "cg115_require_retriage_transition",
  "cg115_require_plan_transition",
  "cg115_require_activation_transition",
  "cg115_require_delivery_transition",
  "cg115_require_reclosure_invariants",
  "workspace_cg115_registry_invariant_guard",
  "workspace_cg115_successor_invariant_guard",
  "workspace_cg115_retriage_transition_guard",
  "workspace_cg115_plan_transition_guard",
  "workspace_cg115_activation_transition_guard",
  "workspace_cg115_delivery_transition_guard",
  "workspace_cg115_reclosure_invariant_guard"
]) {
  assert(migration.includes(required), "Build 115 migration missing " + required + ".");
}

for (const required of [
  "registry-predecessor-continuity",
  "successor-predecessor-continuity",
  "successor-terminal-recurrence-identity",
  "plan-generation-identity",
  "activation-generation-identity",
  "delivery-generation-identity",
  "reclosure-generation-identity",
  "recurred-generation-missing-successor",
  "latest-case-state"
]) {
  assert(service.includes(required), "Build 115 invariant read model missing " + required + ".");
}

assert(
  planning.includes("Build 115 state-machine withdrawal caused by re-triage reset."),
  "Build 115 must withdraw a proposed plan before resetting a planned re-triage."
);

assert(
  migration.includes("revoke insert,update,delete on app.workspace_corrective_generation_registry") &&
    migration.includes("revoke insert,update,delete on app.workspace_corrective_generation_successors"),
  "Build 115 must preserve the direct-runtime immutable lineage boundary."
);

console.log("Build 115 corrective-generation state machine verification passed.");
