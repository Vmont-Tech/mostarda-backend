import assert from "node:assert/strict";
import test from "node:test";

import type { EventEnvelope } from "../../packages/kernel/src/envelopes.ts";
import { type EventApplier } from "../../packages/kernel/src/replay.ts";
import { rehydrate } from "../../packages/kernel/src/snapshot.ts";

type Counter = { readonly value: number };
type Incremented = { readonly amount: number };

const applier: EventApplier<Counter, Incremented> = {
  eventType: "Incremented",
  schemaVersion: 1,
  apply: (state, payload) => ({ value: state.value + payload.amount }),
};

const events: EventEnvelope<Incremented>[] = [0, 1, 2].map((revision) => ({
  eventId: `event-${revision}`,
  eventType: "Incremented",
  schemaVersion: 1,
  streamId: "counter-1",
  aggregateRevision: revision,
  occurredAt: "2026-07-29T12:00:00.000Z",
  producer: "Counter",
  correlationId: "correlation-1",
  causationId: "command-1",
  payload: { amount: 1 },
}));

test("valid snapshot plus tail equals integral replay", () => {
  const integral = rehydrate({
    aggregateId: "counter-1",
    initialState: { value: 0 },
    events,
    appliers: [applier],
    snapshot: null,
    supportedSnapshotSchemas: [1],
    verifyIntegrity: () => false,
  });
  const accelerated = rehydrate({
    aggregateId: "counter-1",
    initialState: { value: 0 },
    events,
    appliers: [applier],
    snapshot: {
      aggregateId: "counter-1",
      sourceRevision: 1,
      schemaVersion: 1,
      integrity: "sha256:valid",
      state: { value: 2 },
    },
    supportedSnapshotSchemas: [1],
    verifyIntegrity: () => true,
  });

  assert.deepEqual(accelerated.result.state, integral.result.state);
  assert.equal(accelerated.result.revision, integral.result.revision);
  assert.equal(accelerated.usedSnapshot, true);
});

test("corrupted or incompatible snapshot falls back to authoritative Events", () => {
  for (const schemaVersion of [1, 99]) {
    const restored = rehydrate({
      aggregateId: "counter-1",
      initialState: { value: 0 },
      events,
      appliers: [applier],
      snapshot: {
        aggregateId: "counter-1",
        sourceRevision: 1,
        schemaVersion,
        integrity: "sha256:invalid",
        state: { value: 999 },
      },
      supportedSnapshotSchemas: [1],
      verifyIntegrity: () => false,
    });

    assert.equal(restored.usedSnapshot, false);
    assert.deepEqual(restored.result.state, { value: 3 });
  }
});
