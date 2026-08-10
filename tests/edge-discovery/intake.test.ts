import test from "node:test";
import assert from "node:assert/strict";
import { createInitialMxqIntake } from "../../packages/edge-discovery/src/intake.ts";

test("initial MXQ intake preserves observations and flags unverified capacities", () => {
  const record = createInitialMxqIntake({
    discoveryId: "disc-mxq-intake-001",
    startedAt: "2026-08-09T12:00:00.000Z",
    capturedAt: "2026-08-09T12:00:01.000Z",
    evidenceReference: "lab-intake:mxq-pro-001",
  });

  const byType = new Map(record.facts.map((fact) => [fact.factType, fact]));

  assert.equal(byType.get("device.commercial_model")?.value, "MXQ Pro 4K 5G");
  assert.equal(byType.get("board.identifier")?.value, "R329Q_V8.1");
  assert.equal(byType.get("software.os.version")?.normalizedValue, "13.0");
  assert.equal(byType.get("software.android.security_patch")?.value, "2022-04-05");
  assert.equal(byType.get("software.kernel.build")?.value, "akrd2@R740XD #1");
  assert.equal(byType.get("network.ethernet.ipv4")?.normalizedValue, "192.168.0.106");
  assert.equal(byType.get("network.ethernet.mac")?.normalizedValue, "9c:00:d3:40:e1:3c");
  assert.equal(byType.get("device.serial")?.validationState, "UNRESOLVED");
  assert.equal(byType.get("device.serial")?.value, "unknown");
  assert.ok(record.facts.every((fact) => fact.observedAt === null));
  assert.ok(record.facts.every((fact) => /^[a-f0-9]{64}$/.test(fact.evidence.digest ?? "")));
  assert.equal(byType.get("soc.family")?.inference, "PROBABLE_NOT_VALIDATED");
  assert.equal(byType.get("memory.ram.total")?.value, "256 GB");
  assert.equal(byType.get("memory.ram.total")?.normalizedValue, undefined);
  assert.equal(byType.get("memory.ram.total")?.validationState, "UNRESOLVED");
  assert.equal(byType.get("storage.nominal")?.value, "1024 GB");
  assert.equal(byType.get("storage.nominal")?.normalizedValue, undefined);
  assert.equal(byType.get("storage.nominal")?.evidence.integrityState, "UNVERIFIED");
  assert.equal(record.lifecycleState, "PARTIAL");
  assert.ok(record.missingRequirements.includes("memory.ram.total.physical"));
  assert.ok(record.missingRequirements.includes("soc.model"));
});
