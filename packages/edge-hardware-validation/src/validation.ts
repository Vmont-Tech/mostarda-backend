import { createHash } from "node:crypto";
import {
  canonicalEvidenceRoot,
  canonicalRecordHash,
  type DiscoveryFact,
  type DiscoveryRecord,
} from "../../edge-discovery/src/index.ts";
import {
  canonicalHardwareProfileHash,
  type HardwareProfile,
} from "../../edge-hardware-profile/src/index.ts";
import {
  evaluateHardwareCompatibility,
  type CompatibilityEvaluationResult,
  type CompatibilityRequirementResult,
} from "../../edge-compatibility/src/index.ts";

export const HARDWARE_VALIDATION_SCHEMA_VERSION = "hardware-validation-record-v1";
const CANONICALIZATION_VERSION = "canonical-json-v1";
const HASH_ALGORITHM = "SHA-256" as const;
const VALIDATED_AT_DEFAULT = "2026-08-10T20:45:54.567Z";

type SealedDiscovery = DiscoveryRecord & { readonly recordHash: string; readonly sealedAt: string };

export type ValidationMethod = {
  readonly id: "READ_ONLY_ADB" | "USER_PROVIDED_EVIDENCE";
  readonly status: "UNAVAILABLE" | "NOT_VALIDATING" | "AVAILABLE";
  readonly attempted: boolean;
  readonly invasive: false;
  readonly reason: string;
};

export type ValidationFinding = {
  readonly requirementId: string;
  readonly factTypes: readonly string[];
  readonly status: "UNKNOWN" | "OBSERVED" | "VALIDATED";
  readonly observationKind: "UNKNOWN" | "OBSERVED" | "VALIDATED";
  readonly validationState: "UNRESOLVED" | "UNVERIFIED" | "VERIFIED";
  readonly reason: string;
  readonly existingFactIds: readonly string[];
  readonly evidenceReferences: readonly string[];
  readonly availableMethods: readonly ValidationMethod["id"][];
};

export type HardwareValidationRecord = {
  readonly schemaVersion: typeof HARDWARE_VALIDATION_SCHEMA_VERSION;
  readonly validationId: string;
  readonly validatedAt: string;
  readonly validationState: "INCOMPLETE";
  readonly operationalAuthorization: "BLOCKED";
  readonly profileReference: {
    readonly profileId: string;
    readonly profileVersion: string;
    readonly profileHash: string;
    readonly lifecycleState: "CANDIDATE";
    readonly identityStatus: "PROVISIONAL";
    readonly installationProfileReferences: readonly never[];
  };
  readonly discoveryReference: {
    readonly discoveryId: string;
    readonly recordHash: string;
    readonly evidenceRoot: string;
    readonly schemaVersion: string;
    readonly sealedAt: string;
  };
  /** Every discovery-level requirement still missing from the sealed source. */
  readonly missingDiscoveryRequirements: readonly string[];
  readonly compatibility: CompatibilityEvaluationResult;
  readonly methods: readonly ValidationMethod[];
  readonly findings: readonly ValidationFinding[];
  readonly sourceFacts: readonly DiscoveryFact[];
  readonly promotion: {
    readonly targetLifecycle: "PRODUCTION";
    readonly status: "BLOCKED";
    readonly reasons: readonly string[];
  };
  readonly candidateUpdate: {
    readonly status: "NOT_MUTATED";
    readonly reason: "VALIDATION_ARTIFACT_ONLY";
  };
  readonly integrity: {
    readonly validationRecordHash: string;
    readonly hashAlgorithm: typeof HASH_ALGORITHM;
    readonly canonicalizationVersion: typeof CANONICALIZATION_VERSION;
    readonly signature: null;
    readonly verificationState: "UNSIGNED_VALIDATION_RECORD";
  };
};

export type HardwareValidationInput = {
  readonly discovery: SealedDiscovery;
  readonly profile: HardwareProfile;
  readonly validatedAt?: string;
};

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  Object.freeze(value);
  for (const nested of Object.values(value as Record<string, unknown>)) {
    if (nested !== null && typeof nested === "object" && !Object.isFrozen(nested)) deepFreeze(nested);
  }
  return value;
}

function assertIsoInstant(value: string, field: string): void {
  if (Number.isNaN(Date.parse(value))) throw new Error(`${field} must be an ISO timestamp`);
}

function assertSealedDiscovery(record: DiscoveryRecord): asserts record is SealedDiscovery {
  if (record.lifecycleState !== "SEALED" || typeof record.recordHash !== "string" || typeof record.sealedAt !== "string") {
    throw new Error("HardwareValidation requires a SEALED Discovery Record");
  }
  if (canonicalEvidenceRoot(record.facts) !== record.evidenceRoot) {
    throw new Error("HardwareValidation rejected an invalid Discovery evidenceRoot");
  }
  if (canonicalRecordHash(record) !== record.recordHash) {
    throw new Error("HardwareValidation rejected an invalid Discovery recordHash");
  }
}

function assertCandidateProfile(profile: HardwareProfile, discovery: SealedDiscovery): void {
  if (profile.lifecycleState !== "CANDIDATE") throw new Error("HardwareValidation requires a CANDIDATE HardwareProfile");
  if (profile.hardwareIdentity.identityStatus !== "PROVISIONAL") throw new Error("HardwareValidation requires a PROVISIONAL profile identity");
  if (profile.operationalAuthorization !== "BLOCKED") throw new Error("HardwareValidation requires a BLOCKED candidate profile");
  if (profile.installationProfileReferences.length !== 0) throw new Error("HardwareValidation rejects profiles with InstallationProfile references");
  if (canonicalHardwareProfileHash(profile) !== profile.integrity.profileHash) {
    throw new Error("HardwareValidation rejected an invalid HardwareProfile profileHash");
  }
  if (profile.discoveryReference.discoveryId !== discovery.discoveryId
    || profile.discoveryReference.discoveryRecordHash !== discovery.recordHash
    || profile.discoveryReference.evidenceRoot !== discovery.evidenceRoot) {
    throw new Error("HardwareValidation rejected a profile with a different Discovery reference");
  }
}

function factsFor(requirement: CompatibilityRequirementResult, discovery: SealedDiscovery): readonly DiscoveryFact[] {
  return discovery.facts.filter((fact) => requirement.factTypes.includes(fact.factType));
}

function evidenceReferences(facts: readonly DiscoveryFact[]): readonly string[] {
  return [...new Set(facts
    .map((fact) => fact.evidence.sourceReference)
    .filter((reference): reference is string => reference !== undefined))].sort();
}

function findingFor(requirement: CompatibilityRequirementResult, discovery: SealedDiscovery): ValidationFinding {
  const facts = factsFor(requirement, discovery);
  const hasValidatedEvidence = requirement.status === "SATISFIED";
  const hasObservedFact = facts.some((fact) => fact.observationKind === "OBSERVED");
  const status = hasValidatedEvidence ? "VALIDATED" : hasObservedFact ? "OBSERVED" : "UNKNOWN";
  return {
    requirementId: requirement.id,
    factTypes: [...requirement.factTypes],
    status,
    observationKind: status,
    validationState: hasValidatedEvidence ? "VERIFIED" : hasObservedFact ? "UNVERIFIED" : "UNRESOLVED",
    reason: requirement.reason,
    existingFactIds: facts.map((fact) => fact.factId).sort(),
    evidenceReferences: evidenceReferences(facts),
    availableMethods: ["READ_ONLY_ADB"],
  };
}

function validationRecordWithoutHash(record: HardwareValidationRecord): Omit<HardwareValidationRecord, "integrity"> & {
  readonly integrity: Omit<HardwareValidationRecord["integrity"], "validationRecordHash"> & { readonly validationRecordHash: null };
} {
  return {
    ...record,
    integrity: { ...record.integrity, validationRecordHash: null },
  };
}

export function canonicalHardwareValidationHash(record: HardwareValidationRecord): string {
  return sha256(validationRecordWithoutHash(record));
}

export function createHardwareValidationRecord(input: HardwareValidationInput): HardwareValidationRecord {
  const validatedAt = input.validatedAt ?? VALIDATED_AT_DEFAULT;
  assertIsoInstant(validatedAt, "validatedAt");
  assertSealedDiscovery(input.discovery);
  assertCandidateProfile(input.profile, input.discovery);

  const compatibility = evaluateHardwareCompatibility(
    input.discovery,
    validatedAt,
    `validation-compat-${input.discovery.discoveryId}`,
  );
  const findings = compatibility.requirements
    .filter((requirement) => requirement.factTypes.length > 0 && requirement.status !== "SATISFIED")
    .map((requirement) => findingFor(requirement, input.discovery));

  const record: HardwareValidationRecord = {
    schemaVersion: HARDWARE_VALIDATION_SCHEMA_VERSION,
    validationId: `hardware-validation-${input.discovery.discoveryId}`,
    validatedAt,
    validationState: "INCOMPLETE",
    operationalAuthorization: "BLOCKED",
    profileReference: {
      profileId: input.profile.profileId,
      profileVersion: input.profile.profileVersion,
      profileHash: input.profile.integrity.profileHash,
      lifecycleState: "CANDIDATE",
      identityStatus: "PROVISIONAL",
      installationProfileReferences: [],
    },
    discoveryReference: {
      discoveryId: input.discovery.discoveryId,
      recordHash: input.discovery.recordHash,
      evidenceRoot: input.discovery.evidenceRoot,
      schemaVersion: input.discovery.schemaVersion,
      sealedAt: input.discovery.sealedAt,
    },
    missingDiscoveryRequirements: [...input.discovery.missingRequirements],
    compatibility,
    methods: [
      {
        id: "READ_ONLY_ADB",
        status: "UNAVAILABLE",
        attempted: false,
        invasive: false,
        reason: "NO_AUTHORIZED_PHYSICAL_ADB_SESSION_AVAILABLE_IN_THIS_EXECUTION",
      },
      {
        id: "USER_PROVIDED_EVIDENCE",
        status: "NOT_VALIDATING",
        attempted: false,
        invasive: false,
        reason: "DECLARED_OR_INFERRED_INTAKE_CANNOT_VALIDATE_PHYSICAL_CAPABILITIES",
      },
    ],
    findings,
    sourceFacts: input.discovery.facts,
    promotion: {
      targetLifecycle: "PRODUCTION",
      status: "BLOCKED",
      reasons: [
        "NO_NON_INVASIVE_PHYSICAL_VALIDATION_METHOD_AVAILABLE",
        "TARGET_IDENTITY_PROVISIONAL",
        "REQUIRED_CAPABILITIES_NOT_VALIDATED",
      ],
    },
    candidateUpdate: {
      status: "NOT_MUTATED",
      reason: "VALIDATION_ARTIFACT_ONLY",
    },
    integrity: {
      validationRecordHash: "UNSEALED",
      hashAlgorithm: HASH_ALGORITHM,
      canonicalizationVersion: CANONICALIZATION_VERSION,
      signature: null,
      verificationState: "UNSIGNED_VALIDATION_RECORD",
    },
  };

  const validationRecordHash = canonicalHardwareValidationHash(record);
  return deepFreeze({ ...record, integrity: { ...record.integrity, validationRecordHash } });
}
