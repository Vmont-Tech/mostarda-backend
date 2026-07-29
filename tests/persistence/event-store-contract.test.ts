import assert from "node:assert/strict";
import test from "node:test";

import {
  ConcurrencyConflict,
  DuplicateEventConflict,
  InMemoryEventStore,
  type EventToAppend,
} from "../../packages/persistence/src/index.ts";

function proposed(id: string, type = "TestOccurred"): EventToAppend {
  return {
    eventId: id,
    eventType: type,
    schemaVersion: 1,
    occurredAt: "2026-07-29T12:00:00.000Z",
    producer: "ConformanceFixture",
    correlationId: "correlation-1",
    causationId: "command-1",
    payload: { fixture: true },
    metadata: {},
  };
}

test("initial append assigns contiguous revisions and matching outbox records", async () => {
  const store = new InMemoryEventStore();

  const appended = await store.append("stream-1", -1n, [
    proposed("event-1"),
    proposed("event-2"),
  ]);

  assert.deepEqual(appended.map((event) => event.aggregateRevision), [0n, 1n]);
  assert.deepEqual(
    (await store.read("stream-1")).map((event) => event.eventId),
    ["event-1", "event-2"],
  );
  assert.deepEqual(
    (await store.pendingOutbox()).map((record) => record.event.eventId),
    ["event-1", "event-2"],
  );
});

test("wrong ExpectedRevision appends neither Event nor outbox record", async () => {
  const store = new InMemoryEventStore();
  await store.append("stream-1", -1n, [proposed("event-1")]);

  await assert.rejects(
    store.append("stream-1", -1n, [proposed("event-2")]),
    (error) =>
      error instanceof ConcurrencyConflict &&
      error.expectedRevision === -1n &&
      error.actualRevision === 0n,
  );

  assert.equal((await store.read("stream-1")).length, 1);
  assert.equal((await store.pendingOutbox()).length, 1);
});

test("duplicate EventId makes a multi-event append fully atomic", async () => {
  const store = new InMemoryEventStore();
  await store.append("stream-1", -1n, [proposed("event-existing")]);

  await assert.rejects(
    store.append("stream-2", -1n, [
      proposed("event-new"),
      proposed("event-existing"),
    ]),
    (error) =>
      error instanceof DuplicateEventConflict &&
      error.eventId === "event-existing",
  );

  assert.deepEqual(await store.read("stream-2"), []);
  assert.equal((await store.pendingOutbox()).length, 1);
});

test("empty append is rejected instead of changing revision implicitly", async () => {
  const store = new InMemoryEventStore();
  await assert.rejects(store.append("stream-1", -1n, []), /at least one Event/);
});

test("authoritative history is detached from caller and reader mutations", async () => {
  const store = new InMemoryEventStore();
  const payload = { nested: { value: "original" } };
  const input = { ...proposed("event-1"), payload };
  await store.append("stream-1", -1n, [input]);

  payload.nested.value = "caller-mutated";
  const firstRead = await store.read("stream-1");
  (firstRead[0]?.payload as { nested: { value: string } }).nested.value =
    "reader-mutated";
  const secondRead = await store.read("stream-1");

  assert.deepEqual(secondRead[0]?.payload, {
    nested: { value: "original" },
  });
});
