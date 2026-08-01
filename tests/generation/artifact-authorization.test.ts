import assert from "node:assert/strict";
import test from "node:test";

import {
  ArtifactGenerationBlocked,
  assertGenerationAuthorized,
  authorizationFor,
  telemetryAuthorizedArtifacts,
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
  ];

  assert.deepEqual(telemetryAuthorizedArtifacts, artifacts);

  for (const artifact of artifacts) {
    assert.deepEqual(authorizationFor(artifact), {
      artifact,
      status: "IMPLEMENTATION_READY",
      source: "TELEMETRY_IMPLEMENTATION_GATE_V1.md",
    });
    assert.doesNotThrow(() => assertGenerationAuthorized(artifact));
  }
});

test("every named PARTIAL telemetry artifact and infrastructure artifact remains denied", () => {
  for (const artifact of [
    "TelemetryAdapter",
    "TelemetryIngestionService",
    "TelemetryRepository",
    "TelemetryTopic",
    "TelemetryBroker",
    "TelemetryCaptured",
    "TelemetryBucketClosed",
    "EdgeTelemetryCapabilityChanged",
    "EdgeTelemetryIncidentReported",
    "TelemetryValidationIncidentReported",
    "TelemetryCapabilityChanged",
    "TelemetryIncidentReported",
    "CapabilityDeclared",
    "CapabilityValidated",
    "CapabilityRejected",
    "CapabilityActivated",
    "CapabilityDegraded",
    "CapabilitySuspended",
    "CapabilityRecovered",
    "CapabilityRetired",
    "AudienceProjectionApplier",
    "AudienceProjectionProduced",
    "AudienceProjectionExpired",
    "AudienceProjectionInvalidated",
    "TelemetryApi",
  ]) {
    assert.equal(
      authorizationFor(artifact).status,
      "IMPLEMENTATION_BLOCKED_ARCHITECTURE",
    );
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
