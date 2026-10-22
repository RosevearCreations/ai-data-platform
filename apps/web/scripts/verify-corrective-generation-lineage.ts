import {
  correctiveGenerationLineageFingerprint,
  correctiveGenerationSuccessorFingerprint
} from "../lib/corrective-generation-lineage";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const lineageInput = {
  generationNumber: 2,
  predecessorRegistryFingerprint: "registry-generation-1",
  sourceRecurrenceFingerprint: "next-corrective-generation-recurrence",
  planFingerprint: "following-plan",
  packageFingerprint: "following-package",
  reclosureFingerprint: "following-reclosure",
  terminalRecurrenceFingerprint: "following-recurrence"
};

const first = correctiveGenerationLineageFingerprint(lineageInput);
const second = correctiveGenerationLineageFingerprint(lineageInput);
const changed = correctiveGenerationLineageFingerprint({
  ...lineageInput,
  generationNumber: 3
});

assert(first === second, "Build 109 lineage fingerprint must be deterministic.");
assert(first !== changed, "Build 109 lineage fingerprint must bind generation number.");
assert(
  first.startsWith("corrective-generation-lineage1-"),
  "Build 109 lineage fingerprint must be versioned."
);

const successorInput = {
  generationNumber: 3,
  predecessorRegistryFingerprint: first,
  sourceRecurrenceFingerprint: "following-recurrence",
  sourceRegressionFingerprint: "build-108-regression"
};
const successorOne = correctiveGenerationSuccessorFingerprint(successorInput);
const successorTwo = correctiveGenerationSuccessorFingerprint(successorInput);
const changedSuccessor = correctiveGenerationSuccessorFingerprint({
  ...successorInput,
  sourceRegressionFingerprint: "changed-regression"
});

assert(successorOne === successorTwo, "Build 109 successor fingerprint must be deterministic.");
assert(successorOne !== changedSuccessor, "Build 109 successor fingerprint must bind regression evidence.");
assert(
  successorOne.startsWith("corrective-generation-successor1-"),
  "Build 109 successor fingerprint must be versioned."
);

console.log("Build 109 corrective-generation lineage abstraction verification passed.");
