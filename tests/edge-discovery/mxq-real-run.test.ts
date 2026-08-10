import test from "node:test";
import assert from "node:assert/strict";
import { runMxqEvidenceDiscovery } from "../../scripts/mxq-discovery-real.ts";

test("real MXQ evidence run produces a sealed record and compatibility result without device access", () => {
  const result = runMxqEvidenceDiscovery({
    discoveryId: "disc-mxq-real-002",
    startedAt: "2026-08-10T10:00:00.000Z",
    capturedAt: "2026-08-10T10:00:00.000Z",
    sealedAt: "2026-08-10T10:00:01.000Z",
    evaluatedAt: "2026-08-10T10:00:02.000Z",
    evaluationId: "compat-mxq-real-002",
    evidenceReference: "user-provided-images:mxq-system-and-network",
  });

  assert.equal(result.discovery.lifecycleState, "SEALED");
  assert.match(result.discovery.recordHash, /^[a-f0-9]{64}$/);
  assert.match(result.discovery.evidenceRoot, /^[a-f0-9]{64}$/);
  assert.equal(result.compatibility.state, "UNKNOWN");
  assert.equal(result.compatibility.automaticProvisioning, "BLOCKED");
  assert.equal(result.discovery.facts.find((fact) => fact.factType === "network.ethernet.ipv4")?.value, "192.168.0.106");
});
