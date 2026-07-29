export interface CommandEnvelope<TPayload> {
  readonly commandId: string;
  readonly commandType: string;
  readonly schemaVersion: number;
  readonly aggregateId?: string;
  readonly expectedRevision: bigint;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly causationId?: string;
  readonly requestedAt: string;
  readonly payload: TPayload;
}

export interface EventEnvelope<TPayload> {
  readonly eventId: string;
  readonly eventType: string;
  readonly schemaVersion: number;
  readonly streamId: string;
  readonly aggregateRevision: bigint;
  readonly occurredAt: string;
  readonly producer: string;
  readonly correlationId: string;
  readonly causationId: string;
  readonly payload: TPayload;
}
