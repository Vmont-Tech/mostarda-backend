import type { EventEnvelope } from "./envelopes.ts";

export type ReplayErrorCode =
  | "DUPLICATE_EVENT"
  | "REVISION_GAP"
  | "UNKNOWN_EVENT_SCHEMA";

export class ReplayAborted extends Error {
  readonly partialStateDiscarded = true;
  readonly code: ReplayErrorCode;
  readonly eventId: string;

  constructor(
    code: ReplayErrorCode,
    eventId: string,
    message: string,
  ) {
    super(message);
    this.name = "ReplayAborted";
    this.code = code;
    this.eventId = eventId;
  }
}

export interface EventApplier<TState, TPayload = unknown> {
  readonly eventType: string;
  readonly schemaVersion: number;
  apply(state: Readonly<TState>, payload: Readonly<TPayload>): TState;
}

export interface ReplayInput<TState> {
  readonly initialState: TState;
  readonly events: readonly EventEnvelope<unknown>[];
  // Payload safety is established by the explicit eventType/schemaVersion registry.
  readonly appliers: readonly EventApplier<TState, any>[];
}

export interface ReplayResult<TState> {
  readonly state: TState;
  readonly revision: number;
  readonly appliedEventIds: readonly string[];
}

export function replay<TState>({
  initialState,
  events,
  appliers,
}: ReplayInput<TState>): ReplayResult<TState> {
  let state = initialState;
  let expectedRevision = 0;
  const seenEventIds = new Set<string>();
  const appliedEventIds: string[] = [];

  for (const event of events) {
    if (seenEventIds.has(event.eventId)) {
      throw new ReplayAborted(
        "DUPLICATE_EVENT",
        event.eventId,
        `Duplicate EventId ${event.eventId}.`,
      );
    }

    if (event.aggregateRevision !== expectedRevision) {
      throw new ReplayAborted(
        "REVISION_GAP",
        event.eventId,
        `Expected revision ${expectedRevision}, received ${event.aggregateRevision}.`,
      );
    }

    const applier = appliers.find(
      (candidate) =>
        candidate.eventType === event.eventType &&
        candidate.schemaVersion === event.schemaVersion,
    );

    if (applier === undefined) {
      throw new ReplayAborted(
        "UNKNOWN_EVENT_SCHEMA",
        event.eventId,
        `No applier for ${event.eventType}@${event.schemaVersion}.`,
      );
    }

    state = applier.apply(state, event.payload as never);
    seenEventIds.add(event.eventId);
    appliedEventIds.push(event.eventId);
    expectedRevision += 1;
  }

  return Object.freeze({
    state,
    revision: expectedRevision - 1,
    appliedEventIds: Object.freeze(appliedEventIds),
  });
}
