import { assertGenerationAuthorized } from "../../generation/src/index.ts";
import {
  createOpaqueId,
  type OpaqueId,
} from "../../kernel/src/index.ts";

export type TelemetrySchemaVersion = OpaqueId<"TelemetrySchemaVersion">;
export type CollectorVersion = OpaqueId<"CollectorVersion">;
export type CapabilityVersion = OpaqueId<"CapabilityVersion">;
export type CollectionPolicyVersion = OpaqueId<"CollectionPolicyVersion">;
export type AudienceProjectionVersion = OpaqueId<"AudienceProjectionVersion">;
export type AudienceProjectionPolicyVersion =
  OpaqueId<"AudienceProjectionPolicyVersion">;

for (const artifact of [
  "TelemetrySchemaVersion",
  "CollectorVersion",
  "CapabilityVersion",
  "CollectionPolicyVersion",
  "AudienceProjectionVersion",
  "AudienceProjectionPolicyVersion",
] as const) {
  assertGenerationAuthorized(artifact);
}

const opaqueTokenV1 = /^[A-Za-z0-9][A-Za-z0-9._:+-]*$/;

class InvalidVersionIdentityRepresentation extends TypeError {
  readonly code = "INVALID_VERSION_IDENTITY_REPRESENTATION" as const;

  constructor() {
    super("INVALID_VERSION_IDENTITY_REPRESENTATION");
    this.name = "InvalidVersionIdentityRepresentation";
  }
}

function createVersionIdentity<Name extends string>(value: string): OpaqueId<Name> {
  if (!opaqueTokenV1.test(value)) {
    throw new InvalidVersionIdentityRepresentation();
  }

  return createOpaqueId<Name>(value);
}

export function createTelemetrySchemaVersion(value: string): TelemetrySchemaVersion {
  return createVersionIdentity<"TelemetrySchemaVersion">(value);
}

export function createCollectorVersion(value: string): CollectorVersion {
  return createVersionIdentity<"CollectorVersion">(value);
}

export function createCapabilityVersion(value: string): CapabilityVersion {
  return createVersionIdentity<"CapabilityVersion">(value);
}

export function createCollectionPolicyVersion(value: string): CollectionPolicyVersion {
  return createVersionIdentity<"CollectionPolicyVersion">(value);
}

export function createAudienceProjectionVersion(value: string): AudienceProjectionVersion {
  return createVersionIdentity<"AudienceProjectionVersion">(value);
}

export function createAudienceProjectionPolicyVersion(
  value: string,
): AudienceProjectionPolicyVersion {
  return createVersionIdentity<"AudienceProjectionPolicyVersion">(value);
}
