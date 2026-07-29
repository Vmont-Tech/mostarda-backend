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
  await store.append("stream-1", -1n, [event]);

  const firstDelivery = await store.pendingOutbox();
  const redelivery = await store.pendingOutbox();

  assert.equal(firstDelivery[0]?.event.eventId, "event-1");
  assert.equal(redelivery[0]?.event.eventId, "event-1");
});

test("broker confirmation removes only the confirmed Event from pending delivery", async () => {
  const store = new InMemoryEventStore();
  await store.append("stream-1", -1n, [event]);
  await store.claimOutbox({
    limit: 1,
    owner: "publisher-1",
    token: "lease-1",
    now: "2026-07-29T12:00:00.000Z",
    leaseUntil: "2026-07-29T12:01:00.000Z",
  });

  await store.confirmPublished(
    "event-1",
    "lease-1",
    "2026-07-29T12:01:00.000Z",
  );

  assert.deepEqual(await store.pendingOutbox(), []);
});

test("duplicate broker confirmation is idempotent and preserves first confirmation", async () => {
  const store = new InMemoryEventStore();
  await store.append("stream-1", -1n, [event]);
  await store.claimOutbox({
    limit: 1,
    owner: "publisher-1",
    token: "lease-1",
    now: "2026-07-29T12:00:00.000Z",
    leaseUntil: "2026-07-29T12:01:00.000Z",
  });

  await store.confirmPublished("event-1", "lease-1", "2026-07-29T12:01:00.000Z");
  await store.confirmPublished("event-1", "lease-1", "2026-07-29T12:09:00.000Z");

  assert.equal(
    (await store.allOutbox())[0]?.publishedAt,
    "2026-07-29T12:01:00.000Z",
  );
});

test("expired outbox lease is recoverable by another publisher", async () => {
  const store = new InMemoryEventStore();
  await store.append("stream-1", -1n, [event]);
  const first = await store.claimOutbox({
    limit: 1,
    owner: "publisher-1",
    token: "lease-1",
    now: "2026-07-29T12:00:00.000Z",
    leaseUntil: "2026-07-29T12:01:00.000Z",
  });
  const concurrent = await store.claimOutbox({
    limit: 1,
    owner: "publisher-2",
    token: "lease-2",
    now: "2026-07-29T12:00:30.000Z",
    leaseUntil: "2026-07-29T12:02:00.000Z",
  });
  const recovered = await store.claimOutbox({
    limit: 1,
    owner: "publisher-2",
    token: "lease-2",
    now: "2026-07-29T12:01:01.000Z",
    leaseUntil: "2026-07-29T12:02:00.000Z",
  });

  assert.equal(first[0]?.event.eventId, "event-1");
  assert.deepEqual(concurrent, []);
  assert.equal(recovered[0]?.event.eventId, "event-1");
  assert.equal(recovered[0]?.publicationAttempts, 2);
});

test("consumer duplicate returns its original effect result", async () => {
  const inbox = new InMemoryDeliveryLog();
  let effects = 0;
  const original = await inbox.consumeAtomically({
    consumer: "projection-a",
    eventId: "event-1",
    payloadDigest: "sha256:abc",
    consumedAt: "2026-07-29T12:01:00.000Z",
  }, async () => {
    effects += 1;
    return { checkpoint: 10 };
  });
  const duplicate = await inbox.consumeAtomically({
    consumer: "projection-a",
    eventId: "event-1",
    payloadDigest: "sha256:abc",
    consumedAt: "2026-07-29T12:02:00.000Z",
  }, async () => {
    effects += 1;
    return { checkpoint: 999 };
  });

  assert.equal(original.status, "Applied");
  assert.deepEqual(duplicate, {
    status: "Duplicate",
    originalResult: { checkpoint: 10 },
    originallyConsumedAt: "2026-07-29T12:01:00.000Z",
  });
  assert.equal(effects, 1);
});

test("same consumer and EventId with divergent content is a conflict", async () => {
  const inbox = new InMemoryDeliveryLog();
  await inbox.consumeAtomically({
    consumer: "projection-a",
    eventId: "event-1",
    payloadDigest: "sha256:abc",
    consumedAt: "2026-07-29T12:01:00.000Z",
  }, async () => ({ checkpoint: 10 }));

  await assert.rejects(
    inbox.consumeAtomically({
      consumer: "projection-a",
      eventId: "event-1",
      payloadDigest: "sha256:different",
      consumedAt: "2026-07-29T12:02:00.000Z",
    }, async () => ({ checkpoint: 11 })),
    IdempotencyPayloadConflict,
  );
});

test("failed consumer effect does not create an inbox receipt", async () => {
  const inbox = new InMemoryDeliveryLog();
  const delivery = {
    consumer: "projection-a",
    eventId: "event-1",
    payloadDigest: "sha256:abc",
    consumedAt: "2026-07-29T12:01:00.000Z",
  };

  await assert.rejects(
    inbox.consumeAtomically(delivery, async () => {
      throw new Error("effect failed");
    }),
    /effect failed/,
  );
  const retry = await inbox.consumeAtomically(
    delivery,
    async () => ({ checkpoint: 10 }),
  );
  assert.equal(retry.status, "Applied");
});

test("concurrent first deliveries apply the effect exactly once", async () => {
  const inbox = new InMemoryDeliveryLog();
  let effects = 0;
  const identity = {
    consumer: "projection-a",
    eventId: "event-concurrent",
    payloadDigest: "sha256:concurrent",
    consumedAt: "2026-07-29T12:01:00.000Z",
  };
  const effect = async () => {
    effects += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { checkpoint: 12 };
  };
  const results = await Promise.all([
    inbox.consumeAtomically(identity, effect),
    inbox.consumeAtomically(identity, effect),
  ]);
  assert.equal(effects, 1);
  assert.deepEqual(results.map((result) => result.status).sort(), ["Applied", "Duplicate"]);
});

test("outbox claims reject invalid identity, time and reused token", async () => {
  const store = new InMemoryEventStore();
  await store.append("stream-1", -1n, [event]);
  const base = {
    limit: 1,
    owner: "publisher",
    token: "lease-x",
    now: "2026-07-29T12:00:00.000Z",
    leaseUntil: "2026-07-29T12:01:00.000Z",
  };
  await assert.rejects(store.claimOutbox({ ...base, owner: "" }), /nonempty/);
  await assert.rejects(store.claimOutbox({
    ...base,
    now: "2026-07-29T12:01:00.000Z",
    leaseUntil: "2026-07-29T12:00:00.000Z",
  }), /after now/);
  await store.claimOutbox(base);
  await assert.rejects(store.claimOutbox({
    ...base,
    now: "2026-07-29T12:02:00.000Z",
    leaseUntil: "2026-07-29T12:03:00.000Z",
  }), /unique/);
});
