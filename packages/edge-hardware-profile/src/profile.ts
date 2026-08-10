import { createHash } from "node:crypto";
import {
  HARDWARE_DISCOVERY_SCHEMA_VERSION,
  canonicalEvidenceRoot,
  canonicalRecordHash,
  type DiscoveryFact,
  type DiscoveryRecord,
  type FactValidationState,
} from "../../edge-discovery/src/record.ts";

export const HARDWARE_PROFILE_SCHEMA_VERSION = "hardware-profile-schema-v1";
export const HARDWARE_PROFILE_FINGERPRINT_ALGORITHM_VERSION = "hardware-profile-fingerprint-v1";

export type HardwareProfileLifecycleState =
  | "CANDIDATE"
  | "EXPERIMENTAL"
  | "PRODUCTION"
  | "PREFERRED"
  | "DEPRECATED"
  | "BLOCKED";

export type ProfileCapabilityStatus = "UNKNOWN" | "VALIDATED";

export interface ProfileKnownObservation {
  readonly factId: string;
  readonly factType: string;
  readonly fact: DiscoveryFact;
}

export interface HardwareCapability {
  readonly status: ProfileCapabilityStatus;
  readonly value: unknown | null;
  readonly validationState: FactValidationState | "UNRESOLVED";
  readonly requiredFactTypes: readonly string[];
  readonly provenanceFactIds: readonly string[];
  readonly reason: string;
}

export interface HardwareIdentityObservation {
  readonly state: "KNOWN_OBSERVATION" | "UNKNOWN";
  readonly value: unknown | null;
  readonly normalizedValue?: unknown;
  readonly observationKind?: DiscoveryFact["observationKind"];
  readonly validationState: FactValidationState | "UNRESOLVED";
  readonly provenanceFactIds: readonly string[];
}

export interface HardwareProfile {
  readonly schemaVersion: string;
  readonly profileId: string;
  readonly profileVersion: string;
  readonly lifecycleState: HardwareProfileLifecycleState;
  readonly owner: "Mostarda Architecture";
  readonly operationalAuthorization: "BLOCKED";
  readonly hardwareIdentity: {
    readonly identityStatus: "PROVISIONAL" | "BOUND";
    readonly commercialModel: HardwareIdentityObservation;
    readonly architecture: HardwareIdentityObservation;
    readonly socVendor: HardwareIdentityObservation;
    readonly socFamily: HardwareIdentityObservation;
    readonly socModel: HardwareIdentityObservation;
    readonly socRevision: HardwareIdentityObservation;
    readonly boardIdentifier: HardwareIdentityObservation;
    readonly boardRevision: HardwareIdentityObservation;
    readonly fingerprint: {
      readonly algorithmVersion: string;
      readonly value: string;
      readonly inputFactIds: readonly string[];
      readonly validationState: "UNRESOLVED";
      readonly reason: string;
    };
  };
  readonly discoveryReference: {
    readonly discoveryId: string;
    readonly discoveryRecordHash: string;
    readonly discoverySchemaVersion: string;
    readonly collectorVersion: string;
    readonly evidenceRoot: string;
    readonly sealedAt: string;
    readonly targetIdentity: DiscoveryRecord["targetIdentity"];
  };
  readonly discoverySnapshot: DiscoveryRecord;
  readonly knownObservations: readonly ProfileKnownObservation[];
  readonly capabilitySet: Readonly<Record<string, HardwareCapability>>;
  readonly operationalLimits: Readonly<Record<string, HardwareCapability>>;
  readonly compatibilityReference: {
    readonly specification: "EDGE_HARDWARE_COMPATIBILITY.md";
    readonly evaluationState: "UNKNOWN";
    readonly automaticProvisioning: "BLOCKED";
    readonly discoveryRecordHash: string;
    readonly reason: string;
  };
  readonly homologation: {
    readonly status: "NOT_EXECUTED";
    readonly reason: string;
    readonly requiredEvidence: readonly string[];
  };
  readonly runtimeReferences: Readonly<Record<string, null>>;
  readonly installationProfileReferences: readonly never[];
  readonly knownIncompatibilities: readonly {
    readonly incompatibilityId: string;
    readonly condition: string;
    readonly severity: "BLOCKING";
    readonly blockedOperations: readonly ("INSTALLATION" | "PROVISIONING" | "OTA")[];
    readonly status: "ACTIVE";
  }[];
  readonly effectivePeriod: {
    readonly startsAt: null;
    readonly endsAt: null;
  };
  readonly integrity: {
    readonly profileHash: string;
    readonly hashAlgorithm: "SHA-256";
    readonly canonicalizationVersion: "canonical-json-v1";
    readonly signature: null;
    readonly signingKeyId: null;
    readonly signedAt: null;
    readonly verificationState: "UNSIGNED_CANDIDATE";
  };
  readonly auditMetadata: {
    readonly creationReason: string;
    readonly createdAt: string;
    readonly approvalState: "NOT_APPROVED";
    readonly sourceDiscoveryRecordHash: string;
  };
}

const IDENTITY_FACT_TYPES = {
  commercialModel: "device.commercial_model",
  architecture: "cpu.architecture",
  socFamily: "soc.family",
  boardIdentifier: "board.identifier",
} as const;

const CAPABILITY_FACT_TYPES: Readonly<Record<string, readonly string[]>> = {
  architecture: ["cpu.architecture.effective", "cpu.architecture"],
  soc: ["soc.model", "soc.family"],
  ram: ["memory.ram.total.physical", "memory.ram.total"],
  storage: ["storage.usable.physical", "storage.nominal"],
  gpu: ["gpu.model", "gpu.validation"],
  vpu: ["vpu.model", "vpu.validation"],
  codecs: ["codecs.validation"],
  display: ["display.validation"],
  ethernet: ["network.ethernet.present", "network.ethernet.validation"],
  wifi: ["network.wifi.present", "network.wifi.validation", "network.wifi.chipset"],
  usb: ["usb.host_capability", "usb.validation"],
  bootloader: ["boot.bootloader"],
  bootMode: ["boot.mode"],
  partitions: ["storage.partitions.validation"],
  recovery: ["recovery.validation"],
  secureBoot: ["security.secure_boot.state"],
  osRuntime: ["software.os.name", "software.runtime.validation"],
  deviceIdentity: ["identity.edge_installation_id_capability", "identity.device_key_capability"],
  thermal: ["thermal.validation"],
  playerWebEngine: ["player.web_engine.validation"],
  ota: ["ota.validation"],
  offlinePlayback: ["offline.playback.validation"],
  stability: ["stability.long_run.validation"],
};

const UNKNOWN_CAPABILITY_REASON = "NO_VALIDATED_VERIFIED_FACT";

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

function assertSealedDiscovery(record: DiscoveryRecord): asserts record is DiscoveryRecord & { readonly recordHash: string; readonly sealedAt: string } {
  if (record.lifecycleState !== "SEALED" || !record.recordHash || !record.sealedAt) {
    throw new Error("HardwareProfile requires a SEALED Discovery Record");
  }
  if (record.schemaVersion !== HARDWARE_DISCOVERY_SCHEMA_VERSION) {
    throw new Error(`HardwareProfile requires ${HARDWARE_DISCOVERY_SCHEMA_VERSION}`);
  }
  if (record.conflicts.length > 0) {
    throw new Error("HardwareProfile cannot be created from a Discovery with unresolved conflicts");
  }
  if (canonicalEvidenceRoot(record.facts) !== record.evidenceRoot) {
    throw new Error("HardwareProfile rejected an invalid Discovery evidenceRoot");
  }
  if (canonicalRecordHash(record) !== record.recordHash) {
    throw new Error("HardwareProfile rejected an invalid Discovery recordHash");
  }
}

function factValueKey(fact: DiscoveryFact): string {
  return JSON.stringify(canonicalize(fact.normalizedValue ?? fact.value));
}

function factsFor(record: DiscoveryRecord, factTypes: readonly string[]): readonly DiscoveryFact[] {
  return record.facts.filter((fact) => factTypes.includes(fact.factType));
}

function singleObservation(record: DiscoveryRecord, factType: string): HardwareIdentityObservation {
  const facts = factsFor(record, [factType]);
  const values = new Set(facts.map(factValueKey));
  if (values.size > 1) throw new Error(`HardwareProfile cannot resolve divergent observations for ${factType}`);
  const first = facts[0];
  if (!first) {
    return { state: "UNKNOWN", value: null, validationState: "UNRESOLVED", provenanceFactIds: [] };
  }
  return {
    state: "KNOWN_OBSERVATION",
    value: first.value,
    ...(first.normalizedValue === undefined ? {} : { normalizedValue: first.normalizedValue }),
    observationKind: first.observationKind,
    validationState: first.validationState,
    provenanceFactIds: facts.map((fact) => fact.factId).sort((left, right) => left.localeCompare(right)),
  };
}

function hasValidEvidence(fact: DiscoveryFact): boolean {
  return fact.observationKind === "VALIDATED"
    && fact.validationState === "VERIFIED"
    && fact.evidence.integrityState === "VALID"
    && typeof fact.evidence.digest === "string"
    && /^[a-f0-9]{64}$/i.test(fact.evidence.digest)
    && fact.evidence.digestScope !== undefined;
}

function capability(record: DiscoveryRecord, factTypes: readonly string[]): HardwareCapability {
  const facts = factsFor(record, factTypes);
  const valid = facts.filter(hasValidEvidence);
  const valueKeys = new Set(valid.map(factValueKey));
  if (valueKeys.size > 1) throw new Error(`HardwareProfile cannot resolve divergent validated observations for ${factTypes.join(",")}`);
  const selected = valid[0];
  return {
    status: selected ? "VALIDATED" : "UNKNOWN",
    value: selected ? selected.normalizedValue ?? selected.value : null,
    validationState: selected ? "VERIFIED" : "UNRESOLVED",
    requiredFactTypes: [...factTypes],
    provenanceFactIds: facts.map((fact) => fact.factId).sort((left, right) => left.localeCompare(right)),
    reason: selected ? "VALIDATED_VERIFIED_EVIDENCE" : UNKNOWN_CAPABILITY_REASON,
  };
}

function knownObservations(record: DiscoveryRecord): readonly ProfileKnownObservation[] {
  return [...record.facts]
    .sort((left, right) => left.factId.localeCompare(right.factId))
    .map((fact) => ({ factId: fact.factId, factType: fact.factType, fact }));
}

function profileWithoutHash(profile: HardwareProfile): Omit<HardwareProfile, "integrity"> & { integrity: Omit<HardwareProfile["integrity"], "profileHash"> & { profileHash: null } } {
  return {
    ...profile,
    integrity: { ...profile.integrity, profileHash: null },
  };
}

export function canonicalHardwareProfileHash(profile: HardwareProfile): string {
  return sha256(profileWithoutHash(profile));
}

function buildFingerprint(record: DiscoveryRecord): HardwareProfile["hardwareIdentity"]["fingerprint"] {
  const inputs = record.facts
    .filter((fact) => ["board.identifier", "cpu.architecture", "soc.family"].includes(fact.factType))
    .sort((left, right) => left.factId.localeCompare(right.factId));
  return {
    algorithmVersion: HARDWARE_PROFILE_FINGERPRINT_ALGORITHM_VERSION,
    value: sha256(inputs.map((fact) => ({
      factId: fact.factId,
      factType: fact.factType,
      normalizedValue: fact.normalizedValue ?? fact.value,
      observationKind: fact.observationKind,
      validationState: fact.validationState,
    }))),
    inputFactIds: inputs.map((fact) => fact.factId),
    validationState: "UNRESOLVED",
    reason: "IDENTITY_FACTS_NOT_VALIDATED",
  };
}

export function createHardwareProfileCandidate(record: DiscoveryRecord): HardwareProfile {
  assertSealedDiscovery(record);
  const profileId = `hp-candidate-${sha256({ discoveryId: record.discoveryId, recordHash: record.recordHash }).slice(0, 24)}`;
  const identityStatus = record.targetIdentity.bindingState;
  const profile: HardwareProfile = {
    schemaVersion: HARDWARE_PROFILE_SCHEMA_VERSION,
    profileId,
    profileVersion: "profile-v1",
    lifecycleState: "CANDIDATE",
    owner: "Mostarda Architecture",
    operationalAuthorization: "BLOCKED",
    hardwareIdentity: {
      identityStatus,
      commercialModel: singleObservation(record, IDENTITY_FACT_TYPES.commercialModel),
      architecture: singleObservation(record, IDENTITY_FACT_TYPES.architecture),
      socVendor: { state: "UNKNOWN", value: null, validationState: "UNRESOLVED", provenanceFactIds: [] },
      socFamily: singleObservation(record, IDENTITY_FACT_TYPES.socFamily),
      socModel: { state: "UNKNOWN", value: null, validationState: "UNRESOLVED", provenanceFactIds: [] },
      socRevision: { state: "UNKNOWN", value: null, validationState: "UNRESOLVED", provenanceFactIds: [] },
      boardIdentifier: singleObservation(record, IDENTITY_FACT_TYPES.boardIdentifier),
      boardRevision: { state: "UNKNOWN", value: null, validationState: "UNRESOLVED", provenanceFactIds: [] },
      fingerprint: buildFingerprint(record),
    },
    discoveryReference: {
      discoveryId: record.discoveryId,
      discoveryRecordHash: record.recordHash,
      discoverySchemaVersion: record.schemaVersion,
      collectorVersion: record.collectorVersion,
      evidenceRoot: record.evidenceRoot,
      sealedAt: record.sealedAt,
      targetIdentity: record.targetIdentity,
    },
    discoverySnapshot: record,
    knownObservations: knownObservations(record),
    capabilitySet: Object.fromEntries(Object.entries(CAPABILITY_FACT_TYPES).map(([key, factTypes]) => [key, capability(record, factTypes)])),
    operationalLimits: Object.fromEntries([
      "ram",
      "storage",
      "displayResolution",
      "thermalEnvelope",
      "networkReconnect",
      "playerResourceEnvelope",
    ].map((key) => [key, {
      status: "UNKNOWN",
      value: null,
      validationState: "UNRESOLVED",
      requiredFactTypes: [],
      provenanceFactIds: [],
      reason: "HOMOLOGATION_NOT_EXECUTED",
    }])),
    compatibilityReference: {
      specification: "EDGE_HARDWARE_COMPATIBILITY.md",
      evaluationState: "UNKNOWN",
      automaticProvisioning: "BLOCKED",
      discoveryRecordHash: record.recordHash,
      reason: "CANDIDATE_PROFILE_DOES_NOT_AUTHORIZE_COMPATIBILITY",
    },
    homologation: {
      status: "NOT_EXECUTED",
      reason: "CANDIDATE_DERIVED_FROM_DISCOVERY_ONLY",
      requiredEvidence: ["boot", "player", "offline", "ota", "recovery", "security", "thermal", "stability"],
    },
    runtimeReferences: Object.fromEntries([
      "edgeOs", "runtime", "player", "webEngine", "codecs", "boot", "recovery", "ota", "rollback",
    ].map((key) => [key, null])),
    installationProfileReferences: [],
    knownIncompatibilities: [
      {
        incompatibilityId: "CANDIDATE_IDENTITY_PROVISIONAL",
        condition: "targetIdentity.bindingState is PROVISIONAL",
        severity: "BLOCKING",
        blockedOperations: ["INSTALLATION", "PROVISIONING", "OTA"],
        status: "ACTIVE",
      },
      {
        incompatibilityId: "CANDIDATE_CAPABILITIES_UNRESOLVED",
        condition: "mandatory capabilities lack VALIDATED and VERIFIED evidence",
        severity: "BLOCKING",
        blockedOperations: ["INSTALLATION", "PROVISIONING"],
        status: "ACTIVE",
      },
    ],
    effectivePeriod: { startsAt: null, endsAt: null },
    integrity: {
      profileHash: "UNSEALED",
      hashAlgorithm: "SHA-256",
      canonicalizationVersion: "canonical-json-v1",
      signature: null,
      signingKeyId: null,
      signedAt: null,
      verificationState: "UNSIGNED_CANDIDATE",
    },
    auditMetadata: {
      creationReason: "FIRST_MXQ_CANDIDATE_FROM_SEALED_DISCOVERY",
      createdAt: record.sealedAt,
      approvalState: "NOT_APPROVED",
      sourceDiscoveryRecordHash: record.recordHash,
    },
  };
  const profileHash = canonicalHardwareProfileHash(profile);
  return deepFreeze({ ...profile, integrity: { ...profile.integrity, profileHash } });
}
