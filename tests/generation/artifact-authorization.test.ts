import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import * as artifactAuthorizationModule from "../../packages/generation/src/artifact-authorization.ts";

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
  const matrixPartial = [
    ...gate.matchAll(/^\| `([^`,]+)` \| `IMPLEMENTATION_PARTIAL` \|/gm),
  ].map((match) => match[1]);
  assert.deepEqual(matrixPartial, artifacts);
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

test("underspecified versions and their composite dependents remain PARTIAL", () => {
  for (const artifact of [
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
  ]) {
    const authorization = authorizationFor(artifact);
    assert.equal(authorization.status, "IMPLEMENTATION_PARTIAL");
    assert.equal(authorization.source, "TELEMETRY_IMPLEMENTATION_GATE_V1.md");
    assert.throws(() => assertGenerationAuthorized(artifact), ArtifactGenerationBlocked);
  }
});

test("registry enumeration exhaustively exposes telemetry gate provenance without mutation leaks", () => {
  assert.equal(
    typeof artifactAuthorizationModule.registeredArtifactAuthorizations,
    "function",
  );
  const enumerate = artifactAuthorizationModule.registeredArtifactAuthorizations as
    | undefined
    | (() => readonly Readonly<{
        artifact: string;
        status: string;
        source: string;
      }>[]);
  assert.ok(enumerate);

  const entries = enumerate();
  const telemetryEntries = entries.filter(
    (entry) => entry.source === "TELEMETRY_IMPLEMENTATION_GATE_V1.md",
  );
  const expected = [
    ...telemetryAuthorizedArtifacts.map((artifact) => ({
      artifact,
      status: "IMPLEMENTATION_READY",
      source: "TELEMETRY_IMPLEMENTATION_GATE_V1.md",
    })),
    ...telemetryPartialArtifacts.map((artifact) => ({
      artifact,
      status: "IMPLEMENTATION_PARTIAL",
      source: "TELEMETRY_IMPLEMENTATION_GATE_V1.md",
    })),
  ];

  assert.deepEqual(telemetryEntries, expected);
  assert.deepEqual(
    telemetryEntries.filter((entry) => entry.status === "IMPLEMENTATION_READY").map(({ artifact }) => artifact),
    [...telemetryAuthorizedArtifacts],
  );
  assert.equal(Object.isFrozen(entries), true);
  assert.equal(entries.every(Object.isFrozen), true);

  const first = entries[0];
  assert.ok(first);
  assert.throws(() => {
    (entries as unknown as Array<typeof first>).push(first);
  }, TypeError);
  assert.throws(() => {
    (first as { status: string }).status = "IMPLEMENTATION_READY";
  }, TypeError);
  assert.notStrictEqual(enumerate(), entries);
  assert.notStrictEqual(enumerate()[0], first);
  assert.deepEqual(authorizationFor(first.artifact), first);
});

test("READY telemetry values do not authorize excluded mechanisms or PARTIAL composites", () => {
  const dependencies = new Map([
    ["TelemetryBucketId", ["TelemetryBucket", "TelemetryAdapter", "TelemetryIngestionService"]],
    ["TelemetryEventId", ["TelemetryBucketAccepted", "TelemetryRepository", "TelemetryTopic"]],
    ["AudienceProjectionId", ["AudienceProjection", "AudienceProjectionApplier"]],
    ["TelemetryCapabilityStatus", ["TelemetryBroker", "TelemetryApi"]],
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
