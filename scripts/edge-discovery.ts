import { execFile as execFileCallback } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  collectAndroidFacts,
  composeAndSealDiscovery,
  createInitialMxqIntake,
  type AdbTransport,
  type AndroidCollectionContext,
  type DiscoveryRecord,
} from "../packages/edge-discovery/src/index.ts";

const execFile = promisify(execFileCallback);

export interface LaboratoryDiscoveryOptions extends Omit<AndroidCollectionContext, "collectedAt"> {
  readonly discoveryId: string;
  readonly startedAt: string;
  readonly capturedAt: string;
  readonly sealedAt: string;
}

export function createProcessAdbTransport(serial: string): AdbTransport {
  if (serial.trim().length === 0) throw new Error("ADB serial must not be empty");
  return {
    async exec(command) {
      try {
        const result = await execFile("adb", ["-s", serial, "shell", command], {
          encoding: "utf8",
          windowsHide: true,
        });
        return { stdout: result.stdout, stderr: result.stderr, exitCode: 0 };
      } catch (error) {
        const failure = error as { stdout?: string; stderr?: string; code?: number };
        return {
          stdout: failure.stdout ?? "",
          stderr: failure.stderr ?? "adb execution failed",
          exitCode: typeof failure.code === "number" ? failure.code : 1,
        };
      }
    },
  };
}

export async function runDiscoveryWithTransport(
  options: LaboratoryDiscoveryOptions,
  transport: AdbTransport,
): Promise<DiscoveryRecord & { readonly recordHash: string; readonly sealedAt: string }> {
  const intake = createInitialMxqIntake({
    discoveryId: options.discoveryId,
    startedAt: options.startedAt,
    capturedAt: options.capturedAt,
    evidenceReference: options.evidenceReference,
  });
  const collection = await collectAndroidFacts(transport, {
    collectedAt: options.capturedAt,
    targetReference: options.targetReference,
    evidenceReference: options.evidenceReference,
  });
  return composeAndSealDiscovery(intake, collection, options.sealedAt);
}

function argument(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

export function parseArguments(args: readonly string[]): { readonly serial: string; readonly evidenceReference: string } {
  const serial = argument(args, "--serial");
  if (serial === undefined || serial.trim().length === 0) {
    throw new Error("usage: node scripts/edge-discovery.ts --serial <adb-serial> [--evidence-reference <reference>]");
  }
  return {
    serial,
    evidenceReference: argument(args, "--evidence-reference") ?? `adb:${serial}`,
  };
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  const { serial, evidenceReference } = parseArguments(args);
  const startedAt = new Date().toISOString();
  const options = {
    discoveryId: `discovery-${serial.replace(/[^a-z0-9]+/gi, "-")}-${Date.now()}`,
    targetReference: serial,
    evidenceReference,
    startedAt,
    capturedAt: startedAt,
    sealedAt: new Date().toISOString(),
  } satisfies LaboratoryDiscoveryOptions;
  const record = await runDiscoveryWithTransport(options, createProcessAdbTransport(serial));
  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  });
}
