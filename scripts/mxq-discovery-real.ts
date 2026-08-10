import { fileURLToPath } from "node:url";
import {
  createInitialMxqIntake,
  sealDiscoveryRecord,
  type DiscoveryRecord,
} from "../packages/edge-discovery/src/index.ts";
import {
  evaluateHardwareCompatibility,
  type CompatibilityEvaluationResult,
} from "../packages/edge-compatibility/src/index.ts";

export interface MxqEvidenceDiscoveryOptions {
  readonly discoveryId: string;
  readonly startedAt: string;
  readonly capturedAt: string;
  readonly sealedAt: string;
  readonly evaluatedAt: string;
  readonly evaluationId: string;
  readonly evidenceReference: string;
}

export interface MxqEvidenceDiscoveryResult {
  readonly discovery: DiscoveryRecord & { readonly recordHash: string; readonly sealedAt: string };
  readonly compatibility: CompatibilityEvaluationResult;
}

export function runMxqEvidenceDiscovery(options: MxqEvidenceDiscoveryOptions): MxqEvidenceDiscoveryResult {
  const intake = createInitialMxqIntake({
    discoveryId: options.discoveryId,
    startedAt: options.startedAt,
    capturedAt: options.capturedAt,
    evidenceReference: options.evidenceReference,
  });
  const discovery = sealDiscoveryRecord(intake, options.sealedAt);
  const compatibility = evaluateHardwareCompatibility(discovery, options.evaluatedAt, options.evaluationId);
  return { discovery, compatibility };
}

export function main(): void {
  const now = new Date().toISOString();
  const result = runMxqEvidenceDiscovery({
    discoveryId: `disc-mxq-real-${Date.now()}`,
    startedAt: now,
    capturedAt: now,
    sealedAt: now,
    evaluatedAt: now,
    evaluationId: `compat-mxq-real-${Date.now()}`,
    evidenceReference: "user-provided-images:mxq-system-and-network",
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
