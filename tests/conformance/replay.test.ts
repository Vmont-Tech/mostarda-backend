import assert from "node:assert/strict";
import test from "node:test";

import {
  ReplayAborted,
  replay,
  type EventApplier,
} from "../../packages/kernel/src/replay.ts";
import type { EventEnvelope } from "../../packages/kernel/src/envelopes.ts";

type Counter = { readonly value: number };
type Incremented = { readonly amount: number };

const incremented: EventApplier<Counter, Incremented> = {
  eventType: "Incremented",
  schemaVersion: 1,
  apply: (state, event) => ({ value: state.value + event.amount }),
};

function event(
  revision: number,
  overrides: Partial<EventEnvelope<Incremented>> = {},
): EventEnvelope<Incremented> {
  return {
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
    ...overrides,
  };
}

test("replay reconstructs state from a contiguous authoritative stream", () => {
  const result = replay({
    initialState: { value: 0 },
    events: [event(0), event(1), event(2)],
    appliers: [incremented],
  });

  assert.deepEqual(result, {
    state: { value: 3 },
    revision: 2,
    appliedEventIds: ["event-0", "event-1", "event-2"],
  });
});

test("duplicate EventId aborts replay and discards partial state", () => {
  assert.throws(
    () =>
      replay({
        initialState: { value: 0 },
        events: [event(0), event(1, { eventId: "event-0" })],
        appliers: [incremented],
      }),
    (error) =>
      error instanceof ReplayAborted &&
      error.code === "DUPLICATE_EVENT" &&
      error.partialStateDiscarded,
  );
});

test("revision gap aborts replay", () => {
  assert.throws(
    () =>
      replay({
        initialState: { value: 0 },
        events: [event(0), event(2)],
        appliers: [incremented],
      }),
    (error) => error instanceof ReplayAborted && error.code === "REVISION_GAP",
  );
});

test("unknown Event schema aborts replay and discards partial state", () => {
  assert.throws(
    () =>
      replay({
        initialState: { value: 0 },
        events: [event(0), event(1, { schemaVersion: 2 })],
        appliers: [incremented],
      }),
    (error) =>
      error instanceof ReplayAborted &&
      error.code === "UNKNOWN_EVENT_SCHEMA" &&
      error.partialStateDiscarded,
  );
});
