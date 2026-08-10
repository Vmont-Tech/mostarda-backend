import {
  createDiscoveryRecord,
  type DiscoveryFact,
  type DiscoveryRecord,
  type FactValidationState,
} from "./record.ts";
import { normalizeCapacity, normalizeOpaqueText, normalizeVersion } from "./normalization.ts";

const SCHEMA_VERSION = "hardware-discovery-schema-v1";
const COLLECTOR_VERSION = "edge-discovery-intake-v1";
const INITIAL_CONFIDENCE = 0.2;

export interface MxqInitialIntakeInput {
  readonly discoveryId: string;
  readonly startedAt: string;
  readonly capturedAt: string;
  readonly evidenceReference: string;
}

const MISSING_REQUIREMENTS = [
  "soc.model",
  "cpu.architecture.effective",
  "memory.ram.total.physical",
  "storage.usable.physical",
  "gpu.model",
  "vpu.model",
  "codecs.validation",
  "display.hdmi.probe",
  "network.ethernet.probe",
  "network.wifi.probe",
  "usb.probe",
  "boot.bootloader",
  "boot.mode",
  "storage.partitions",
  "recovery.validation",
  "security.secure_boot.state",
  "identity.edge_installation_id_capability",
  "identity.device_key_capability",
] as const;

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function fact(
  input: MxqInitialIntakeInput,
  factType: string,
  value: unknown,
  options: {
    readonly normalizedValue?: unknown;
    readonly validationState?: FactValidationState;
    readonly inference?: string;
  } = {},
): DiscoveryFact {
  const normalizedValue = options.normalizedValue;
  const base = {
    factId: `mxq-intake-${slug(factType)}`,
    factType,
    source: {
      kind: "HUMAN_DECLARATION",
      component: "device-ui-intake",
      version: "intake-v1",
      reference: input.evidenceReference,
      trustClass: "DECLARED" as const,
    },
    value,
    observedAt: null,
    collectedAt: input.capturedAt,
    evidence: {
      kind: "user-provided-observation",
      sourceReference: input.evidenceReference,
      integrityState: "UNVERIFIED" as const,
    },
    collectorVersion: COLLECTOR_VERSION,
    schemaVersion: SCHEMA_VERSION,
    targetIdentity: {
      bindingState: "PROVISIONAL" as const,
      reference: "mxq-pro-4k-5g-lab-001",
    },
    observationSequence: 0,
    confidence: INITIAL_CONFIDENCE,
    validationState: options.validationState ?? "UNVERIFIED",
    ...(normalizedValue === undefined ? {} : { normalizedValue }),
    ...(options.inference === undefined ? {} : { inference: options.inference }),
  } satisfies DiscoveryFact;
  return base;
}

export function createInitialMxqIntake(input: MxqInitialIntakeInput): DiscoveryRecord {
  const facts: DiscoveryFact[] = [
    fact(input, "device.commercial_model", "MXQ Pro 4K 5G", { normalizedValue: "MXQ Pro 4K 5G" }),
    fact(input, "board.identifier", "R329Q_V8.1", { normalizedValue: "R329Q_V8.1" }),
    fact(input, "board.observed_date", "2020.06.15", { normalizedValue: "2020.06.15" }),
    fact(input, "soc.family", "RK3228A/RK3229", { inference: "PROBABLE_NOT_VALIDATED" }),
    fact(input, "cpu.architecture", "ARM 32-bit", { inference: "PROBABLE_NOT_VALIDATED" }),
    fact(input, "software.os.name", "Android", { normalizedValue: "Android" }),
    fact(input, "software.device_model", "Nex30", { normalizedValue: "Nex30" }),
    fact(input, "software.os.version", "13.0", { normalizedValue: normalizeVersion("13.0") }),
    fact(input, "software.kernel.version", "3.10.104", { normalizedValue: normalizeVersion("3.10.104") }),
    fact(input, "software.build", "TV BOX eng.akrd2.20240222.161226", { normalizedValue: "TV BOX eng.akrd2.20240222.161226" }),
    fact(input, "memory.ram.total", "256 GB", { normalizedValue: normalizeCapacity("256 GB"), validationState: "UNRESOLVED" }),
    fact(input, "storage.nominal", "1024 GB", { normalizedValue: normalizeCapacity("1024 GB"), validationState: "UNRESOLVED" }),
    fact(input, "network.ethernet.present", true),
    fact(input, "network.wifi.present", true),
    fact(input, "network.wifi.chipset", "SV6256P", { normalizedValue: "SV6256P" }),
    fact(input, "usb.host_capability", true),
  ];

  return createDiscoveryRecord({
    discoveryId: input.discoveryId,
    targetIdentity: { bindingState: "PROVISIONAL", reference: "mxq-pro-4k-5g-lab-001" },
    schemaVersion: SCHEMA_VERSION,
    collectorVersion: COLLECTOR_VERSION,
    startedAt: input.startedAt,
    facts,
    missingRequirements: MISSING_REQUIREMENTS,
    evidenceRoot: "UNVERIFIED_INTAKE",
  });
}
