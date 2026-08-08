import assert from "node:assert/strict";
import test from "node:test";

import {
  createAudienceProjectionPolicyVersion,
  createAudienceProjectionVersion,
  createCapabilityVersion,
  createCollectionPolicyVersion,
  createCollectorVersion,
  createTelemetrySchemaVersion,
  type AudienceProjectionPolicyVersion,
  type AudienceProjectionVersion,
  type CapabilityVersion,
  type CollectionPolicyVersion,
  type CollectorVersion,
  type TelemetrySchemaVersion,
} from "../../packages/telemetry/src/index.ts";
import * as telemetry from "../../packages/telemetry/src/index.ts";

// @ts-expect-error CompatibilityMatrix remains unauthorized and absent.
type ForbiddenCompatibilityMatrix = import("../../packages/telemetry/src/index.ts").CompatibilityMatrix;
// @ts-expect-error CompatibilityEvaluator remains unauthorized and absent.
type ForbiddenCompatibilityEvaluator = import("../../packages/telemetry/src/index.ts").CompatibilityEvaluator;
// @ts-expect-error CompatibilityDecision remains unauthorized and absent.
type ForbiddenCompatibilityDecision = import("../../packages/telemetry/src/index.ts").CompatibilityDecision;
// @ts-expect-error CompatibilityEvaluationResult remains unauthorized and absent.
type ForbiddenCompatibilityEvaluationResult = import("../../packages/telemetry/src/index.ts").CompatibilityEvaluationResult;
// @ts-expect-error CompatibilityEvaluationCause remains unauthorized and absent.
type ForbiddenCompatibilityEvaluationCause = import("../../packages/telemetry/src/index.ts").CompatibilityEvaluationCause;

const constructors = [
  createTelemetrySchemaVersion,
  createCollectorVersion,
  createCapabilityVersion,
  createCollectionPolicyVersion,
  createAudienceProjectionVersion,
  createAudienceProjectionPolicyVersion,
] as const;

const validFixtures = [
  "v2",
  "V2",
  "POL-REV-17",
  "2026.08.01",
  "550e8400-e29b-41d4-a716-446655440000",
  "1.4.0-beta+17",
] as const;

const invalidFixtures = [" v2 ", "@v2", "v2\n", ""] as const;

test("all six versions preserve every canonical OPAQUE_TOKEN_V1 fixture exactly", () => {
  for (const create of constructors) {
    for (const fixture of validFixtures) assert.equal(create(fixture), fixture);
  }
});

test("OPAQUE_TOKEN_V1 comparison remains binary exact and case-sensitive", () => {
  const lower = createTelemetrySchemaVersion("v2");
  const upper = createTelemetrySchemaVersion("V2");

  assert.notEqual(lower, upper);
  assert.equal(lower, "v2");
  assert.equal(upper, "V2");
});

test("all six versions reject exactly the canonical invalid fixtures with the normative code", () => {
  for (const create of constructors) {
    for (const fixture of invalidFixtures) {
      assert.throws(
        () => create(fixture),
        (error) =>
          error instanceof TypeError &&
          "code" in error &&
          error.code === "INVALID_VERSION_IDENTITY_REPRESENTATION",
      );
    }
  }
});

test("OPAQUE_TOKEN_V1 rejects non-ASCII, invisible, padded and partially matching values without normalization", () => {
  for (const fixture of ["versão2", "v2\r", "v2\t", "v2/next", "-v2", " v2", "v2 "]) {
    assert.throws(
      () => createCollectorVersion(fixture),
      (error) =>
        error instanceof TypeError &&
        "code" in error &&
        error.code === "INVALID_VERSION_IDENTITY_REPRESENTATION",
    );
  }
});

test("the six version brands are pairwise distinct at compile time", () => {
  const schema: TelemetrySchemaVersion = createTelemetrySchemaVersion("same");
  const collector: CollectorVersion = createCollectorVersion("same");
  const capability: CapabilityVersion = createCapabilityVersion("same");
  const collectionPolicy: CollectionPolicyVersion = createCollectionPolicyVersion("same");
  const projection: AudienceProjectionVersion = createAudienceProjectionVersion("same");
  const projectionPolicy: AudienceProjectionPolicyVersion =
    createAudienceProjectionPolicyVersion("same");

  // @ts-expect-error Each producer-owned version identity has a distinct brand.
  const schemaAsCollector: CollectorVersion = schema;
  // @ts-expect-error Each producer-owned version identity has a distinct brand.
  const schemaAsCapability: CapabilityVersion = schema;
  // @ts-expect-error Each producer-owned version identity has a distinct brand.
  const schemaAsCollectionPolicy: CollectionPolicyVersion = schema;
  // @ts-expect-error Each producer-owned version identity has a distinct brand.
  const schemaAsProjection: AudienceProjectionVersion = schema;
  // @ts-expect-error Each producer-owned version identity has a distinct brand.
  const schemaAsProjectionPolicy: AudienceProjectionPolicyVersion = schema;
  // @ts-expect-error Each producer-owned version identity has a distinct brand.
  const collectorAsCapability: CapabilityVersion = collector;
  // @ts-expect-error Each producer-owned version identity has a distinct brand.
  const collectorAsCollectionPolicy: CollectionPolicyVersion = collector;
  // @ts-expect-error Each producer-owned version identity has a distinct brand.
  const collectorAsProjection: AudienceProjectionVersion = collector;
  // @ts-expect-error Each producer-owned version identity has a distinct brand.
  const collectorAsProjectionPolicy: AudienceProjectionPolicyVersion = collector;
  // @ts-expect-error Each producer-owned version identity has a distinct brand.
  const capabilityAsCollectionPolicy: CollectionPolicyVersion = capability;
  // @ts-expect-error Each producer-owned version identity has a distinct brand.
  const capabilityAsProjection: AudienceProjectionVersion = capability;
  // @ts-expect-error Each producer-owned version identity has a distinct brand.
  const capabilityAsProjectionPolicy: AudienceProjectionPolicyVersion = capability;
  // @ts-expect-error Each producer-owned version identity has a distinct brand.
  const collectionPolicyAsProjection: AudienceProjectionVersion = collectionPolicy;
  // @ts-expect-error Each producer-owned version identity has a distinct brand.
  const collectionPolicyAsProjectionPolicy: AudienceProjectionPolicyVersion = collectionPolicy;
  // @ts-expect-error Each producer-owned version identity has a distinct brand.
  const projectionAsProjectionPolicy: AudienceProjectionPolicyVersion = projection;

  assert.deepEqual(
    [
      schemaAsCollector,
      schemaAsCapability,
      schemaAsCollectionPolicy,
      schemaAsProjection,
      schemaAsProjectionPolicy,
      collectorAsCapability,
      collectorAsCollectionPolicy,
      collectorAsProjection,
      collectorAsProjectionPolicy,
      capabilityAsCollectionPolicy,
      capabilityAsProjection,
      capabilityAsProjectionPolicy,
      collectionPolicyAsProjection,
      collectionPolicyAsProjectionPolicy,
      projectionAsProjectionPolicy,
    ],
    Array.from({ length: 15 }, () => "same"),
  );
});

test("runtime surface exports constructors only and no compatibility mechanism", () => {
  for (const name of [
    "createTelemetrySchemaVersion",
    "createCollectorVersion",
    "createCapabilityVersion",
    "createCollectionPolicyVersion",
    "createAudienceProjectionVersion",
    "createAudienceProjectionPolicyVersion",
  ]) assert.equal(typeof telemetry[name as keyof typeof telemetry], "function");

  for (const forbidden of [
    "CompatibilityMatrix",
    "CompatibilityEvaluator",
    "CompatibilityDecision",
    "CompatibilityEvaluationResult",
    "CompatibilityEvaluationCause",
  ]) assert.equal(Object.hasOwn(telemetry, forbidden), false);
});
