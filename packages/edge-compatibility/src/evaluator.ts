import {
  HARDWARE_DISCOVERY_SCHEMA_VERSION,
  canonicalEvidenceRoot,
  canonicalRecordHash,
  type DiscoveryFact,
  type DiscoveryRecord,
} from "../../edge-discovery/src/record.ts";

export type CompatibilityState =
  | "UNKNOWN"
  | "UNSUPPORTED"
  | "EXPERIMENTAL"
  | "PRODUCTION"
  | "PREFERRED"
  | "DEPRECATED"
  | "BLOCKED";

export type RequirementStatus = "SATISFIED" | "NOT_SATISFIED" | "NOT_VERIFIABLE";

export interface CompatibilityRequirementResult {
  readonly id: string;
  readonly status: RequirementStatus;
  readonly reason: string;
  readonly factTypes: readonly string[];
  readonly evidenceReferences: readonly string[];
}

export interface CompatibilityEvaluationResult {
  readonly evaluationId: string;
  readonly discoveryId: string;
  readonly recordHash: string;
  readonly evaluatedAt: string;
  readonly evaluatorVersion: string;
  readonly state: CompatibilityState;
  readonly automaticProvisioning: "ALLOWED" | "BLOCKED";
  readonly reasons: readonly string[];
  readonly requirements: readonly CompatibilityRequirementResult[];
}

const EVALUATOR_VERSION = "edge-hardware-compatibility-v1";
const REQUIRED_FACTS: Readonly<Record<string, readonly string[]>> = {
  "HC-001": ["memory.ram.total.physical"],
  "HC-002": ["storage.usable.physical"],
  "HC-003": ["memory.ram.total.physical", "storage.usable.physical"],
  "HC-006": ["board.identifier", "soc.model"],
  "HC-007": ["boot.bootloader", "boot.mode"],
  "HC-008": ["recovery.validation"],
  "HC-009": ["ota.validation"],
  "HC-010": ["identity.edge_installation_id_capability", "identity.device_key_capability"],
  "HC-011": ["player.web_engine.validation"],
  "HC-012": ["codecs.validation"],
  "HC-013": ["thermal.validation"],
  "HC-014": ["offline.playback.validation"],
  "HC-015": ["ota.rollback.validation"],
  "HC-016": ["stability.long_run.validation"],
  "HC-017": ["hardware.profile.lifecycle"],
  "HC-019": ["soc.model", "board.identifier"],
  "HC-020": ["soc.model"],
};

function assertIsoInstant(value: string, field: string): void {
  if (Number.isNaN(Date.parse(value))) throw new Error(`${field} must be an ISO timestamp`);
}

function indexFacts(record: DiscoveryRecord): ReadonlyMap<string, readonly DiscoveryFact[]> {
  const index = new Map<string, DiscoveryFact[]>();
  for (const fact of record.facts) {
    const group = index.get(fact.factType) ?? [];
    group.push(fact);
    index.set(fact.factType, group);
  }
  return index;
}

function evidenceForFacts(facts: readonly DiscoveryFact[], factTypes: readonly string[]): readonly string[] {
  return [...new Set(facts
    .filter((fact) => factTypes.includes(fact.factType))
    .map((fact) => fact.evidence.sourceReference)
    .filter((reference): reference is string => reference !== undefined))]
    .sort();
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

function correlationValueKey(fact: DiscoveryFact): string {
  const value = fact.normalizedValue === undefined
    ? { kind: "RAW_VALUE", value: fact.value }
    : { kind: "NORMALIZED_VALUE", value: fact.normalizedValue };
  return JSON.stringify(canonicalize(value));
}

function hasValidEvidence(fact: DiscoveryFact): boolean {
  return fact.observationKind === "VALIDATED"
    && fact.validationState === "VERIFIED"
    && fact.evidence.integrityState === "VALID"
    && typeof fact.evidence.digest === "string"
    && /^[a-f0-9]{64}$/i.test(fact.evidence.digest)
    && fact.evidence.digestScope !== undefined;
}

function factGroupsWithUnresolvedConflicts(
  factTypes: readonly string[],
  factIndex: ReadonlyMap<string, readonly DiscoveryFact[]>,
  record: DiscoveryRecord,
): readonly string[] {
  const declaredConflicts = new Set(record.conflicts.map((conflict) => conflict.factType));
  return factTypes.filter((factType) => {
    const group = factIndex.get(factType) ?? [];
    const valueKeys = new Set(group.map(correlationValueKey));
    return declaredConflicts.has(factType) || valueKeys.size > 1;
  });
}

function nonValidatedFactTypes(
  factTypes: readonly string[],
  factIndex: ReadonlyMap<string, readonly DiscoveryFact[]>,
): readonly string[] {
  return factTypes.filter((factType) => {
    const group = factIndex.get(factType) ?? [];
    return !group.some(hasValidEvidence);
  });
}

function notVerifiable(
  id: string,
  reason: string,
  factTypes: readonly string[],
  facts: readonly DiscoveryFact[],
): CompatibilityRequirementResult {
  return {
    id,
    status: "NOT_VERIFIABLE",
    reason,
    factTypes,
    evidenceReferences: evidenceForFacts(facts, factTypes),
  };
}

function notSatisfied(
  id: string,
  reason: string,
  factTypes: readonly string[],
  facts: readonly DiscoveryFact[],
): CompatibilityRequirementResult {
  return {
    id,
    status: "NOT_SATISFIED",
    reason,
    factTypes,
    evidenceReferences: evidenceForFacts(facts, factTypes),
  };
}

function evaluateRequirement(
  id: string,
  facts: readonly DiscoveryFact[],
  factIndex: ReadonlyMap<string, readonly DiscoveryFact[]>,
  record: DiscoveryRecord,
): CompatibilityRequirementResult {
  const factTypes = REQUIRED_FACTS[id] ?? [];
  const missing = factTypes.filter((factType) => !factIndex.has(factType));
  if (missing.length > 0) {
    return notVerifiable(id, `MISSING_FACTS:${missing.join(",")}`, factTypes, facts);
  }

  const conflicts = factGroupsWithUnresolvedConflicts(factTypes, factIndex, record);
  if (conflicts.length > 0) {
    return notSatisfied(id, `CONFLICT_UNRESOLVED:${conflicts.join(",")}`, factTypes, facts);
  }

  const unvalidated = nonValidatedFactTypes(factTypes, factIndex);
  if (unvalidated.length > 0) {
    return notVerifiable(id, `FACTS_NOT_VALIDATED:${unvalidated.join(",")}`, factTypes, facts);
  }

  if (id === "HC-001" || id === "HC-002" || id === "HC-003") {
    return notVerifiable(id, "CAPACITY_NOT_PHYSICALLY_VALIDATED", factTypes, facts);
  }
  if (id === "HC-006") {
    return notVerifiable(id, "IDENTITY_NOT_VALIDATED_BEYOND_DECLARED_BOARD", factTypes, facts);
  }
  if (id === "HC-019") {
    return notVerifiable(id, "EXACT_HARDWARE_CONFIGURATION_UNVERIFIED_OR_NOT_HOMOLOGATED", factTypes, facts);
  }
  if (id === "HC-020") {
    return notVerifiable(id, "S905W_GXL_NOT_EVIDENCED_AND_MUST_NOT_BE_INFERRED", factTypes, facts);
  }
  return {
    id,
    status: "SATISFIED",
    reason: "VALIDATED_EVIDENCE_ACCEPTED",
    factTypes,
    evidenceReferences: evidenceForFacts(facts, factTypes),
  };
}

function assertSealedRecordIntegrity(record: DiscoveryRecord): asserts record is DiscoveryRecord & { readonly recordHash: string; readonly sealedAt: string } {
  if (
    record.lifecycleState !== "SEALED"
    || typeof record.recordHash !== "string"
    || record.recordHash.length === 0
    || typeof record.sealedAt !== "string"
  ) {
    throw new Error("compatibility evaluation requires a sealed discovery record");
  }
  if (record.schemaVersion !== HARDWARE_DISCOVERY_SCHEMA_VERSION) {
    throw new Error(`compatibility evaluation requires ${HARDWARE_DISCOVERY_SCHEMA_VERSION}`);
  }
  if (canonicalEvidenceRoot(record.facts) !== record.evidenceRoot) {
    throw new Error("compatibility evaluation rejected an invalid evidenceRoot");
  }
  if (canonicalRecordHash(record) !== record.recordHash) {
    throw new Error("compatibility evaluation rejected an invalid recordHash");
  }
}

export function evaluateHardwareCompatibility(
  record: DiscoveryRecord,
  evaluatedAt: string,
  evaluationId: string,
): CompatibilityEvaluationResult {
  assertSealedRecordIntegrity(record);
  assertIsoInstant(evaluatedAt, "evaluatedAt");
  if (evaluationId.trim().length === 0) throw new Error("evaluationId must not be empty");

  const facts = record.facts;
  const factIndex = indexFacts(record);
  const requirements: CompatibilityRequirementResult[] = [
    {
      id: "HC-004",
      status: "SATISFIED",
      reason: "EVALUATOR_DOES_NOT_AUTHORIZE_FROM_RAM_OR_STORAGE_ALONE",
      factTypes: ["memory.ram.total.physical", "storage.usable.physical"],
      evidenceReferences: evidenceForFacts(facts, ["memory.ram.total.physical", "storage.usable.physical"]),
    },
    {
      id: "HC-005",
      status: "SATISFIED",
      reason: "UNKNOWN_HARDWARE_BLOCKS_AUTOMATIC_PROVISIONING",
      factTypes: [],
      evidenceReferences: [],
    },
    ...Object.keys(REQUIRED_FACTS)
      .filter((id) => id !== "HC-004")
      .map((id) => evaluateRequirement(id, facts, factIndex, record)),
    {
      id: "HC-018",
      status: "SATISFIED",
      reason: "NO_PRODUCTION_PROMOTION_PERFORMED",
      factTypes: [],
      evidenceReferences: [],
    },
  ];

  return {
    evaluationId,
    discoveryId: record.discoveryId,
    recordHash: record.recordHash,
    evaluatedAt,
    evaluatorVersion: EVALUATOR_VERSION,
    state: "UNKNOWN",
    automaticProvisioning: "BLOCKED",
    reasons: [
      "EXACT_HARDWARE_CONFIGURATION_UNVERIFIED",
      "REQUIRED_CAPABILITIES_NOT_DISCOVERED",
      "PRODUCTION_HOMOLOGATION_NOT_EXECUTED",
      ...(record.targetIdentity.bindingState === "PROVISIONAL"
        ? ["TARGET_IDENTITY_PROVISIONAL"]
        : []),
      ...(record.facts.some((fact) => fact.observationKind === "DECLARED" || fact.observationKind === "INFERRED")
        ? ["DECLARED_OR_INFERRED_FACTS_CANNOT_AUTHORIZE_HARDWARE"]
        : []),
    ],
    requirements,
  };
}
