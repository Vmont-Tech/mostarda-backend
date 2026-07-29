export interface ConsumptionIdentity {
  readonly consumer: string;
  readonly eventId: string;
  readonly payloadDigest: string;
  readonly consumedAt: string;
}

export interface ConsumptionRecord<T> extends ConsumptionIdentity {
  readonly result: T;
}

export type ConsumptionResult<T> =
  | {
      readonly status: "Applied";
      readonly result: T;
      readonly consumedAt: string;
    }
  | {
      readonly status: "Duplicate";
      readonly originalResult: T;
      readonly originallyConsumedAt: string;
    };

export class IdempotencyPayloadConflict extends Error {
  readonly consumer: string;
  readonly eventId: string;

  constructor(consumer: string, eventId: string) {
    super(
      `Consumer ${consumer} received divergent content for EventId ${eventId}.`,
    );
    this.name = "IdempotencyPayloadConflict";
    this.consumer = consumer;
    this.eventId = eventId;
  }
}

export class InMemoryDeliveryLog {
  readonly #records = new Map<string, ConsumptionRecord<unknown>>();

  async consumeAtomically<T>(
    identity: ConsumptionIdentity,
    effect: () => Promise<T>,
  ): Promise<ConsumptionResult<T>> {
    const key = `${identity.consumer}\u0000${identity.eventId}`;
    const previous = this.#records.get(key);

    if (previous !== undefined) {
      if (previous.payloadDigest !== identity.payloadDigest) {
        throw new IdempotencyPayloadConflict(
          identity.consumer,
          identity.eventId,
        );
      }

      return Object.freeze({
        status: "Duplicate",
        originalResult: previous.result as T,
        originallyConsumedAt: previous.consumedAt,
      });
    }

    const result = await effect();
    const record: ConsumptionRecord<T> = { ...identity, result };
    this.#records.set(
      key,
      Object.freeze({
        ...record,
        result: structuredClone(record.result),
      }),
    );

    return Object.freeze({
      status: "Applied",
      result,
      consumedAt: identity.consumedAt,
    });
  }
}
