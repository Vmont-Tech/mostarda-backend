export interface ProjectionDefinition<TState, TEvent> {
  readonly name: string;
  readonly version: number;
  readonly initialState: TState;
  apply(state: Readonly<TState>, event: Readonly<TEvent>): TState;
}

export interface PositionedEvent<TEvent> {
  readonly position: bigint;
  readonly occurredAt: string;
  readonly value: TEvent;
}

export interface ProjectionRebuild<TState> {
  readonly projectionName: string;
  readonly projectionVersion: number;
  readonly state: TState;
  readonly checkpoint: bigint;
  readonly asOf: string | null;
  readonly staleness: {
    readonly asOf: string | null;
    readonly evaluatedAt: string;
    readonly lagMilliseconds: number | null;
  };
  readonly rebuildId: string;
  readonly rebuildStatus: "COMPLETED_AWAITING_PROMOTION";
}

export interface AtomicProjectionStore<TState> {
  promote(rebuild: ProjectionRebuild<TState>): Promise<void>;
}

export async function promoteProjection<TState>(
  store: AtomicProjectionStore<TState>,
  rebuild: ProjectionRebuild<TState>,
): Promise<void> {
  await store.promote(structuredClone(rebuild));
}

export function rebuildProjection<TState, TEvent>({
  definition,
  events,
  rebuildId,
  evaluatedAt,
}: {
  readonly definition: ProjectionDefinition<TState, TEvent>;
  readonly events: readonly PositionedEvent<TEvent>[];
  readonly rebuildId: string;
  readonly evaluatedAt: string;
}): ProjectionRebuild<TState> {
  let state = structuredClone(definition.initialState);
  let checkpoint = -1n;
  let asOf: string | null = null;

  for (const event of events) {
    if (event.position <= checkpoint) {
      throw new Error("Projection events must be strictly ordered.");
    }

    state = definition.apply(structuredClone(state), structuredClone(event.value));
    checkpoint = event.position;
    asOf = event.occurredAt;
  }

  return Object.freeze({
    projectionName: definition.name,
    projectionVersion: definition.version,
    state: structuredClone(state),
    checkpoint,
    asOf,
    staleness: Object.freeze({
      asOf,
      evaluatedAt,
      lagMilliseconds:
        asOf === null
          ? null
          : Math.max(0, Date.parse(evaluatedAt) - Date.parse(asOf)),
    }),
    rebuildId,
    rebuildStatus: "COMPLETED_AWAITING_PROMOTION",
  });
}
