import { assertGenerationAuthorized } from "../../generation/src/index.ts";

declare const telemetryValueBrand: unique symbol;

type TelemetryOpaqueValue<Name extends string> = string & {
  readonly [telemetryValueBrand]: Name;
};

export type TelemetryBucketId = TelemetryOpaqueValue<"TelemetryBucketId">;
export type AudienceProjectionId = TelemetryOpaqueValue<"AudienceProjectionId">;
export type TelemetryEventId = TelemetryOpaqueValue<"TelemetryEventId">;
export type TelemetrySchemaVersion =
  TelemetryOpaqueValue<"TelemetrySchemaVersion">;
export type CollectorVersion = TelemetryOpaqueValue<"CollectorVersion">;
export type CapabilityVersion = TelemetryOpaqueValue<"CapabilityVersion">;
export type CollectionPolicyVersion =
  TelemetryOpaqueValue<"CollectionPolicyVersion">;
export type AudienceProjectionVersion =
  TelemetryOpaqueValue<"AudienceProjectionVersion">;
export type AudienceProjectionPolicyVersion =
  TelemetryOpaqueValue<"AudienceProjectionPolicyVersion">;

for (const artifact of [
  "TelemetryBucketId",
  "AudienceProjectionId",
  "TelemetryEventId",
  "TelemetrySchemaVersion",
  "CollectorVersion",
  "CapabilityVersion",
  "CollectionPolicyVersion",
  "AudienceProjectionVersion",
  "AudienceProjectionPolicyVersion",
] as const) {
  assertGenerationAuthorized(artifact);
}

function createTelemetryOpaqueValue<Name extends string>(
  value: string,
): TelemetryOpaqueValue<Name> {
  if (value.length === 0 || value.trim() !== value) {
    const error = new TypeError("Opaque telemetry value must be non-empty and canonical.");
    Object.assign(error, { code: "EMPTY_OPAQUE_VALUE" as const });
    throw error;
  }

  return value as TelemetryOpaqueValue<Name>;
}

export function createTelemetryBucketId(value: string): TelemetryBucketId {
  return createTelemetryOpaqueValue(value);
}

export function createAudienceProjectionId(value: string): AudienceProjectionId {
  return createTelemetryOpaqueValue(value);
}

export function createTelemetryEventId(value: string): TelemetryEventId {
  return createTelemetryOpaqueValue(value);
}

export function createTelemetrySchemaVersion(
  value: string,
): TelemetrySchemaVersion {
  return createTelemetryOpaqueValue(value);
}

export function createCollectorVersion(value: string): CollectorVersion {
  return createTelemetryOpaqueValue(value);
}

export function createCapabilityVersion(value: string): CapabilityVersion {
  return createTelemetryOpaqueValue(value);
}

export function createCollectionPolicyVersion(
  value: string,
): CollectionPolicyVersion {
  return createTelemetryOpaqueValue(value);
}

export function createAudienceProjectionVersion(
  value: string,
): AudienceProjectionVersion {
  return createTelemetryOpaqueValue(value);
}

export function createAudienceProjectionPolicyVersion(
  value: string,
): AudienceProjectionPolicyVersion {
  return createTelemetryOpaqueValue(value);
}
