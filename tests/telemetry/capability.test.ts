import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

import {
  TELEMETRY_CAPABILITY_STATUSES,
  createAudienceProjectionId,
  createTelemetryBucketId,
  createTelemetryEventId,
  isTelemetryCapabilityStatus,
  type AudienceProjectionId,
  type TelemetryBucketId,
  type TelemetryEventId,
} from "../../packages/telemetry/src/index.ts";
import * as telemetry from "../../packages/telemetry/src/index.ts";
import {
  authorizationFor,
  telemetryAuthorizedArtifacts,
  telemetryPartialArtifacts,
} from "../../packages/generation/src/index.ts";

// @ts-expect-error Generation-authorized version types are materialized only in C4.
type ForbiddenTelemetrySchemaVersion = import("../../packages/telemetry/src/index.ts").TelemetrySchemaVersion;
// @ts-expect-error Generation-authorized version types are materialized only in C4.
type ForbiddenCollectorVersion = import("../../packages/telemetry/src/index.ts").CollectorVersion;
// @ts-expect-error Generation-authorized version types are materialized only in C4.
type ForbiddenCapabilityVersion = import("../../packages/telemetry/src/index.ts").CapabilityVersion;
// @ts-expect-error Generation-authorized version types are materialized only in C4.
type ForbiddenCollectionPolicyVersion = import("../../packages/telemetry/src/index.ts").CollectionPolicyVersion;
// @ts-expect-error Generation-authorized version types are materialized only in C4.
type ForbiddenAudienceProjectionVersion = import("../../packages/telemetry/src/index.ts").AudienceProjectionVersion;
// @ts-expect-error Generation-authorized version types are materialized only in C4.
type ForbiddenAudienceProjectionPolicyVersion = import("../../packages/telemetry/src/index.ts").AudienceProjectionPolicyVersion;
// @ts-expect-error Source-context-owned identities must not be telemetry exports.
type ForbiddenTVId = import("../../packages/telemetry/src/index.ts").TVId;
// @ts-expect-error Source-context-owned identities must not be telemetry exports.
type ForbiddenVenueId = import("../../packages/telemetry/src/index.ts").VenueId;
// @ts-expect-error Source-context-owned identities must not be telemetry exports.
type ForbiddenDeviceId = import("../../packages/telemetry/src/index.ts").DeviceId;
// @ts-expect-error Source-context-owned identities must not be telemetry exports.
type ForbiddenEdgeInstallationId = import("../../packages/telemetry/src/index.ts").EdgeInstallationId;
// @ts-expect-error Source-context-owned identities must not be telemetry exports.
type ForbiddenPlayerInstallationId = import("../../packages/telemetry/src/index.ts").PlayerInstallationId;
// @ts-expect-error CapabilityObservation is not a certified READY artifact.
type ForbiddenCapabilityObservation = import("../../packages/telemetry/src/index.ts").CapabilityObservation;
// @ts-expect-error Measurement contracts are not certified independently of TelemetryBucket.
type ForbiddenTelemetryMeasurement = import("../../packages/telemetry/src/index.ts").TelemetryMeasurement;

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
    assert.throws(() => create(""), /non-empty/);
    assert.throws(() => create(" padded"), /canonical/);
    assert.throws(() => create("padded "), /canonical/);
  }
});

test("telemetry identity brands are distinct at compile time", () => {
  const bucketId: TelemetryBucketId = createTelemetryBucketId("same-value");
  const projectionId: AudienceProjectionId =
    createAudienceProjectionId("same-value");
  const eventId: TelemetryEventId = createTelemetryEventId("same-value");

  // @ts-expect-error Projection identities cannot substitute for bucket identities.
  const wrongBucketId: TelemetryBucketId = projectionId;
  // @ts-expect-error Event identities cannot substitute for projection identities.
  const wrongProjectionId: AudienceProjectionId = eventId;
  // @ts-expect-error Bucket identities cannot substitute for event identities.
  const wrongEventId: TelemetryEventId = bucketId;

  assert.equal(bucketId, wrongBucketId);
  assert.equal(projectionId, wrongProjectionId);
  assert.equal(eventId, wrongEventId);
});

test("telemetry capability status exposes exactly the five certified values", () => {
  assert.equal(Object.isFrozen(TELEMETRY_CAPABILITY_STATUSES), true);
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

test("telemetry generation authorization contains exactly the ten certified artifacts", () => {
  assert.deepEqual(telemetryAuthorizedArtifacts, [
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
  ]);
});

test("pre-C4 telemetry materializes only the original four authorized artifacts", () => {
  assert.deepEqual(Object.keys(telemetry).sort(), [
    "TELEMETRY_CAPABILITY_STATUSES",
    "createAudienceProjectionId",
    "createTelemetryBucketId",
    "createTelemetryEventId",
    "isTelemetryCapabilityStatus",
  ]);

  assert.equal(existsSync("packages/telemetry/src/versions.ts"), false);
});

test("all remaining PARTIAL telemetry artifacts stay denied and unexported", () => {
  assert.equal(telemetryPartialArtifacts.length, 23);

  for (const artifact of telemetryPartialArtifacts) {
    assert.equal(authorizationFor(artifact).status, "IMPLEMENTATION_PARTIAL");
    assert.equal(Object.hasOwn(telemetry, artifact), false);
  }
});
