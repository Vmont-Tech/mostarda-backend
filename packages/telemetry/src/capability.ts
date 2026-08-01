import { assertGenerationAuthorized } from "../../generation/src/index.ts";

assertGenerationAuthorized("TelemetryCapabilityStatus");

export const TELEMETRY_CAPABILITY_STATUSES = Object.freeze([
  "AVAILABLE",
  "UNAVAILABLE",
  "DISABLED",
  "DEGRADED",
  "FAILED",
] as const);

export type TelemetryCapabilityStatus =
  (typeof TELEMETRY_CAPABILITY_STATUSES)[number];

export function isTelemetryCapabilityStatus(
  value: string,
): value is TelemetryCapabilityStatus {
  return (TELEMETRY_CAPABILITY_STATUSES as readonly string[]).includes(value);
}
