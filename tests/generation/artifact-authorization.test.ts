import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ArtifactGenerationBlocked,
  assertGenerationAuthorized,
  authorizationFor,
  telemetryAuthorizedArtifacts,
  telemetryPartialArtifacts,
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

test("only the exact mechanically certified telemetry artifacts are authorized", () => {
  const gate = readFileSync(
    new URL("../../docs/specification/TELEMETRY_IMPLEMENTATION_GATE_V1.md", import.meta.url),
    "utf8",
  );
  const artifacts = JSON.parse(
    gate.match(/^READY_MANIFEST: (\[[^\n]+\])$/m)?.[1] ?? "null",
  );
  assert.deepEqual(telemetryAuthorizedArtifacts, artifacts);
  assert.equal(new Set(artifacts).size, artifacts.length);

  const matrixReady = [...gate.matchAll(/^\| `([^`,]+)` \| `IMPLEMENTATION_READY` \|/gm)].map(
    (match) => match[1],
  );
  assert.deepEqual(matrixReady, artifacts);

  for (const artifact of artifacts) {
    assert.deepEqual(authorizationFor(artifact), {
      artifact,
      status: "IMPLEMENTATION_READY",
      source: "TELEMETRY_IMPLEMENTATION_GATE_V1.md",
    });
    assert.doesNotThrow(() => assertGenerationAuthorized(artifact));
  }
});

test("every named PARTIAL telemetry artifact is explicitly rejected with gate provenance", () => {
  const gate = readFileSync(
    new URL("../../docs/specification/TELEMETRY_IMPLEMENTATION_GATE_V1.md", import.meta.url),
    "utf8",
  );
  const artifacts = JSON.parse(
    gate.match(/^PARTIAL_MANIFEST: (\[[^\n]+\])$/m)?.[1] ?? "null",
  );
  assert.deepEqual(telemetryPartialArtifacts, artifacts);
  assert.equal(new Set(artifacts).size, artifacts.length);
  assert.equal(
    artifacts.some((artifact: string) => telemetryAuthorizedArtifacts.includes(artifact as never)),
    false,
  );

  for (const artifact of artifacts) {
    assert.deepEqual(authorizationFor(artifact), {
      artifact,
      status: "IMPLEMENTATION_PARTIAL",
      source: "TELEMETRY_IMPLEMENTATION_GATE_V1.md",
    });
  }
});

test("telemetry infrastructure remains absent and denied by default", () => {
  for (const artifact of [
    "TelemetryAdapter",
    "TelemetryIngestionService",
    "TelemetryRepository",
    "TelemetryTopic",
    "TelemetryBroker",
    "TelemetryApi",
  ]) {
    assert.deepEqual(authorizationFor(artifact), {
      artifact,
      status: "IMPLEMENTATION_BLOCKED_ARCHITECTURE",
      source: "CGS-A-1 deny-by-default",
    });
  }
});

test("READY telemetry composites do not authorize their excluded mechanisms", () => {
  const dependencies = new Map([
    ["TelemetryBucket", ["TelemetryAdapter", "TelemetryIngestionService"]],
    ["TelemetryBucketAccepted", ["TelemetryRepository", "TelemetryTopic"]],
    ["TelemetryBucketRejected", ["TelemetryBroker", "TelemetryApi"]],
    ["AudienceProjection", ["AudienceProjectionApplier", "AudienceProjectionProduced"]],
  ]);
  for (const [artifact, excluded] of dependencies) {
    assert.doesNotThrow(() => assertGenerationAuthorized(artifact));
    for (const dependency of excluded) {
      assert.throws(() => assertGenerationAuthorized(dependency), ArtifactGenerationBlocked);
    }
  }
});

test("READY label cannot bypass a blocked mandatory dependency", () => {
  assert.deepEqual(authorizationFor("ResponsibilityDecision"), {
    artifact: "ResponsibilityDecision",
    status: "BLOCKED_BY_PARTIAL_DEPENDENCY",
    source: "GOVERNANCE_IMPLEMENTATION_GATE_V1.md §10",
  });
});
