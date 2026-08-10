import { createHash } from "node:crypto";
import {
  HARDWARE_DISCOVERY_SCHEMA_VERSION,
  createDiscoveryRecord,
  type DiscoveryFact,
  type DiscoveryRecord,
  type FactValidationState,
} from "./record.ts";
import { normalizeCapacity, normalizeOpaqueText, normalizeVersion } from "./normalization.ts";

const SCHEMA_VERSION = HARDWARE_DISCOVERY_SCHEMA_VERSION;
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
  "player.web_engine.validation",
  "ota.validation",
  "thermal.validation",
  "offline.playback.validation",
  "ota.rollback.validation",
  "stability.long_run.validation",
  "hardware.profile.lifecycle",
] as const;

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function digestDeclaredObservation(
  input: MxqInitialIntakeInput,
  factType: string,
  value: unknown,
): string {
  return createHash("sha256")
    .update(JSON.stringify({
      sourceReference: input.evidenceReference,
      capturedAt: input.capturedAt,
      factType,
      value,
    }))
    .digest("hex");
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
    observationKind: options.inference === undefined ? "DECLARED" : "INFERRED",
    source: {
      kind: "USER_PROVIDED_EVIDENCE",
      component: "mxq-system-and-network-screenshots",
      version: "intake-v1",
      reference: input.evidenceReference,
      trustClass: "DECLARED" as const,
    },
    value,
    observedAt: null,
    collectedAt: input.capturedAt,
    evidence: {
      kind: "user-provided-image-observation",
      digest: digestDeclaredObservation(input, factType, value),
      digestScope: "DECLARATION_ENVELOPE" as const,
      sourceReference: input.evidenceReference,
      captureMethod: "user-provided-system-and-network-images",
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
    fact(input, "software.android.security_patch", "2022-04-05", { normalizedValue: normalizeVersion("2022-04-05") }),
    fact(input, "software.kernel.version", "3.10.104", { normalizedValue: normalizeVersion("3.10.104") }),
    fact(input, "software.kernel.build", "akrd2@R740XD #1", { normalizedValue: "akrd2@R740XD #1" }),
    fact(input, "software.kernel.build_date", "Thu Feb 22 16:10:31 CST 2024", { normalizedValue: "Thu Feb 22 16:10:31 CST 2024" }),
    fact(input, "software.build", "TV BOX eng.akrd2.20240222.161226", { normalizedValue: "TV BOX eng.akrd2.20240222.161226" }),
    fact(input, "memory.ram.total", "256 GB", { normalizedValue: normalizeCapacity("256 GB"), validationState: "UNRESOLVED" }),
    fact(input, "storage.nominal", "1024 GB", { normalizedValue: normalizeCapacity("1024 GB"), validationState: "UNRESOLVED" }),
    fact(input, "network.ethernet.present", true),
    fact(input, "network.ethernet.ipv4", "192.168.0.106", { normalizedValue: "192.168.0.106" }),
    fact(input, "network.ethernet.mac", "9c:00:d3:40:e1:3c", { normalizedValue: "9c:00:d3:40:e1:3c" }),
    fact(input, "network.ethernet.ip_mode", "DHCP", { normalizedValue: "DHCP" }),
    fact(input, "network.ethernet.gateway", "192.168.0.1", { normalizedValue: "192.168.0.1" }),
    fact(input, "network.wifi.present", true),
    fact(input, "network.wifi.chipset", "SV6256P", { normalizedValue: "SV6256P" }),
    fact(input, "usb.host_capability", true),
    fact(input, "device.serial", "unknown", { validationState: "UNRESOLVED" }),
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
