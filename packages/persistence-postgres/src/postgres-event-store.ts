import type { Pool, PoolClient } from "pg";

import {
  ConcurrencyConflict,
  DuplicateEventConflict,
  type EventStore,
  type EventToAppend,
  type StoredEvent,
} from "../../persistence/src/index.ts";

interface EventRow {
  event_id: string;
  stream_id: string;
  aggregate_revision: string;
  event_type: string;
  schema_version: number;
  occurred_at: Date;
  stored_at: Date;
  producer: string;
  correlation_id: string;
  causation_id: string;
  payload: unknown;
  event_metadata: Readonly<Record<string, unknown>>;
}

function toStoredEvent(row: EventRow): StoredEvent {
  return Object.freeze({
    eventId: row.event_id,
    streamId: row.stream_id,
    aggregateRevision: Number(row.aggregate_revision),
    eventType: row.event_type,
    schemaVersion: row.schema_version,
    occurredAt: row.occurred_at.toISOString(),
    storedAt: row.stored_at.toISOString(),
    producer: row.producer,
    correlationId: row.correlation_id,
    causationId: row.causation_id,
    payload: row.payload,
    metadata: Object.freeze({ ...row.event_metadata }),
  });
}

export class PostgresEventStore implements EventStore {
  readonly #pool: Pool;

  constructor(pool: Pool) {
    this.#pool = pool;
  }

  async read(streamId: string): Promise<readonly StoredEvent[]> {
    const result = await this.#pool.query<EventRow>(
      `SELECT event_id, stream_id, aggregate_revision, event_type,
              schema_version, occurred_at, stored_at, producer,
              correlation_id, causation_id, payload, event_metadata
         FROM event_store_events
        WHERE stream_id = $1
        ORDER BY aggregate_revision ASC`,
      [streamId],
    );

    return Object.freeze(result.rows.map(toStoredEvent));
  }

  async append(
    streamId: string,
    expectedRevision: number,
    events: readonly EventToAppend[],
  ): Promise<readonly StoredEvent[]> {
    if (events.length === 0) {
      throw new TypeError("Append requires at least one Event.");
    }

    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN");
      await this.lockStream(client, streamId);
      const actualRevision = await this.currentRevision(client, streamId);

      if (actualRevision !== expectedRevision) {
        throw new ConcurrencyConflict(
          streamId,
          expectedRevision,
          actualRevision,
        );
      }

      const appended: StoredEvent[] = [];
      for (const [index, event] of events.entries()) {
        const revision = actualRevision + index + 1;
        const result = await client.query<EventRow>(
          `INSERT INTO event_store_events (
             event_id, stream_id, aggregate_revision, event_type,
             schema_version, occurred_at, producer, correlation_id,
             causation_id, payload, event_metadata
           ) VALUES (
             $1::uuid, $2, $3, $4, $5, $6::timestamptz, $7, $8, $9,
             $10::jsonb, $11::jsonb
           )
           RETURNING event_id, stream_id, aggregate_revision, event_type,
                     schema_version, occurred_at, stored_at, producer,
                     correlation_id, causation_id, payload, event_metadata`,
          [
            event.eventId,
            streamId,
            revision,
            event.eventType,
            event.schemaVersion,
            event.occurredAt,
            event.producer,
            event.correlationId,
            event.causationId,
            JSON.stringify(event.payload),
            JSON.stringify(event.metadata),
          ],
        );
        const row = result.rows[0];
        if (row === undefined) {
          throw new Error("PostgreSQL did not return the appended Event.");
        }
        const stored = toStoredEvent(row);
        appended.push(stored);

        await client.query(
          `INSERT INTO event_store_outbox (outbox_id, event_id)
           VALUES ($1::uuid, $1::uuid)`,
          [stored.eventId],
        );
      }

      await client.query("COMMIT");
      return Object.freeze(appended);
    } catch (error) {
      await client.query("ROLLBACK");
      if (
        typeof error === "object" &&
        error !== null &&
        "constraint" in error &&
        error.constraint === "events_event_id_unique" &&
        events.length > 0
      ) {
        throw new DuplicateEventConflict(
          events.find((event) => event.eventId !== "")?.eventId ?? "unknown",
        );
      }
      throw error;
    } finally {
      client.release();
    }
  }

  private async lockStream(client: PoolClient, streamId: string): Promise<void> {
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [streamId],
    );
  }

  private async currentRevision(
    client: PoolClient,
    streamId: string,
  ): Promise<number> {
    const result = await client.query<{ revision: string }>(
      `SELECT COALESCE(MAX(aggregate_revision), -1)::bigint AS revision
         FROM event_store_events
        WHERE stream_id = $1`,
      [streamId],
    );
    return Number(result.rows[0]?.revision ?? -1);
  }
}
