export interface ProjectionDefinition<TState, TEvent> {
  readonly name: string;
  readonly version: number;
  readonly initialState: TState;
  apply(state: Readonly<TState>, event: Readonly<TEvent>): TState;
}

export interface PositionedEvent<TEvent> {
  readonly position: number;
  readonly occurredAt: string;
  readonly value: TEvent;
}

export interface ProjectionRebuild<TState> {
  readonly projectionName: string;
  readonly projectionVersion: number;
  readonly state: TState;
  readonly checkpoint: number;
  readonly asOf: string | null;
  readonly rebuildId: string;
  readonly readyForAtomicPromotion: true;
}

export function rebuildProjection<TState, TEvent>({
  definition,
  events,
  rebuildId,
}: {
  readonly definition: ProjectionDefinition<TState, TEvent>;
  readonly events: readonly PositionedEvent<TEvent>[];
  readonly rebuildId: string;
}): ProjectionRebuild<TState> {
  let state = definition.initialState;
  let checkpoint = -1;
  let asOf: string | null = null;

  for (const event of events) {
    if (event.position <= checkpoint) {
      throw new Error("Projection events must be strictly ordered.");
    }

    state = definition.apply(state, event.value);
    checkpoint = event.position;
    asOf = event.occurredAt;
  }

  return Object.freeze({
    projectionName: definition.name,
    projectionVersion: definition.version,
    state,
    checkpoint,
    asOf,
    rebuildId,
    readyForAtomicPromotion: true,
  });
}
