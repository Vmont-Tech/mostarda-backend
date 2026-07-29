import assert from "node:assert/strict";
import test from "node:test";

import type { EventEnvelope } from "../../packages/kernel/src/envelopes.ts";
import {
  IncompatibleEventSchema,
  upcastEvent,
} from "../../packages/kernel/src/event-evolution.ts";

const original: EventEnvelope<unknown> = Object.freeze({
  eventId: "event-1",
  eventType: "FixtureChanged",
  schemaVersion: 1,
  streamId: "fixture-1",
  aggregateRevision: 0,
  occurredAt: "2026-07-29T12:00:00.000Z",
  producer: "Fixture",
  correlationId: "correlation-1",
  causationId: "command-1",
  payload: Object.freeze({ legacyName: "Mostarda" }),
});

test("explicit upcast chain preserves Event identity and original representation", () => {
  const result = upcastEvent({
    event: original,
    targetSchemaVersion: 3,
    upcasters: [
      {
        eventType: "FixtureChanged",
        from: 1,
        to: 2,
        upcast: (payload) => ({
          name: (payload as { legacyName: string }).legacyName,
        }),
      },
      {
        eventType: "FixtureChanged",
        from: 2,
        to: 3,
        upcast: (payload) => ({ ...payload as object, active: true }),
      },
    ],
  });

  assert.strictEqual(result.original, original);
  assert.equal(result.event.eventId, original.eventId);
  assert.equal(result.event.correlationId, original.correlationId);
  assert.equal(result.event.causationId, original.causationId);
  assert.equal(result.event.schemaVersion, 3);
  assert.deepEqual(result.event.payload, { name: "Mostarda", active: true });
  assert.deepEqual(original.payload, { legacyName: "Mostarda" });
});

test("missing intermediate upcaster aborts instead of jumping heuristically", () => {
  assert.throws(
    () =>
      upcastEvent({
        event: original,
        targetSchemaVersion: 3,
        upcasters: [
          {
            eventType: "FixtureChanged",
            from: 2,
            to: 3,
            upcast: (payload) => payload,
          },
        ],
      }),
    IncompatibleEventSchema,
  );
});

test("downgrade is prohibited", () => {
  assert.throws(
    () =>
      upcastEvent({
        event: { ...original, schemaVersion: 3 },
        targetSchemaVersion: 2,
        upcasters: [],
      }),
    /downgrade/i,
  );
});
