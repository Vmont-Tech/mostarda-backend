export interface ConsumptionRecord<T> {
  readonly consumer: string;
  readonly eventId: string;
  readonly payloadDigest: string;
  readonly result: T;
  readonly consumedAt: string;
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

  async recordConsumption<T>(
    record: ConsumptionRecord<T>,
  ): Promise<ConsumptionResult<T>> {
    const identity = `${record.consumer}\u0000${record.eventId}`;
    const previous = this.#records.get(identity);

    if (previous !== undefined) {
      if (previous.payloadDigest !== record.payloadDigest) {
        throw new IdempotencyPayloadConflict(record.consumer, record.eventId);
      }

      return Object.freeze({
        status: "Duplicate",
        originalResult: previous.result as T,
        originallyConsumedAt: previous.consumedAt,
      });
    }

    this.#records.set(
      identity,
      Object.freeze({
        ...record,
        result: structuredClone(record.result),
      }),
    );

    return Object.freeze({
      status: "Applied",
      result: record.result,
      consumedAt: record.consumedAt,
    });
  }
}
