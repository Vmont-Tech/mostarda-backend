export type ImplementationStatus =
  | "IMPLEMENTATION_READY"
  | "IMPLEMENTATION_PARTIAL"
  | "IMPLEMENTATION_NOT_READY"
  | "IMPLEMENTATION_BLOCKED_DOMAIN"
  | "IMPLEMENTATION_BLOCKED_ARCHITECTURE"
  | "IMPLEMENTATION_BLOCKED_PRODUCTION"
  | "IMPLEMENTATION_BLOCKED_MULTIPLE"
  | "BLOCKED_BY_PARTIAL_DEPENDENCY";

export interface ArtifactAuthorization {
  readonly artifact: string;
  readonly status: ImplementationStatus;
  readonly source: string;
}

const registry = new Map<string, ArtifactAuthorization>(
  [
    "ResponsibleParty",
    "ResponsibilityCategory",
    "Severity",
    "Confidence",
    "GovernanceCaseStateMachine",
  ].map((artifact) => [
    artifact,
    Object.freeze({
      artifact,
      status: "IMPLEMENTATION_READY" as const,
      source: "IMPLEMENTATION_READINESS_REVIEW_V2.md §5",
    }),
  ]),
);

for (const artifact of [
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
]) {
  registry.set(
    artifact,
    Object.freeze({
      artifact,
      status: "IMPLEMENTATION_READY",
      source: "TELEMETRY_IMPLEMENTATION_GATE_V1.md",
    }),
  );
}

registry.set(
  "GovernanceCase",
  Object.freeze({
    artifact: "GovernanceCase",
    status: "IMPLEMENTATION_PARTIAL",
    source: "IMPLEMENTATION_READINESS_REVIEW_V2.md",
  }),
);
registry.set(
  "ResponsibilityDecision",
  Object.freeze({
    artifact: "ResponsibilityDecision",
    status: "BLOCKED_BY_PARTIAL_DEPENDENCY",
    source: "GOVERNANCE_IMPLEMENTATION_GATE_V1.md §10",
  }),
);

export class ArtifactGenerationBlocked extends Error {
  readonly artifact: string;
  readonly status: ImplementationStatus;
  readonly source: string;

  constructor(authorization: ArtifactAuthorization) {
    super(
      `Generation of ${authorization.artifact} is blocked by ${authorization.status} (${authorization.source}).`,
    );
    this.name = "ArtifactGenerationBlocked";
    this.artifact = authorization.artifact;
    this.status = authorization.status;
    this.source = authorization.source;
  }
}

export function authorizationFor(artifact: string): ArtifactAuthorization {
  return (
    registry.get(artifact) ??
    Object.freeze({
      artifact,
      status: "IMPLEMENTATION_BLOCKED_ARCHITECTURE",
      source: "CGS-A-1 deny-by-default",
    })
  );
}

export function assertGenerationAuthorized(artifact: string): void {
  const authorization = authorizationFor(artifact);
  if (authorization.status !== "IMPLEMENTATION_READY") {
    throw new ArtifactGenerationBlocked(authorization);
  }
}
