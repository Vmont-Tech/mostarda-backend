import test from "node:test";
import assert from "node:assert/strict";
import { createInitialMxqIntake } from "../../packages/edge-discovery/src/intake.ts";
import { sealDiscoveryRecord } from "../../packages/edge-discovery/src/record.ts";
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
  assert.ok(evaluation.requirements.some((requirement) => requirement.id === "HC-001" && requirement.status === "NOT_VERIFIABLE"));
  assert.ok(evaluation.requirements.some((requirement) => requirement.id === "HC-005" && requirement.status === "SATISFIED"));
  assert.ok(evaluation.reasons.includes("EXACT_HARDWARE_CONFIGURATION_UNVERIFIED"));
  assert.equal("hardwareProfile" in evaluation, false);
  assert.equal("installationProfile" in evaluation, false);
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
