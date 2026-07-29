import type { EventEnvelope } from "./envelopes.ts";

export interface EventUpcaster {
  readonly eventType: string;
  readonly from: number;
  readonly to: number;
  upcast(payload: unknown): unknown;
}

export interface UpcastResult {
  readonly original: EventEnvelope<unknown>;
  readonly event: EventEnvelope<unknown>;
}

export class IncompatibleEventSchema extends Error {
  readonly eventType: string;
  readonly from: number;
  readonly target: number;

  constructor(
    eventType: string,
    from: number,
    target: number,
    reason: string,
  ) {
    super(
      `Incompatible schema for ${eventType}: ${from} → ${target}. ${reason}`,
    );
    this.name = "IncompatibleEventSchema";
    this.eventType = eventType;
    this.from = from;
    this.target = target;
  }
}

export function upcastEvent({
  event,
  targetSchemaVersion,
  upcasters,
}: {
  readonly event: EventEnvelope<unknown>;
  readonly targetSchemaVersion: number;
  readonly upcasters: readonly EventUpcaster[];
}): UpcastResult {
  if (targetSchemaVersion < event.schemaVersion) {
    throw new IncompatibleEventSchema(
      event.eventType,
      event.schemaVersion,
      targetSchemaVersion,
      "Heuristic downgrade is prohibited.",
    );
  }

  let schemaVersion = event.schemaVersion;
  let payload = structuredClone(event.payload);

  while (schemaVersion < targetSchemaVersion) {
    const upcaster = upcasters.find(
      (candidate) =>
        candidate.eventType === event.eventType &&
        candidate.from === schemaVersion &&
        candidate.to === schemaVersion + 1,
    );
    if (upcaster === undefined) {
      throw new IncompatibleEventSchema(
        event.eventType,
        schemaVersion,
        targetSchemaVersion,
        "The explicit contiguous upcast chain is incomplete.",
      );
    }

    payload = structuredClone(upcaster.upcast(structuredClone(payload)));
    schemaVersion = upcaster.to;
  }

  return Object.freeze({
    original: event,
    event: Object.freeze({
      ...event,
      schemaVersion,
      payload,
    }),
  });
}
