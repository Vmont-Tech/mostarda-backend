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

test("only the exact mechanically certified telemetry artifacts are authorized", () => {
  const artifacts = [
    "TelemetryBucketId",
    "AudienceProjectionId",
    "TelemetryEventId",
    "TelemetryCapabilityStatus",
    "TelemetrySchemaVersion",
    "CollectorVersion",
    "CapabilityVersion",
    "CollectionPolicyVersion",
    "AudienceProjectionVersion",
    "AudienceProjectionPolicyVersion",
    "TelemetryBucket",
    "TelemetryBucketAccepted",
    "TelemetryBucketRejected",
    "AudienceProjection",
    "AudienceProjectionApplier",
    "AudienceProjectionProduced",
    "AudienceProjectionExpired",
    "AudienceProjectionInvalidated",
  ];

  for (const artifact of artifacts) {
    assert.deepEqual(authorizationFor(artifact), {
      artifact,
      status: "IMPLEMENTATION_READY",
      source: "TELEMETRY_IMPLEMENTATION_GATE_V1.md",
    });
    assert.doesNotThrow(() => assertGenerationAuthorized(artifact));
  }
});

test("telemetry infrastructure and uncertified events remain denied", () => {
  for (const artifact of [
    "TelemetryAdapter",
    "TelemetryIngestionService",
    "TelemetryRepository",
    "TelemetryTopic",
    "TelemetryBroker",
    "TelemetryCaptured",
  ]) {
    assert.equal(
      authorizationFor(artifact).status,
      "IMPLEMENTATION_BLOCKED_ARCHITECTURE",
    );
  }
});

test("a READY telemetry artifact cannot authorize an absent dependency by association", () => {
  assert.doesNotThrow(() => assertGenerationAuthorized("TelemetryBucket"));
  assert.throws(
    () => assertGenerationAuthorized("TelemetryRepository"),
    (error) =>
      error instanceof ArtifactGenerationBlocked &&
      error.status === "IMPLEMENTATION_BLOCKED_ARCHITECTURE",
  );
});

test("READY label cannot bypass a blocked mandatory dependency", () => {
  assert.deepEqual(authorizationFor("ResponsibilityDecision"), {
    artifact: "ResponsibilityDecision",
    status: "BLOCKED_BY_PARTIAL_DEPENDENCY",
    source: "GOVERNANCE_IMPLEMENTATION_GATE_V1.md §10",
  });
});
