import test from "node:test";
import assert from "node:assert/strict";
import {
  createDiscoveryRecord,
  sealDiscoveryRecord,
} from "../../packages/edge-discovery/src/record.ts";

test("record preserves partial observations and seals with missing requirements", () => {
  const record = createDiscoveryRecord({
    discoveryId: "disc-mxq-001",
    targetIdentity: { bindingState: "PROVISIONAL", reference: "mxq-lab-001" },
    collectorVersion: "edge-discovery-lab-v1",
    startedAt: "2026-08-09T11:59:00.000Z",
    facts: [],
    missingRequirements: ["soc.model", "memory.ram.total"],
  });

  const sealed = sealDiscoveryRecord(record, "2026-08-09T12:00:00.000Z");

  assert.equal(sealed.lifecycleState, "SEALED");
  assert.deepEqual(sealed.missingRequirements, ["memory.ram.total", "soc.model"]);
  assert.match(sealed.recordHash, /^[a-f0-9]{64}$/);
});

test("sealed records are immutable snapshots", () => {
  const record = createDiscoveryRecord({
    discoveryId: "disc-mxq-002",
    targetIdentity: { bindingState: "PROVISIONAL", reference: "mxq-lab-001" },
    collectorVersion: "edge-discovery-lab-v1",
    startedAt: "2026-08-09T11:59:00.000Z",
    facts: [],
    missingRequirements: [],
  });

  const sealed = sealDiscoveryRecord(record, "2026-08-09T12:00:00.000Z");

  assert.throws(() => Reflect.apply(Array.prototype.push, sealed.facts, [{}]), /immutable|read only|not extensible/i);
});
