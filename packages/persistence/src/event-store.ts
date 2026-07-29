export interface EventToAppend<TPayload = unknown> {
  readonly eventId: string;
  readonly eventType: string;
  readonly schemaVersion: number;
  readonly occurredAt: string;
  readonly producer: string;
  readonly correlationId: string;
  readonly causationId: string;
  readonly payload: TPayload;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface StoredEvent<TPayload = unknown>
  extends EventToAppend<TPayload> {
  readonly streamId: string;
  readonly aggregateRevision: number;
  readonly storedAt: string;
}

export interface OutboxRecord {
  readonly outboxId: string;
  readonly event: StoredEvent;
  readonly createdAt: string;
  readonly publishedAt: string | null;
}

export interface EventStore {
  read(streamId: string): Promise<readonly StoredEvent[]>;
  append(
    streamId: string,
    expectedRevision: number,
    events: readonly EventToAppend[],
  ): Promise<readonly StoredEvent[]>;
}

export class ConcurrencyConflict extends Error {
  readonly streamId: string;
  readonly expectedRevision: number;
  readonly actualRevision: number;

  constructor(
    streamId: string,
    expectedRevision: number,
    actualRevision: number,
  ) {
    super(
      `Wrong revision for ${streamId}: expected ${expectedRevision}, actual ${actualRevision}.`,
    );
    this.name = "ConcurrencyConflict";
    this.streamId = streamId;
    this.expectedRevision = expectedRevision;
    this.actualRevision = actualRevision;
  }
}

export class DuplicateEventConflict extends Error {
  readonly eventId: string;

  constructor(eventId: string) {
    super(`EventId ${eventId} already exists.`);
    this.name = "DuplicateEventConflict";
    this.eventId = eventId;
  }
}
