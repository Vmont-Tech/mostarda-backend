import { createHash } from "node:crypto";

export type DiscoveryLifecycleState =
  | "NOT_STARTED"
  | "COLLECTING"
  | "NORMALIZING"
  | "CORRELATING"
  | "PARTIAL"
  | "CONFLICTED"
  | "COMPLETE"
  | "SEALED";

export type TrustClass =
  | "ATTESTED"
  | "MEASURED"
  | "SYSTEM_REPORTED"
  | "DECLARED"
  | "UNKNOWN";

export type EvidenceIntegrityState =
  | "VALID"
  | "UNVERIFIED"
  | "INVALID"
  | "UNAVAILABLE";

export type EvidenceDigestScope =
  | "ORIGINAL_EVIDENCE_BYTES"
  | "DECLARATION_ENVELOPE"
  | "ADB_COMMAND_RESULT";

export type FactValidationState =
  | "VERIFIED"
  | "UNVERIFIED"
  | "UNRESOLVED";

export type DiscoveryFactObservationKind =
  | "DECLARED"
  | "OBSERVED"
  | "INFERRED"
  | "VALIDATED";

const OBSERVATION_KINDS: ReadonlySet<DiscoveryFactObservationKind> = new Set([
  "DECLARED",
  "OBSERVED",
  "INFERRED",
  "VALIDATED",
]);

export interface DiscoveryTargetIdentity {
  readonly bindingState: "PROVISIONAL" | "BOUND";
  readonly reference: string;
  readonly edgeInstallationId?: string;
  readonly deviceKeyReference?: string;
}

export interface FactSource {
  readonly kind: string;
  readonly component: string;
  readonly version: string;
  readonly reference: string;
  readonly trustClass: TrustClass;
}

export interface FactEvidence {
  readonly kind: string;
  readonly digest?: string;
  /** Identifies what was hashed; a digest is not proof of original evidence bytes unless explicitly scoped so. */
  readonly digestScope?: EvidenceDigestScope;
  readonly signature?: string;
  readonly signingKeyId?: string;
  readonly sourceReference?: string;
  readonly captureMethod?: string;
  readonly integrityState: EvidenceIntegrityState;
}

export type DiscoveryConflictKind =
  | "VALUE_MISMATCH"
  | "IDENTITY_MISMATCH"
  | "SOURCE_UNTRUSTED"
  | "STALE_OBSERVATION"
  | "NORMALIZATION_FAILURE"
  | "EVIDENCE_INVALID"
  | "MISSING_CORROBORATION";

export interface DiscoveryConflictObservation {
  readonly factId: string;
  readonly value: unknown;
  readonly normalizedValue?: unknown;
  readonly sourceReference: string;
  readonly evidenceReference?: string;
}

export interface DiscoveryConflict {
  readonly conflictId: string;
  readonly factType: string;
  readonly observations: readonly DiscoveryConflictObservation[];
  readonly conflictKind: DiscoveryConflictKind;
  readonly deterministicResolution: "NO_SELECTION_ALL_OBSERVATIONS_PRESERVED";
  readonly blockingScope: "FACT_TYPE";
  readonly createdAt: string;
}

export interface DiscoveryFact {
  readonly factId: string;
  readonly factType: string;
  /** Provenance classification; it never authorizes hardware compatibility by itself. */
  readonly observationKind: DiscoveryFactObservationKind;
  readonly source: FactSource;
  readonly value: unknown;
  readonly normalizedValue?: unknown;
  readonly confidence: number;
  /** `null` is an explicit statement that the source supplied no observation time. */
  readonly observedAt: string | null;
  readonly collectedAt: string;
  readonly evidence: FactEvidence;
  readonly collectorVersion: string;
  readonly schemaVersion: string;
  readonly targetIdentity: DiscoveryTargetIdentity;
  readonly observationSequence: number;
  readonly validationState: FactValidationState;
  readonly inference?: string;
}

export interface DiscoveryRecord {
  readonly discoveryId: string;
  readonly targetIdentity: DiscoveryTargetIdentity;
  readonly schemaVersion: string;
  readonly collectorVersion: string;
  readonly lifecycleState: DiscoveryLifecycleState;
  readonly startedAt: string;
  readonly sealedAt?: string;
  readonly facts: readonly DiscoveryFact[];
  readonly conflicts: readonly DiscoveryConflict[];
  readonly missingRequirements: readonly string[];
  readonly evidenceRoot: string;
  readonly recordHash?: string;
}

export interface CreateDiscoveryRecordInput {
  readonly discoveryId: string;
  readonly targetIdentity: DiscoveryTargetIdentity;
  readonly schemaVersion?: string;
  readonly collectorVersion: string;
  readonly startedAt: string;
  readonly facts: readonly DiscoveryFact[];
  readonly conflicts?: readonly DiscoveryConflict[];
  readonly missingRequirements: readonly string[];
  readonly evidenceRoot?: string;
}

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${field} must not be empty`);
  }
}

function assertIsoInstant(value: string, field: string): void {
  assertNonEmpty(value, field);
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`${field} must be an ISO timestamp`);
  }
}

function assertConfidence(value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error("confidence must be within [0, 1]");
  }
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  Object.freeze(value);
  for (const nested of Object.values(value as Record<string, unknown>)) {
    if (nested !== null && typeof nested === "object" && !Object.isFrozen(nested)) {
      deepFreeze(nested);
    }
  }
  return value;
}

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

function hashRecord(record: Omit<DiscoveryRecord, "recordHash" | "sealedAt">): string {
  const canonical = JSON.stringify(canonicalize(record));
  return createHash("sha256").update(canonical).digest("hex");
}

function evidenceManifest(facts: readonly DiscoveryFact[]): readonly unknown[] {
  return [...facts]
    .sort((left, right) => left.factId.localeCompare(right.factId))
    .map((fact) => ({
      factId: fact.factId,
      evidence: {
        kind: fact.evidence.kind,
        digest: fact.evidence.digest ?? null,
        digestScope: fact.evidence.digestScope ?? null,
        signature: fact.evidence.signature ?? null,
        signingKeyId: fact.evidence.signingKeyId ?? null,
        sourceReference: fact.evidence.sourceReference ?? null,
        captureMethod: fact.evidence.captureMethod ?? null,
        integrityState: fact.evidence.integrityState,
      },
    }));
}

/** Hashes evidence references only; recordHash is the integrity hash of the full record. */
export function canonicalEvidenceRoot(facts: readonly DiscoveryFact[]): string {
  const canonical = JSON.stringify(canonicalize(evidenceManifest(facts)));
  return createHash("sha256").update(canonical).digest("hex");
}

function normalizeList(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function normalizeConflicts(values: readonly DiscoveryConflict[]): readonly DiscoveryConflict[] {
  return [...new Map(values.map((conflict) => [conflict.conflictId, conflict])).values()]
    .sort((left, right) => left.conflictId.localeCompare(right.conflictId));
}

function validateFact(fact: DiscoveryFact): void {
  assertNonEmpty(fact.factId, "factId");
  assertNonEmpty(fact.factType, "factType");
  if (!OBSERVATION_KINDS.has(fact.observationKind)) {
    throw new Error("observationKind must be DECLARED, OBSERVED, INFERRED or VALIDATED");
  }
  assertNonEmpty(fact.source.reference, "source.reference");
  assertNonEmpty(fact.collectedAt, "collectedAt");
  assertIsoInstant(fact.collectedAt, "collectedAt");
  if (fact.observedAt !== null) assertIsoInstant(fact.observedAt, "observedAt");
  if (fact.evidence.digest !== undefined && fact.evidence.digestScope === undefined) {
    throw new Error("evidence.digest requires an explicit digestScope");
  }
  if (fact.observationKind === "INFERRED" && (fact.inference === undefined || fact.inference.trim().length === 0)) {
    throw new Error("inferred facts require an inference description");
  }
  if (fact.observationKind === "VALIDATED" && fact.validationState !== "VERIFIED") {
    throw new Error("validated facts require VERIFIED validationState");
  }
  assertConfidence(fact.confidence);
  if (!Number.isInteger(fact.observationSequence) || fact.observationSequence < 0) {
    throw new Error("observationSequence must be a non-negative integer");
  }
}

export function createDiscoveryRecord(input: CreateDiscoveryRecordInput): DiscoveryRecord {
  assertNonEmpty(input.discoveryId, "discoveryId");
  assertNonEmpty(input.collectorVersion, "collectorVersion");
  assertIsoInstant(input.startedAt, "startedAt");
  for (const fact of input.facts) validateFact(fact);

  const facts = [...input.facts].sort((left, right) => left.factId.localeCompare(right.factId));
  const conflicts = normalizeConflicts(input.conflicts ?? []);
  const missingRequirements = normalizeList(input.missingRequirements);
  const lifecycleState: DiscoveryLifecycleState = conflicts.length > 0
    ? "CONFLICTED"
    : missingRequirements.length > 0
      ? "PARTIAL"
      : "COMPLETE";

  return {
    discoveryId: input.discoveryId,
    targetIdentity: input.targetIdentity,
    schemaVersion: input.schemaVersion ?? "hardware-discovery-schema-v1",
    collectorVersion: input.collectorVersion,
    lifecycleState,
    startedAt: input.startedAt,
    facts,
    conflicts,
    missingRequirements,
    evidenceRoot: input.evidenceRoot ?? "UNSEALED",
  };
}

export function sealDiscoveryRecord(record: DiscoveryRecord, sealedAt: string): DiscoveryRecord & { readonly recordHash: string; readonly sealedAt: string } {
  // SEALED closes the immutable discovery snapshot; it does not validate hardware or authorize compatibility.
  if (record.lifecycleState === "SEALED") {
    throw new Error("record is already sealed");
  }
  assertIsoInstant(sealedAt, "sealedAt");
  const computedEvidenceRoot = canonicalEvidenceRoot(record.facts);
  const evidenceRoot = ["UNSEALED", "UNVERIFIED_INTAKE", "COMPOSITE_UNVERIFIED"].includes(record.evidenceRoot)
    ? computedEvidenceRoot
    : record.evidenceRoot;
  if (evidenceRoot !== computedEvidenceRoot) {
    throw new Error("evidenceRoot does not match the record evidence manifest");
  }
  const withoutHash: Omit<DiscoveryRecord, "recordHash" | "sealedAt"> = {
    discoveryId: record.discoveryId,
    targetIdentity: record.targetIdentity,
    schemaVersion: record.schemaVersion,
    collectorVersion: record.collectorVersion,
    lifecycleState: "SEALED",
    startedAt: record.startedAt,
    facts: record.facts,
    conflicts: record.conflicts,
    missingRequirements: record.missingRequirements,
    evidenceRoot,
  };
  const sealed = {
    ...withoutHash,
    sealedAt,
    recordHash: hashRecord(withoutHash),
  } as DiscoveryRecord & { readonly recordHash: string; readonly sealedAt: string };
  return deepFreeze(sealed);
}

export function canonicalRecordHash(record: DiscoveryRecord): string {
  const withoutHash: Omit<DiscoveryRecord, "recordHash" | "sealedAt"> = {
    discoveryId: record.discoveryId,
    targetIdentity: record.targetIdentity,
    schemaVersion: record.schemaVersion,
    collectorVersion: record.collectorVersion,
    lifecycleState: record.lifecycleState,
    startedAt: record.startedAt,
    facts: record.facts,
    conflicts: record.conflicts,
    missingRequirements: record.missingRequirements,
    evidenceRoot: record.evidenceRoot,
  };
  return hashRecord(withoutHash);
}
