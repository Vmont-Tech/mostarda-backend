import assert from "node:assert/strict";
import test from "node:test";

import {
  ArtifactGenerationBlocked,
  assertGenerationAuthorized,
  authorizationFor,
} from "../../packages/generation/src/index.ts";

test("only explicitly READY artifacts pass the generation gate", () => {
  for (const artifact of [
    "ResponsibleParty",
    "ResponsibilityCategory",
    "Severity",
    "Confidence",
    "GovernanceCaseStateMachine",
  ]) {
    assert.doesNotThrow(() => assertGenerationAuthorized(artifact));
  }
});

test("PARTIAL artifact is rejected with its objective source", () => {
  assert.throws(
    () => assertGenerationAuthorized("GovernanceCase"),
    (error) =>
      error instanceof ArtifactGenerationBlocked &&
      error.status === "IMPLEMENTATION_PARTIAL" &&
      error.source === "IMPLEMENTATION_READINESS_REVIEW_V2.md",
  );
});

test("artifact absent from the matrix is denied by default", () => {
  assert.deepEqual(authorizationFor("InventedAggregate"), {
    artifact: "InventedAggregate",
    status: "IMPLEMENTATION_BLOCKED_ARCHITECTURE",
    source: "CGS-A-1 deny-by-default",
  });
});

test("READY label cannot bypass a blocked mandatory dependency", () => {
  assert.deepEqual(authorizationFor("ResponsibilityDecision"), {
    artifact: "ResponsibilityDecision",
    status: "BLOCKED_BY_PARTIAL_DEPENDENCY",
    source: "GOVERNANCE_IMPLEMENTATION_GATE_V1.md §10",
  });
});
