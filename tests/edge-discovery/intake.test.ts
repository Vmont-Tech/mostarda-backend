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
