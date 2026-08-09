import {
  createDiscoveryRecord,
  sealDiscoveryRecord,
  type DiscoveryRecord,
} from "./record.ts";
import type { AndroidCollectionResult } from "./android-adb-collector.ts";

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function composeAndSealDiscovery(
  intake: DiscoveryRecord,
  collection: AndroidCollectionResult,
  sealedAt: string,
): DiscoveryRecord & { readonly recordHash: string; readonly sealedAt: string } {
  const facts = [...intake.facts, ...collection.facts];
  const observedTypes = new Set(facts.map((fact) => fact.factType));
  const missingRequirements = uniqueSorted(
    [...intake.missingRequirements, ...collection.missingRequirements]
      .filter((requirement) => !observedTypes.has(requirement)),
  );
  const combined = createDiscoveryRecord({
    discoveryId: intake.discoveryId,
    targetIdentity: intake.targetIdentity,
    schemaVersion: intake.schemaVersion,
    collectorVersion: "edge-discovery-composed-v1",
    startedAt: intake.startedAt,
    facts,
    conflicts: intake.conflicts,
    missingRequirements,
    evidenceRoot: "COMPOSITE_UNVERIFIED",
  });
  return sealDiscoveryRecord(combined, sealedAt);
}
