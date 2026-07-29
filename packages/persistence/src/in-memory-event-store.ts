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
    return Object.freeze([...(this.#streams.get(streamId) ?? [])]);
  }

  async append(
    streamId: string,
    expectedRevision: number,
    events: readonly EventToAppend[],
  ): Promise<readonly StoredEvent[]> {
    if (events.length === 0) {
      throw new TypeError("Append requires at least one Event.");
    }

    const current = this.#streams.get(streamId) ?? [];
    const actualRevision = current.length - 1;

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
        ...event,
        metadata: Object.freeze({ ...event.metadata }),
        streamId,
        aggregateRevision: actualRevision + index + 1,
        storedAt,
      }),
    );
    const outbox = appended.map<OutboxRecord>((event) =>
      Object.freeze({
        outboxId: event.eventId,
        event,
        createdAt: storedAt,
        publishedAt: null,
      }),
    );

    this.#streams.set(streamId, [...current, ...appended]);
    for (const eventId of batchIds) {
      this.#eventIds.add(eventId);
    }
    this.#outbox.push(...outbox);

    return Object.freeze(appended);
  }

  async pendingOutbox(): Promise<readonly OutboxRecord[]> {
    return Object.freeze(
      this.#outbox.filter((record) => record.publishedAt === null),
    );
  }

  async confirmPublished(eventId: string, publishedAt: string): Promise<void> {
    const index = this.#outbox.findIndex(
      (record) => record.event.eventId === eventId,
    );
    const record = this.#outbox[index];
    if (record === undefined) {
      throw new Error(`No outbox record exists for EventId ${eventId}.`);
    }

    this.#outbox[index] = Object.freeze({
      ...record,
      publishedAt,
    });
  }
}
