import type { Pool } from "pg";

import {
  IdempotencyPayloadConflict,
  type ConsumptionIdentity,
  type ConsumptionResult,
  type OutboxRecord,
  type OutboxClaim,
  type StoredEvent,
  validateOutboxClaim,
} from "../../persistence/src/index.ts";

interface PendingRow {
  outbox_id: string;
  created_at: Date;
  published_at: Date | null;
  publication_attempts: number;
  lease_token: string | null;
  lease_owner: string | null;
  lease_expires_at: Date | null;
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
    aggregateRevision: BigInt(row.aggregate_revision),
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
              o.publication_attempts, o.lease_token, o.lease_owner,
              o.lease_expires_at,
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
          publicationAttempts: row.publication_attempts,
          leaseToken: row.lease_token,
          leaseOwner: row.lease_owner,
          leaseExpiresAt: row.lease_expires_at?.toISOString() ?? null,
        }),
      ),
    );
  }

  async claimOutbox(claim: OutboxClaim): Promise<readonly OutboxRecord[]> {
    validateOutboxClaim(claim);
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO event_store_outbox_claims
           (lease_token, lease_owner, created_at)
         VALUES ($1, $2, $3::timestamptz)`,
        [claim.token, claim.owner, claim.now],
      );
      const result = await client.query<PendingRow>(
      `WITH candidates AS (
         SELECT outbox_id
           FROM event_store_outbox
          WHERE published_at IS NULL
            AND (lease_expires_at IS NULL OR lease_expires_at <= $4::timestamptz)
          ORDER BY created_at, outbox_id
          FOR UPDATE SKIP LOCKED
          LIMIT $1
       ),
       claimed AS (
         UPDATE event_store_outbox o
            SET lease_owner = $2,
                lease_token = $3,
                lease_expires_at = $5::timestamptz,
                publication_attempts = publication_attempts + 1
           FROM candidates c
          WHERE o.outbox_id = c.outbox_id
         RETURNING o.*
       )
       SELECT c.outbox_id::text, c.created_at, c.published_at,
              c.publication_attempts, c.lease_token, c.lease_owner,
              c.lease_expires_at,
              e.event_id::text, e.stream_id, e.aggregate_revision,
              e.event_type, e.schema_version, e.occurred_at, e.stored_at,
              e.producer, e.correlation_id, e.causation_id,
              e.payload, e.event_metadata
         FROM claimed c
         JOIN event_store_events e ON e.event_id = c.event_id
        ORDER BY c.created_at, c.outbox_id`,
      [claim.limit, claim.owner, claim.token, claim.now, claim.leaseUntil],
    );
      await client.query("COMMIT");
      return Object.freeze(
      result.rows.map((row) =>
        Object.freeze({
          outboxId: row.outbox_id,
          event: storedEvent(row),
          createdAt: row.created_at.toISOString(),
          publishedAt: row.published_at?.toISOString() ?? null,
          publicationAttempts: row.publication_attempts,
          leaseToken: row.lease_token,
          leaseOwner: row.lease_owner,
          leaseExpiresAt: row.lease_expires_at?.toISOString() ?? null,
        }),
      ),
    );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async confirmPublished(
    eventId: string,
    leaseToken: string,
    publishedAt: string,
  ): Promise<void> {
    const result = await this.#pool.query(
      `UPDATE event_store_outbox
          SET published_at = COALESCE(published_at, $3::timestamptz)
        WHERE event_id = $1::uuid
          AND lease_token = $2`,
      [eventId, leaseToken, publishedAt],
    );
    if (result.rowCount === 0) {
      throw new Error(`No pending outbox record exists for EventId ${eventId}.`);
    }
  }

  async consumeAtomically<T>(
    identity: ConsumptionIdentity,
    effect: (client: import("pg").PoolClient) => Promise<T>,
  ): Promise<ConsumptionResult<T>> {
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [`${identity.consumer}\u0000${identity.eventId}`],
      );
      const existing = await client.query<InboxRow>(
        `SELECT payload_digest, effect_result, consumed_at
           FROM event_store_inbox
          WHERE consumer_name = $1 AND event_id = $2
          FOR UPDATE`,
        [identity.consumer, identity.eventId],
      );
      const previous = existing.rows[0];
      if (previous !== undefined) {
        if (previous.payload_digest !== identity.payloadDigest) {
          throw new IdempotencyPayloadConflict(
            identity.consumer,
            identity.eventId,
          );
        }
        await client.query("COMMIT");
        return Object.freeze({
          status: "Duplicate",
          originalResult: previous.effect_result as T,
          originallyConsumedAt: previous.consumed_at.toISOString(),
        });
      }

      const result = await effect(client);
      const inserted = await client.query(
        `INSERT INTO event_store_inbox (
           consumer_name, event_id, payload_digest, effect_result, consumed_at
         ) VALUES ($1, $2, $3, $4::jsonb, $5::timestamptz)
         ON CONFLICT (consumer_name, event_id) DO NOTHING`,
        [
          identity.consumer,
          identity.eventId,
          identity.payloadDigest,
          JSON.stringify(result),
          identity.consumedAt,
        ],
      );

      if (inserted.rowCount === 1) {
        await client.query("COMMIT");
        return Object.freeze({
          status: "Applied",
          result,
          consumedAt: identity.consumedAt,
        });
      }

      const concurrent = await client.query<InboxRow>(
        `SELECT payload_digest, effect_result, consumed_at
           FROM event_store_inbox
          WHERE consumer_name = $1 AND event_id = $2
          FOR SHARE`,
        [identity.consumer, identity.eventId],
      );
      const concurrentPrevious = concurrent.rows[0];
      if (concurrentPrevious === undefined) {
        throw new Error("Inbox conflict did not expose the existing receipt.");
      }
      if (concurrentPrevious.payload_digest !== identity.payloadDigest) {
        throw new IdempotencyPayloadConflict(
          identity.consumer,
          identity.eventId,
        );
      }

      await client.query("COMMIT");
      return Object.freeze({
        status: "Duplicate",
        originalResult: concurrentPrevious.effect_result as T,
        originallyConsumedAt: concurrentPrevious.consumed_at.toISOString(),
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
