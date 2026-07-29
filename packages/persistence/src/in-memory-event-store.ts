import {
  ConcurrencyConflict,
  DuplicateEventConflict,
  type EventStore,
  type EventToAppend,
  type OutboxRecord,
  type StoredEvent,
} from "./event-store.ts";

export class InMemoryEventStore implements EventStore {
  readonly #streams = new Map<string, StoredEvent[]>();
  readonly #eventIds = new Set<string>();
  readonly #outbox: OutboxRecord[] = [];

  async read(streamId: string): Promise<readonly StoredEvent[]> {
    return Object.freeze(
      structuredClone(this.#streams.get(streamId) ?? []),
    );
  }

  async append(
    streamId: string,
    expectedRevision: bigint,
    events: readonly EventToAppend[],
  ): Promise<readonly StoredEvent[]> {
    if (events.length === 0) {
      throw new TypeError("Append requires at least one Event.");
    }

    const current = this.#streams.get(streamId) ?? [];
    const actualRevision = BigInt(current.length) - 1n;

    if (actualRevision !== expectedRevision) {
      throw new ConcurrencyConflict(
        streamId,
        expectedRevision,
        actualRevision,
      );
    }

    const batchIds = new Set<string>();
    for (const event of events) {
      if (batchIds.has(event.eventId) || this.#eventIds.has(event.eventId)) {
        throw new DuplicateEventConflict(event.eventId);
      }
      batchIds.add(event.eventId);
    }

    const storedAt = new Date().toISOString();
    const appended = events.map<StoredEvent>((event, index) =>
      Object.freeze({
        ...structuredClone(event),
        streamId,
        aggregateRevision: actualRevision + BigInt(index) + 1n,
        storedAt,
      }),
    );
    const outbox = appended.map<OutboxRecord>((event) =>
      Object.freeze({
        outboxId: event.eventId,
        event,
        createdAt: storedAt,
        publishedAt: null,
        publicationAttempts: 0,
        leaseToken: null,
        leaseOwner: null,
        leaseExpiresAt: null,
      }),
    );

    this.#streams.set(streamId, [...current, ...appended]);
    for (const eventId of batchIds) {
      this.#eventIds.add(eventId);
    }
    this.#outbox.push(...outbox);

    return Object.freeze(structuredClone(appended));
  }

  async pendingOutbox(): Promise<readonly OutboxRecord[]> {
    return Object.freeze(
      structuredClone(
        this.#outbox.filter((record) => record.publishedAt === null),
      ),
    );
  }

  async allOutbox(): Promise<readonly OutboxRecord[]> {
    return Object.freeze(structuredClone(this.#outbox));
  }

  async claimOutbox(
    claim: import("./event-store.ts").OutboxClaim,
  ): Promise<readonly OutboxRecord[]> {
    const available = this.#outbox
      .filter(
        (record) =>
          record.publishedAt === null &&
          (record.leaseExpiresAt === null ||
            record.leaseExpiresAt <= claim.now),
      )
      .slice(0, claim.limit);
    for (const availableRecord of available) {
      const index = this.#outbox.indexOf(availableRecord);
      this.#outbox[index] = Object.freeze({
        ...availableRecord,
        publicationAttempts: availableRecord.publicationAttempts + 1,
        leaseToken: claim.token,
        leaseOwner: claim.owner,
        leaseExpiresAt: claim.leaseUntil,
      });
    }
    return Object.freeze(
      structuredClone(
        this.#outbox.filter((record) => record.leaseToken === claim.token),
      ),
    );
  }

  async confirmPublished(
    eventId: string,
    leaseToken: string,
    publishedAt: string,
  ): Promise<void> {
    const index = this.#outbox.findIndex(
      (record) => record.event.eventId === eventId,
    );
    const record = this.#outbox[index];
    if (record === undefined) {
      throw new Error(`No outbox record exists for EventId ${eventId}.`);
    }
    if (record.leaseToken !== leaseToken) {
      throw new Error(`Lease token does not own EventId ${eventId}.`);
    }
    if (record.publishedAt !== null) {
      return;
    }

    this.#outbox[index] = Object.freeze({
      ...record,
      publishedAt,
    });
  }
}
