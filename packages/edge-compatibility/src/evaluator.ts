import type { DiscoveryFact, DiscoveryRecord } from "../../edge-discovery/src/record.ts";

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

function indexFacts(record: DiscoveryRecord): ReadonlyMap<string, DiscoveryFact> {
  return new Map(record.facts.map((fact) => [fact.factType, fact]));
}

function evidenceForFacts(facts: readonly DiscoveryFact[], factTypes: readonly string[]): readonly string[] {
  return [...new Set(facts
    .filter((fact) => factTypes.includes(fact.factType))
    .map((fact) => fact.evidence.sourceReference)
    .filter((reference): reference is string => reference !== undefined))]
    .sort();
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

function evaluateRequirement(
  id: string,
  facts: readonly DiscoveryFact[],
  factIndex: ReadonlyMap<string, DiscoveryFact>,
): CompatibilityRequirementResult {
  const factTypes = REQUIRED_FACTS[id] ?? [];
  const missing = factTypes.filter((factType) => !factIndex.has(factType));
  if (missing.length > 0) {
    return notVerifiable(id, `MISSING_FACTS:${missing.join(",")}`, factTypes, facts);
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
  return notVerifiable(id, "REQUIRED_HOMOLOGATION_EVIDENCE_NOT_COLLECTED", factTypes, facts);
}

export function evaluateHardwareCompatibility(
  record: DiscoveryRecord,
  evaluatedAt: string,
  evaluationId: string,
): CompatibilityEvaluationResult {
  if (record.lifecycleState !== "SEALED" || typeof record.recordHash !== "string" || record.recordHash.length === 0 || typeof record.sealedAt !== "string") {
    throw new Error("compatibility evaluation requires a sealed discovery record");
  }
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
      .map((id) => evaluateRequirement(id, facts, factIndex)),
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
    ],
    requirements,
  };
}
