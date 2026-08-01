import assert from "node:assert/strict";
import test from "node:test";

import {
  TELEMETRY_CAPABILITY_STATUSES,
  createAudienceProjectionId,
  createAudienceProjectionPolicyVersion,
  createAudienceProjectionVersion,
  createCapabilityVersion,
  createCollectionPolicyVersion,
  createCollectorVersion,
  createTelemetryBucketId,
  createTelemetryEventId,
  createTelemetrySchemaVersion,
  isTelemetryCapabilityStatus,
  type AudienceProjectionId,
  type CapabilityVersion,
  type CollectorVersion,
  type TelemetryBucketId,
} from "../../packages/telemetry/src/index.ts";

test("telemetry opaque identities preserve their exact logical values", () => {
  assert.equal(createTelemetryBucketId("bucket:\u00e7:\u0000"), "bucket:\u00e7:\u0000");
  assert.equal(createAudienceProjectionId("projection/001"), "projection/001");
  assert.equal(createTelemetryEventId("event-001"), "event-001");
});

test("telemetry opaque identities reject empty and padded values", () => {
  for (const create of [
    createTelemetryBucketId,
    createAudienceProjectionId,
    createTelemetryEventId,
  ]) {
    assert.throws(() => create(""), { code: "EMPTY_OPAQUE_VALUE" });
    assert.throws(() => create(" padded"), { code: "EMPTY_OPAQUE_VALUE" });
    assert.throws(() => create("padded "), { code: "EMPTY_OPAQUE_VALUE" });
  }
});

test("telemetry identity brands are distinct at compile time", () => {
  const bucketId: TelemetryBucketId = createTelemetryBucketId("same-value");
  const projectionId: AudienceProjectionId =
    createAudienceProjectionId("same-value");

  // @ts-expect-error Projection identities cannot substitute for bucket identities.
  const wrongBucketId: TelemetryBucketId = projectionId;

  assert.equal(bucketId, wrongBucketId);
});

test("telemetry capability status exposes exactly the five certified values", () => {
  assert.deepEqual(TELEMETRY_CAPABILITY_STATUSES, [
    "AVAILABLE",
    "UNAVAILABLE",
    "DISABLED",
    "DEGRADED",
    "FAILED",
  ]);

  for (const status of TELEMETRY_CAPABILITY_STATUSES) {
    assert.equal(isTelemetryCapabilityStatus(status), true);
  }
  assert.equal(isTelemetryCapabilityStatus("UNKNOWN"), false);
  assert.equal(isTelemetryCapabilityStatus("available"), false);
});

test("version identities require canonical non-empty strings and preserve exact values", () => {
  const versions = [
    [createTelemetrySchemaVersion, "schema-v1"],
    [createCollectorVersion, "collector/2026.08"],
    [createCapabilityVersion, "capability:\u03b2"],
    [createCollectionPolicyVersion, "collection-policy-1"],
    [createAudienceProjectionVersion, "projection-v1"],
    [createAudienceProjectionPolicyVersion, "projection-policy-v1"],
  ] as const;

  for (const [create, value] of versions) {
    assert.equal(create(value), value);
    assert.throws(() => create(""), { code: "EMPTY_OPAQUE_VALUE" });
    assert.throws(() => create(` ${value}`), { code: "EMPTY_OPAQUE_VALUE" });
    assert.throws(() => create(`${value} `), { code: "EMPTY_OPAQUE_VALUE" });
  }
});

test("version brands cannot substitute for one another", () => {
  const collectorVersion: CollectorVersion = createCollectorVersion("1");

  // @ts-expect-error CollectorVersion is not a CapabilityVersion.
  const capabilityVersion: CapabilityVersion = collectorVersion;

  assert.equal(capabilityVersion, "1");
});
