import { createHash } from "node:crypto";
import type { DiscoveryFact } from "./record.ts";

export interface AdbResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

export interface AdbTransport {
  exec(command: string): Promise<AdbResult>;
}

export interface AndroidCollectionContext {
  readonly collectedAt: string;
  readonly targetReference: string;
  readonly evidenceReference: string;
}

export type DiscoveryFailureCode =
  | "COLLECTOR_UNAVAILABLE"
  | "SOURCE_UNREADABLE"
  | "REQUIRED_FACT_MISSING";

export interface DiscoveryCollectionFailure {
  readonly code: DiscoveryFailureCode;
  readonly command: string;
  readonly detail: string;
}

export interface AndroidCollectionResult {
  readonly facts: readonly DiscoveryFact[];
  readonly missingRequirements: readonly string[];
  readonly failures: readonly DiscoveryCollectionFailure[];
}

export const READ_ONLY_ANDROID_COMMANDS: ReadonlySet<string> = new Set([
  "getprop ro.product.model",
  "getprop ro.build.version.release",
  "getprop ro.board.platform",
  "getprop ro.hardware",
  "getprop ro.build.version.incremental",
  "getprop ro.boot.bootloader",
  "getprop ro.bootmode",
  "getprop ro.boot.verifiedbootstate",
  "getprop ro.boot.secureboot",
  "getprop ro.product.cpu.abilist",
  "cat /proc/cpuinfo",
  "cat /proc/meminfo",
  "df",
  "cat /proc/partitions",
  "dumpsys display",
  "dumpsys media.extractor",
  "ip link",
  "iw dev",
  "cat /proc/bus/usb/devices",
]);

const COMMAND_REQUIREMENT = new Map<string, string>([
  ["getprop ro.product.model", "software.device_model"],
  ["getprop ro.build.version.release", "software.os.version"],
  ["getprop ro.board.platform", "soc.model"],
  ["getprop ro.hardware", "board.device_tree_identity"],
  ["getprop ro.build.version.incremental", "software.build"],
  ["getprop ro.boot.bootloader", "boot.bootloader"],
  ["getprop ro.bootmode", "boot.mode"],
  ["getprop ro.boot.verifiedbootstate", "security.secure_boot.state"],
  ["getprop ro.boot.secureboot", "security.secure_boot.mode"],
  ["getprop ro.product.cpu.abilist", "cpu.architecture.effective"],
  ["cat /proc/cpuinfo", "cpu.architecture.effective"],
  ["cat /proc/meminfo", "memory.ram.total.physical"],
  ["df", "storage.usable.physical"],
  ["cat /proc/partitions", "storage.partitions"],
  ["dumpsys display", "display.hdmi.probe"],
  ["dumpsys media.extractor", "codecs.validation"],
  ["ip link", "network.ethernet.probe"],
  ["iw dev", "network.wifi.probe"],
  ["cat /proc/bus/usb/devices", "usb.probe"],
]);

const COLLECTOR_VERSION = "edge-discovery-adb-v1";
const SCHEMA_VERSION = "hardware-discovery-schema-v1";

export function assertReadOnlyAndroidCommand(command: string): void {
  if (!READ_ONLY_ANDROID_COMMANDS.has(command)) {
    throw new Error(`command is not allow-listed for read-only discovery: ${command}`);
  }
}

function normalizeOutput(command: string, output: string): unknown {
  const trimmed = output.trim();
  if (command === "cat /proc/meminfo") {
    const match = /^MemTotal:\s+(\d+)\s+kB$/m.exec(trimmed);
    if (match?.[1] !== undefined) return Number(match[1]) * 1024;
  }
  if (command === "cat /proc/cpuinfo") {
    if (/ARMv?7|armv?7|arm32/i.test(trimmed)) return "arm32";
    if (/aarch64|ARMv?8/i.test(trimmed)) return "arm64";
  }
  if (command === "getprop ro.product.cpu.abilist") {
    if (/armeabi-v7a/i.test(trimmed)) return "arm32";
    if (/arm64-v8a/i.test(trimmed)) return "arm64";
  }
  return trimmed;
}

function digestAdbResult(command: string, result: AdbResult): string {
  return createHash("sha256")
    .update(JSON.stringify({
      command,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    }))
    .digest("hex");
}

function makeFact(
  context: AndroidCollectionContext,
  command: string,
  result: AdbResult,
): DiscoveryFact {
  const factType = COMMAND_REQUIREMENT.get(command) ?? `android.command.${command}`;
  const value = result.stdout;
  const normalizedValue = normalizeOutput(command, value);
  const commandId = command.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  return {
    factId: `adb-${commandId}-${factType.replace(/[^a-z0-9]+/gi, "-")}`,
    factType,
    observationKind: "OBSERVED",
    source: {
      kind: "RUNTIME_SOURCE",
      component: "android-adb",
      version: COLLECTOR_VERSION,
      reference: context.evidenceReference,
      trustClass: "SYSTEM_REPORTED",
    },
    value: value.trim(),
    ...(normalizedValue === "" ? {} : { normalizedValue }),
    confidence: 0.4,
    observedAt: null,
    collectedAt: context.collectedAt,
    evidence: {
      kind: "adb-command-output",
      digest: digestAdbResult(command, result),
      digestScope: "ADB_COMMAND_RESULT" as const,
      sourceReference: context.evidenceReference,
      captureMethod: command,
      integrityState: "UNVERIFIED",
    },
    collectorVersion: COLLECTOR_VERSION,
    schemaVersion: SCHEMA_VERSION,
    targetIdentity: {
      bindingState: "PROVISIONAL",
      reference: context.targetReference,
    },
    observationSequence: 0,
    validationState: "UNVERIFIED",
  };
}

export async function collectAndroidFacts(
  transport: AdbTransport,
  context: AndroidCollectionContext,
): Promise<AndroidCollectionResult> {
  const facts: DiscoveryFact[] = [];
  const failures: DiscoveryCollectionFailure[] = [];
  const missing = new Set(COMMAND_REQUIREMENT.values());

  for (const command of READ_ONLY_ANDROID_COMMANDS) {
    assertReadOnlyAndroidCommand(command);
    const requirement = COMMAND_REQUIREMENT.get(command) ?? `android.command.${command}`;
    try {
      const result = await transport.exec(command);
      if (result.exitCode !== 0) {
        failures.push({
          code: "SOURCE_UNREADABLE",
          command,
          detail: result.stderr.trim() || `exit code ${result.exitCode}`,
        });
        continue;
      }
      if (result.stdout.trim().length === 0) {
        failures.push({ code: "REQUIRED_FACT_MISSING", command, detail: requirement });
        continue;
      }
      facts.push(makeFact(context, command, result));
      missing.delete(requirement);
    } catch (error) {
      failures.push({
        code: "COLLECTOR_UNAVAILABLE",
        command,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    facts: facts.sort((left, right) => left.factType.localeCompare(right.factType)),
    missingRequirements: [...missing].sort((left, right) => left.localeCompare(right)),
    failures,
  };
}
