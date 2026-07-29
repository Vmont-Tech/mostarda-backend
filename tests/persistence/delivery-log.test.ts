import assert from "node:assert/strict";
import test from "node:test";

import {
  IdempotencyPayloadConflict,
  InMemoryDeliveryLog,
  InMemoryEventStore,
  type EventToAppend,
} from "../../packages/persistence/src/index.ts";

const event: EventToAppend = {
  eventId: "event-1",
  eventType: "TestOccurred",
  schemaVersion: 1,
  occurredAt: "2026-07-29T12:00:00.000Z",
  producer: "Fixture",
  correlationId: "correlation-1",
  causationId: "command-1",
  payload: { fixture: true },
  metadata: {},
};

test("unconfirmed publication remains pending with the original EventId", async () => {
  const store = new InMemoryEventStore();
  await store.append("stream-1", -1, [event]);

  const firstDelivery = await store.pendingOutbox();
  const redelivery = await store.pendingOutbox();

  assert.equal(firstDelivery[0]?.event.eventId, "event-1");
  assert.equal(redelivery[0]?.event.eventId, "event-1");
});

test("broker confirmation removes only the confirmed Event from pending delivery", async () => {
  const store = new InMemoryEventStore();
  await store.append("stream-1", -1, [event]);

  await store.confirmPublished("event-1", "2026-07-29T12:01:00.000Z");

  assert.deepEqual(await store.pendingOutbox(), []);
});

test("duplicate broker confirmation is idempotent and preserves first confirmation", async () => {
  const store = new InMemoryEventStore();
  await store.append("stream-1", -1, [event]);

  await store.confirmPublished("event-1", "2026-07-29T12:01:00.000Z");
  await store.confirmPublished("event-1", "2026-07-29T12:09:00.000Z");

  assert.equal(
    (await store.allOutbox())[0]?.publishedAt,
    "2026-07-29T12:01:00.000Z",
  );
});

test("consumer duplicate returns its original effect result", async () => {
  const inbox = new InMemoryDeliveryLog();
  const original = await inbox.recordConsumption({
    consumer: "projection-a",
    eventId: "event-1",
    payloadDigest: "sha256:abc",
    result: { checkpoint: 10 },
    consumedAt: "2026-07-29T12:01:00.000Z",
  });
  const duplicate = await inbox.recordConsumption({
    consumer: "projection-a",
    eventId: "event-1",
    payloadDigest: "sha256:abc",
    result: { checkpoint: 999 },
    consumedAt: "2026-07-29T12:02:00.000Z",
  });

  assert.equal(original.status, "Applied");
  assert.deepEqual(duplicate, {
    status: "Duplicate",
    originalResult: { checkpoint: 10 },
    originallyConsumedAt: "2026-07-29T12:01:00.000Z",
  });
});

test("same consumer and EventId with divergent content is a conflict", async () => {
  const inbox = new InMemoryDeliveryLog();
  await inbox.recordConsumption({
    consumer: "projection-a",
    eventId: "event-1",
    payloadDigest: "sha256:abc",
    result: { checkpoint: 10 },
    consumedAt: "2026-07-29T12:01:00.000Z",
  });

  await assert.rejects(
    inbox.recordConsumption({
      consumer: "projection-a",
      eventId: "event-1",
      payloadDigest: "sha256:different",
      result: { checkpoint: 11 },
      consumedAt: "2026-07-29T12:02:00.000Z",
    }),
    IdempotencyPayloadConflict,
  );
});
