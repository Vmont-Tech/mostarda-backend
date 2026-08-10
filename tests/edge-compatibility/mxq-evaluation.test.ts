import test from "node:test";
import assert from "node:assert/strict";
import { createInitialMxqIntake } from "../../packages/edge-discovery/src/intake.ts";
import { createDiscoveryRecord, sealDiscoveryRecord } from "../../packages/edge-discovery/src/record.ts";
import { evaluateHardwareCompatibility } from "../../packages/edge-compatibility/src/evaluator.ts";

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
