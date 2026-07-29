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
  readonly aggregateRevision: bigint;
  readonly storedAt: string;
}

export interface OutboxRecord {
  readonly outboxId: string;
  readonly event: StoredEvent;
  readonly createdAt: string;
  readonly publishedAt: string | null;
  readonly publicationAttempts: number;
  readonly leaseToken: string | null;
  readonly leaseOwner: string | null;
  readonly leaseExpiresAt: string | null;
}

export interface OutboxClaim {
  readonly limit: number;
  readonly owner: string;
  readonly token: string;
  readonly now: string;
  readonly leaseUntil: string;
}

export function validateOutboxClaim(claim: OutboxClaim): void {
  if (!Number.isSafeInteger(claim.limit) || claim.limit <= 0) {
    throw new TypeError("Outbox limit must be a positive safe integer.");
  }
  if (claim.owner.trim() === "" || claim.token.trim() === "") {
    throw new TypeError("Outbox owner and token must be nonempty.");
  }
  const now = Date.parse(claim.now);
  const leaseUntil = Date.parse(claim.leaseUntil);
  if (!Number.isFinite(now) || !Number.isFinite(leaseUntil) || leaseUntil <= now) {
    throw new TypeError("Outbox leaseUntil must be a valid instant after now.");
  }
}

export interface EventStore {
  read(streamId: string): Promise<readonly StoredEvent[]>;
  append(
    streamId: string,
    expectedRevision: bigint,
    events: readonly EventToAppend[],
  ): Promise<readonly StoredEvent[]>;
}

export class ConcurrencyConflict extends Error {
  readonly streamId: string;
  readonly expectedRevision: bigint;
  readonly actualRevision: bigint;

  constructor(
    streamId: string,
    expectedRevision: bigint,
    actualRevision: bigint,
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
