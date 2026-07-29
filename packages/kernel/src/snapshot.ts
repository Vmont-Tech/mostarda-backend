import type { EventEnvelope } from "./envelopes.ts";
import {
  replay,
  type EventApplier,
  type ReplayResult,
} from "./replay.ts";

export interface AggregateSnapshot<TState> {
  readonly aggregateId: string;
  readonly sourceRevision: bigint;
  readonly schemaVersion: number;
  readonly integrity: string;
  readonly state: TState;
}

export interface RehydrationResult<TState> {
  readonly result: ReplayResult<TState>;
  readonly usedSnapshot: boolean;
}

export function rehydrate<TState>({
  aggregateId,
  initialState,
  events,
  appliers,
  snapshot,
  supportedSnapshotSchemas,
  verifyIntegrity,
}: {
  readonly aggregateId: string;
  readonly initialState: TState;
  readonly events: readonly EventEnvelope<unknown>[];
  readonly appliers: readonly EventApplier<TState, any>[];
  readonly snapshot: AggregateSnapshot<TState> | null;
  readonly supportedSnapshotSchemas: readonly number[];
  readonly verifyIntegrity: (snapshot: AggregateSnapshot<TState>) => boolean;
}): RehydrationResult<TState> {
  const lastRevision = events.at(-1)?.aggregateRevision ?? -1n;
  const snapshotIsUsable =
    snapshot !== null &&
    snapshot.aggregateId === aggregateId &&
    snapshot.sourceRevision >= 0n &&
    snapshot.sourceRevision <= lastRevision &&
    supportedSnapshotSchemas.includes(snapshot.schemaVersion) &&
    verifyIntegrity(snapshot);

  if (!snapshotIsUsable || snapshot === null) {
    return Object.freeze({
      result: replay({ initialState, events, appliers }),
      usedSnapshot: false,
    });
  }

  return Object.freeze({
    result: replay({
      initialState: structuredClone(snapshot.state),
      events: events.filter(
        (event) => event.aggregateRevision > snapshot.sourceRevision,
      ),
      appliers,
      sourceRevision: snapshot.sourceRevision,
    }),
    usedSnapshot: true,
  });
}
