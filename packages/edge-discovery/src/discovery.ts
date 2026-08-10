import { createHash } from "node:crypto";
import {
  canonicalEvidenceRoot,
  createDiscoveryRecord,
  sealDiscoveryRecord,
  type DiscoveryConflict,
  type DiscoveryFact,
  type DiscoveryRecord,
} from "./record.ts";
import type { AndroidCollectionResult } from "./android-adb-collector.ts";

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
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
  const representation = fact.normalizedValue === undefined
    ? { kind: "RAW_VALUE", value: fact.value }
    : { kind: "NORMALIZED_VALUE", value: fact.normalizedValue };
  return JSON.stringify(canonicalize(representation));
}

function correlateFacts(facts: readonly DiscoveryFact[], createdAt: string): readonly DiscoveryConflict[] {
  const byType = new Map<string, DiscoveryFact[]>();
  for (const fact of facts) {
    const group = byType.get(fact.factType) ?? [];
    group.push(fact);
    byType.set(fact.factType, group);
  }

  const conflicts: DiscoveryConflict[] = [];
  for (const [factType, group] of [...byType.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const orderedFacts = [...group].sort((left, right) => left.factId.localeCompare(right.factId));
    if (orderedFacts.length < 2) continue;
    const valueKeys = new Set(orderedFacts.map(correlationValueKey));
    if (valueKeys.size < 2) continue;

    const observations = orderedFacts.map((fact) => ({
      factId: fact.factId,
      value: fact.value,
      ...(fact.normalizedValue === undefined ? {} : { normalizedValue: fact.normalizedValue }),
      sourceReference: fact.source.reference,
      ...(fact.evidence.sourceReference === undefined ? {} : { evidenceReference: fact.evidence.sourceReference }),
    }));
    const conflictDescriptor = JSON.stringify(canonicalize({ factType, observations }));
    const conflictId = `fact-correlation-${createHash("sha256").update(conflictDescriptor).digest("hex")}`;
    conflicts.push({
      conflictId,
      factType,
      observations,
      conflictKind: "VALUE_MISMATCH",
      deterministicResolution: "NO_SELECTION_ALL_OBSERVATIONS_PRESERVED",
      blockingScope: "FACT_TYPE",
      createdAt,
    });
  }
  return conflicts;
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
    conflicts: [...intake.conflicts, ...correlateFacts(facts, sealedAt)],
    missingRequirements,
    evidenceRoot: canonicalEvidenceRoot(facts),
  });
  return sealDiscoveryRecord(combined, sealedAt);
}
