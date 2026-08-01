import { assertGenerationAuthorized } from "../../generation/src/index.ts";
import {
  createOpaqueId,
  type OpaqueId,
} from "../../kernel/src/index.ts";

export type TelemetryBucketId = OpaqueId<"TelemetryBucketId">;
export type AudienceProjectionId = OpaqueId<"AudienceProjectionId">;
export type TelemetryEventId = OpaqueId<"TelemetryEventId">;

for (const artifact of [
  "TelemetryBucketId",
  "AudienceProjectionId",
  "TelemetryEventId",
] as const) {
  assertGenerationAuthorized(artifact);
}

export function createTelemetryBucketId(value: string): TelemetryBucketId {
  return createOpaqueId<"TelemetryBucketId">(value);
}

export function createAudienceProjectionId(value: string): AudienceProjectionId {
  return createOpaqueId<"AudienceProjectionId">(value);
}

export function createTelemetryEventId(value: string): TelemetryEventId {
  return createOpaqueId<"TelemetryEventId">(value);
}
