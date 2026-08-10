import test from "node:test";
import assert from "node:assert/strict";
import { createInitialMxqIntake } from "../../packages/edge-discovery/src/intake.ts";
import {
  canonicalEvidenceRoot,
  canonicalRecordHash,
  createDiscoveryRecord,
  sealDiscoveryRecord,
  type DiscoveryFact,
} from "../../packages/edge-discovery/src/record.ts";
import { evaluateHardwareCompatibility } from "../../packages/edge-compatibility/src/evaluator.ts";

function capabilityRecord(
  observationKind: "DECLARED" | "OBSERVED" | "INFERRED" | "VALIDATED",
  validationState: "VERIFIED" | "UNVERIFIED" = "UNVERIFIED",
  value = "u-boot",
  evidenceIntegrity?: "VALID" | "UNVERIFIED",
) {
  const intake = createInitialMxqIntake({
    discoveryId: `disc-capability-${observationKind.toLowerCase()}-${validationState.toLowerCase()}`,
    startedAt: "2026-08-10T11:00:00.000Z",
    capturedAt: "2026-08-10T11:00:00.000Z",
    evidenceReference: "test:capability",
  });
  const template = intake.facts[0];
  assert.ok(template);
  const fact = (factType: string, factValue: string): DiscoveryFact => ({
    factId: `fact-${factType.replaceAll(".", "-")}-${observationKind.toLowerCase()}`,
    factType,
    observationKind,
    value: factValue,
    normalizedValue: factValue,
    source: {
      ...template.source,
      trustClass: observationKind === "VALIDATED" ? "MEASURED" : template.source.trustClass,
    },
    evidence: {
      ...template.evidence,
      digest: "a".repeat(64),
      digestScope: "ORIGINAL_EVIDENCE_BYTES" as const,
      integrityState: evidenceIntegrity ?? (observationKind === "VALIDATED" && validationState === "VERIFIED"
        ? "VALID" as const
        : "UNVERIFIED" as const),
    },
    confidence: template.confidence,
    observedAt: template.observedAt,
    collectedAt: template.collectedAt,
    collectorVersion: template.collectorVersion,
    schemaVersion: template.schemaVersion,
    targetIdentity: template.targetIdentity,
    observationSequence: template.observationSequence,
    validationState,
    ...(observationKind === "INFERRED" ? { inference: "TEST_INFERENCE_NOT_VALIDATED" } : {}),
  });
  const bootloaderFact = fact("boot.bootloader", value);
  const bootModeFact = fact("boot.mode", "uefi");
  const record = createDiscoveryRecord({
    discoveryId: intake.discoveryId,
    targetIdentity: { bindingState: "BOUND", reference: "edge-test-001" },
    collectorVersion: "edge-compatibility-test-v1",
    startedAt: intake.startedAt,
    facts: [bootloaderFact, bootModeFact],
    missingRequirements: [],
  });
  return sealDiscoveryRecord(record, "2026-08-10T11:00:01.000Z");
}

function evaluate(record: ReturnType<typeof capabilityRecord>, evaluationId: string) {
  return evaluateHardwareCompatibility(record, "2026-08-10T11:00:02.000Z", evaluationId);
}

function requirement(result: ReturnType<typeof evaluate>, id: string) {
  const found = result.requirements.find((candidate) => candidate.id === id);
  assert.ok(found, `missing compatibility requirement ${id}`);
  return found;
}

test("sealed MXQ evidence is evaluated as UNKNOWN without creating a profile", () => {
  const intake = createInitialMxqIntake({
    discoveryId: "disc-mxq-real-001",
    startedAt: "2026-08-10T10:00:00.000Z",
    capturedAt: "2026-08-10T10:00:00.000Z",
    evidenceReference: "user-provided-images:mxq-system-and-network",
  });
  const discovery = sealDiscoveryRecord(intake, "2026-08-10T10:00:01.000Z");
  const evaluation = evaluateHardwareCompatibility(
    discovery,
    "2026-08-10T10:00:02.000Z",
    "compat-mxq-real-001",
  );

  assert.equal(evaluation.state, "UNKNOWN");
  assert.equal(evaluation.automaticProvisioning, "BLOCKED");
  assert.equal(discovery.targetIdentity.bindingState, "PROVISIONAL");
  assert.ok(discovery.facts.every((fact) => fact.observationKind !== "VALIDATED"));
  assert.equal(["PRODUCTION", "PREFERRED"].includes(evaluation.state), false);
  assert.ok(evaluation.requirements.some((requirement) => requirement.id === "HC-001" && requirement.status === "NOT_VERIFIABLE"));
  assert.ok(evaluation.requirements.some((requirement) => requirement.id === "HC-005" && requirement.status === "SATISFIED"));
  assert.ok(evaluation.reasons.includes("EXACT_HARDWARE_CONFIGURATION_UNVERIFIED"));
  assert.equal("hardwareProfile" in evaluation, false);
  assert.equal("installationProfile" in evaluation, false);
});

test("sealed declared and inferred facts cannot authorize production compatibility", () => {
  const intake = createInitialMxqIntake({
    discoveryId: "disc-mxq-declared-inferred-001",
    startedAt: "2026-08-10T10:10:00.000Z",
    capturedAt: "2026-08-10T10:10:00.000Z",
    evidenceReference: "user-provided-images:mxq-system-and-network",
  });
  const discovery = sealDiscoveryRecord(intake, "2026-08-10T10:10:01.000Z");
  const evaluation = evaluateHardwareCompatibility(
    discovery,
    "2026-08-10T10:10:02.000Z",
    "compat-mxq-declared-inferred-001",
  );

  assert.ok(discovery.facts.some((fact) => fact.observationKind === "DECLARED"));
  assert.ok(discovery.facts.some((fact) => fact.observationKind === "INFERRED"));
  assert.equal(evaluation.state === "PRODUCTION" || evaluation.state === "PREFERRED", false);
  assert.equal(evaluation.automaticProvisioning, "BLOCKED");
});

test("declared and inferred capability facts remain not verifiable after sealing", () => {
  const intake = createInitialMxqIntake({
    discoveryId: "disc-mxq-unvalidated-capabilities-001",
    startedAt: "2026-08-10T10:20:00.000Z",
    capturedAt: "2026-08-10T10:20:00.000Z",
    evidenceReference: "user-provided-images:mxq-system-and-network",
  });
  const declaredSource = intake.facts.find((fact) => fact.factType === "memory.ram.total");
  const inferredSource = intake.facts.find((fact) => fact.factType === "storage.nominal");
  assert.ok(declaredSource);
  assert.ok(inferredSource);
  const record = createDiscoveryRecord({
    discoveryId: "disc-mxq-unvalidated-capabilities-001",
    targetIdentity: intake.targetIdentity,
    collectorVersion: "edge-discovery-unvalidated-test-v1",
    startedAt: intake.startedAt,
    facts: [
      { ...declaredSource, factId: "declared-ram", factType: "memory.ram.total.physical", observationKind: "DECLARED" },
      {
        ...inferredSource,
        factId: "inferred-storage",
        factType: "storage.usable.physical",
        observationKind: "INFERRED",
        inference: "DECLARED_CAPACITY_NOT_PHYSICALLY_VALIDATED",
      },
    ],
    missingRequirements: [],
  });
  const sealed = sealDiscoveryRecord(record, "2026-08-10T10:20:01.000Z");
  const evaluation = evaluateHardwareCompatibility(
    sealed,
    "2026-08-10T10:20:02.000Z",
    "compat-mxq-unvalidated-capabilities-001",
  );

  assert.equal(evaluation.state, "UNKNOWN");
  assert.equal(evaluation.automaticProvisioning, "BLOCKED");
  assert.ok(evaluation.requirements.some((requirement) => (
    requirement.id === "HC-001"
      && requirement.reason === "FACTS_NOT_VALIDATED:memory.ram.total.physical"
  )));
  assert.ok(evaluation.requirements.some((requirement) => (
    requirement.id === "HC-002"
      && requirement.reason === "FACTS_NOT_VALIDATED:storage.usable.physical"
  )));
});

for (const observationKind of ["DECLARED", "OBSERVED", "INFERRED"] as const) {
  test(`${observationKind} never satisfies a mandatory capability requirement`, () => {
    const evaluation = evaluate(
      capabilityRecord(observationKind),
      `compat-${observationKind.toLowerCase()}-capability-001`,
    );
    const result = requirement(evaluation, "HC-007");

    assert.equal(result.status, "NOT_VERIFIABLE");
    assert.equal(result.reason, "FACTS_NOT_VALIDATED:boot.bootloader,boot.mode");
    assert.equal(evaluation.automaticProvisioning, "BLOCKED");
  });
}

test("VALIDATED with UNVERIFIED validation state never satisfies a capability requirement", () => {
  const sealed = capabilityRecord("VALIDATED", "VERIFIED");
  const manipulated = JSON.parse(JSON.stringify(sealed));
  manipulated.facts[0].validationState = "UNVERIFIED";
  manipulated.evidenceRoot = canonicalEvidenceRoot(manipulated.facts);
  manipulated.recordHash = canonicalRecordHash(manipulated);

  const evaluation = evaluateHardwareCompatibility(
    manipulated,
    "2026-08-10T11:00:02.000Z",
    "compat-validated-unverified-001",
  );
  const result = requirement(evaluation, "HC-007");

  assert.equal(result.status, "NOT_VERIFIABLE");
  assert.equal(result.reason, "FACTS_NOT_VALIDATED:boot.bootloader");
  assert.equal(evaluation.automaticProvisioning, "BLOCKED");
});

test("a deserialized record with stale integrity cannot enter compatibility evaluation", () => {
  const sealed = capabilityRecord("VALIDATED", "VERIFIED");
  const manipulated = JSON.parse(JSON.stringify(sealed));
  manipulated.facts[0].value = "tampered-bootloader";

  assert.throws(
    () => evaluateHardwareCompatibility(
      manipulated,
      "2026-08-10T11:00:02.000Z",
      "compat-tampered-record-001",
    ),
    /invalid recordHash/i,
  );
});

test("a legacy discovery schema is rejected instead of inferring observation provenance", () => {
  const sealed = capabilityRecord("VALIDATED", "VERIFIED");
  const legacy = JSON.parse(JSON.stringify(sealed));
  legacy.schemaVersion = "hardware-discovery-schema-v1";
  legacy.recordHash = canonicalRecordHash(legacy);

  assert.throws(
    () => evaluateHardwareCompatibility(
      legacy,
      "2026-08-10T11:00:02.000Z",
      "compat-legacy-schema-001",
    ),
    /requires hardware-discovery-schema-v2/i,
  );
});

test("VALIDATED and VERIFIED satisfies a capability requirement only with valid evidence", () => {
  const sealed = capabilityRecord("VALIDATED", "VERIFIED");
  const evaluation = evaluate(sealed, "compat-validated-verified-001");
  const result = requirement(evaluation, "HC-007");

  assert.equal(result.status, "SATISFIED");
  assert.equal(result.reason, "VALIDATED_EVIDENCE_ACCEPTED");
  assert.equal(evaluation.automaticProvisioning, "BLOCKED");
});

test("VALIDATED and VERIFIED with unverified evidence never satisfies a capability requirement", () => {
  const evaluation = evaluate(
    capabilityRecord("VALIDATED", "VERIFIED", "u-boot", "UNVERIFIED"),
    "compat-validated-unverified-evidence-001",
  );
  const result = requirement(evaluation, "HC-007");

  assert.equal(result.status, "NOT_VERIFIABLE");
  assert.equal(result.reason, "FACTS_NOT_VALIDATED:boot.bootloader,boot.mode");
  assert.equal(evaluation.automaticProvisioning, "BLOCKED");
});

test("an unresolved fact conflict cannot satisfy a mandatory capability requirement", () => {
  const first = capabilityRecord("VALIDATED", "VERIFIED", "u-boot");
  const firstBootloader = first.facts.find((fact) => fact.factType === "boot.bootloader");
  const firstBootMode = first.facts.find((fact) => fact.factType === "boot.mode");
  assert.ok(firstBootloader);
  assert.ok(firstBootMode);
  const secondFact = {
    ...firstBootloader,
    factId: "fact-boot-validated-conflicting",
    value: "fastboot",
    normalizedValue: "fastboot",
  };
  const conflicted = sealDiscoveryRecord(createDiscoveryRecord({
    discoveryId: "disc-capability-conflict-001",
    targetIdentity: first.targetIdentity,
    collectorVersion: first.collectorVersion,
    startedAt: first.startedAt,
    facts: [firstBootloader, firstBootMode, secondFact],
    conflicts: [{
      conflictId: "conflict-boot-001",
      factType: "boot.bootloader",
      observations: [
        {
          factId: firstBootloader.factId,
          value: firstBootloader.value,
          normalizedValue: firstBootloader.normalizedValue,
          sourceReference: firstBootloader.source.reference,
        },
        {
          factId: secondFact.factId,
          value: secondFact.value,
          normalizedValue: secondFact.normalizedValue,
          sourceReference: secondFact.source.reference,
        },
      ],
      conflictKind: "VALUE_MISMATCH",
      deterministicResolution: "NO_SELECTION_ALL_OBSERVATIONS_PRESERVED",
      blockingScope: "FACT_TYPE",
      createdAt: "2026-08-10T11:00:01.000Z",
    }],
    missingRequirements: [],
  }), "2026-08-10T11:00:01.000Z");
  const evaluation = evaluate(conflicted, "compat-conflicted-capability-001");
  const result = requirement(evaluation, "HC-007");

  assert.equal(result.status, "NOT_SATISFIED");
  assert.equal(result.reason, "CONFLICT_UNRESOLVED:boot.bootloader");
  assert.equal(evaluation.state, "UNKNOWN");
  assert.equal(evaluation.automaticProvisioning, "BLOCKED");
});

test("compatibility evaluation rejects an unsealed record", () => {
  const intake = createInitialMxqIntake({
    discoveryId: "disc-mxq-unsealed-001",
    startedAt: "2026-08-10T10:00:00.000Z",
    capturedAt: "2026-08-10T10:00:00.000Z",
    evidenceReference: "user-provided-images:mxq-system-and-network",
  });

  assert.throws(
    () => evaluateHardwareCompatibility(intake, "2026-08-10T10:00:02.000Z", "compat-mxq-unsealed-001"),
    /sealed/i,
  );
});
