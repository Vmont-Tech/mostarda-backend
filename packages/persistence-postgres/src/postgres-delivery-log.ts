import type { Pool } from "pg";

import {
  IdempotencyPayloadConflict,
  type ConsumptionRecord,
  type ConsumptionResult,
  type OutboxRecord,
  type StoredEvent,
} from "../../persistence/src/index.ts";

interface PendingRow {
  outbox_id: string;
  created_at: Date;
  published_at: Date | null;
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

interface InboxRow {
  payload_digest: string;
  effect_result: unknown;
  consumed_at: Date;
}

function storedEvent(row: PendingRow): StoredEvent {
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

export class PostgresDeliveryLog {
  readonly #pool: Pool;

  constructor(pool: Pool) {
    this.#pool = pool;
  }

  async pendingOutbox(limit: number): Promise<readonly OutboxRecord[]> {
    if (!Number.isSafeInteger(limit) || limit <= 0) {
      throw new TypeError("Outbox limit must be a positive safe integer.");
    }

    const result = await this.#pool.query<PendingRow>(
      `SELECT o.outbox_id::text, o.created_at, o.published_at,
              e.event_id::text, e.stream_id, e.aggregate_revision,
              e.event_type, e.schema_version, e.occurred_at, e.stored_at,
              e.producer, e.correlation_id, e.causation_id,
              e.payload, e.event_metadata
         FROM event_store_outbox o
         JOIN event_store_events e ON e.event_id = o.event_id
        WHERE o.published_at IS NULL
        ORDER BY o.created_at, o.outbox_id
        LIMIT $1`,
      [limit],
    );

    return Object.freeze(
      result.rows.map((row) =>
        Object.freeze({
          outboxId: row.outbox_id,
          event: storedEvent(row),
          createdAt: row.created_at.toISOString(),
          publishedAt: row.published_at?.toISOString() ?? null,
        }),
      ),
    );
  }

  async confirmPublished(eventId: string, publishedAt: string): Promise<void> {
    const result = await this.#pool.query(
      `UPDATE event_store_outbox
          SET published_at = COALESCE(published_at, $2::timestamptz)
        WHERE event_id = $1::uuid`,
      [eventId, publishedAt],
    );
    if (result.rowCount === 0) {
      throw new Error(`No pending outbox record exists for EventId ${eventId}.`);
    }
  }

  async recordConsumption<T>(
    record: ConsumptionRecord<T>,
  ): Promise<ConsumptionResult<T>> {
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query(
        `INSERT INTO event_store_inbox (
           consumer_name, event_id, payload_digest, effect_result, consumed_at
         ) VALUES ($1, $2, $3, $4::jsonb, $5::timestamptz)
         ON CONFLICT (consumer_name, event_id) DO NOTHING`,
        [
          record.consumer,
          record.eventId,
          record.payloadDigest,
          JSON.stringify(record.result),
          record.consumedAt,
        ],
      );

      if (inserted.rowCount === 1) {
        await client.query("COMMIT");
        return Object.freeze({
          status: "Applied",
          result: record.result,
          consumedAt: record.consumedAt,
        });
      }

      const existing = await client.query<InboxRow>(
        `SELECT payload_digest, effect_result, consumed_at
           FROM event_store_inbox
          WHERE consumer_name = $1 AND event_id = $2
          FOR SHARE`,
        [record.consumer, record.eventId],
      );
      const previous = existing.rows[0];
      if (previous === undefined) {
        throw new Error("Inbox conflict did not expose the existing receipt.");
      }
      if (previous.payload_digest !== record.payloadDigest) {
        throw new IdempotencyPayloadConflict(record.consumer, record.eventId);
      }

      await client.query("COMMIT");
      return Object.freeze({
        status: "Duplicate",
        originalResult: previous.effect_result as T,
        originallyConsumedAt: previous.consumed_at.toISOString(),
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
