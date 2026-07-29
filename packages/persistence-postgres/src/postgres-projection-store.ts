import { isDeepStrictEqual } from "node:util";

import type { Pool, PoolClient } from "pg";

import type { ProjectionRebuild } from "../../kernel/src/projection.ts";
import {
  ProjectionCandidateConflict,
  ProjectionCandidateNotFound,
  ProjectionCheckpointRegression,
  ProjectionIdentityMismatch,
} from "../../persistence/src/index.ts";

interface ProjectionRow<TState> {
  projection_name: string;
  projection_version: number;
  rebuild_id: string;
  state: TState;
  checkpoint: string;
  as_of: Date | null;
  staleness: ProjectionRebuild<TState>["staleness"];
  rebuild_status: ProjectionRebuild<TState>["rebuildStatus"];
}

const projectionColumns = `
  projection_name, projection_version, rebuild_id, state, checkpoint,
  as_of, staleness, rebuild_status
`;

function toProjectionRebuild<TState>(
  row: ProjectionRow<TState>,
): ProjectionRebuild<TState> {
  return {
    projectionName: row.projection_name,
    projectionVersion: row.projection_version,
    state: structuredClone(row.state),
    checkpoint: BigInt(row.checkpoint),
    asOf: row.as_of?.toISOString() ?? null,
    staleness: structuredClone(row.staleness),
    rebuildId: row.rebuild_id,
    rebuildStatus: row.rebuild_status,
  };
}

function hasSameIdentity<TState>(
  first: ProjectionRebuild<TState>,
  second: ProjectionRebuild<TState>,
): boolean {
  return (
    first.projectionName === second.projectionName &&
    first.projectionVersion === second.projectionVersion &&
    first.rebuildId === second.rebuildId
  );
}

export class PostgresProjectionStore<TState> {
  readonly #pool: Pool;

  constructor(pool: Pool) {
    this.#pool = pool;
  }

  async stage(rebuild: ProjectionRebuild<TState>): Promise<void> {
    if (rebuild.rebuildStatus !== "COMPLETED_AWAITING_PROMOTION") {
      throw new TypeError("Only complete Projection rebuilds can be staged.");
    }

    const inserted = await this.#pool.query(
      `INSERT INTO projection_rebuilds (
         projection_name, projection_version, rebuild_id, state, checkpoint,
         as_of, staleness, rebuild_status
       ) VALUES (
         $1, $2, $3, $4::jsonb, $5, $6::timestamptz, $7::jsonb, $8
       )
       ON CONFLICT (projection_name, projection_version, rebuild_id)
       DO NOTHING
       RETURNING projection_name`,
      [
        rebuild.projectionName,
        rebuild.projectionVersion,
        rebuild.rebuildId,
        JSON.stringify(rebuild.state),
        rebuild.checkpoint.toString(),
        rebuild.asOf,
        JSON.stringify(rebuild.staleness),
        rebuild.rebuildStatus,
      ],
    );
    if (inserted.rowCount === 1) {
      return;
    }

    const existing = await this.#pool.query<ProjectionRow<TState>>(
      `SELECT ${projectionColumns}
         FROM projection_rebuilds
        WHERE projection_name = $1
          AND projection_version = $2
          AND rebuild_id = $3`,
      [
        rebuild.projectionName,
        rebuild.projectionVersion,
        rebuild.rebuildId,
      ],
    );
    const row = existing.rows[0];
    if (
      row !== undefined &&
      isDeepStrictEqual(toProjectionRebuild(row), rebuild)
    ) {
      return;
    }

    throw new ProjectionCandidateConflict(
      rebuild.projectionName,
      rebuild.projectionVersion,
      rebuild.rebuildId,
    );
  }

  async current(
    projectionName: string,
  ): Promise<ProjectionRebuild<TState> | null> {
    const result = await this.#pool.query<ProjectionRow<TState>>(
      `SELECT ${projectionColumns
        .split(",")
        .map((column) => `r.${column.trim()}`)
        .join(", ")}
         FROM projection_heads h
         JOIN projection_rebuilds r
           ON r.projection_name = h.projection_name
          AND r.projection_version = h.projection_version
          AND r.rebuild_id = h.rebuild_id
        WHERE h.projection_name = $1`,
      [projectionName],
    );
    const row = result.rows[0];
    return row === undefined ? null : toProjectionRebuild(row);
  }

  async promote(rebuild: ProjectionRebuild<TState>): Promise<void> {
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 1))",
        [rebuild.projectionName],
      );

      const candidate = await this.#lockedCandidate(client, rebuild);
      const current = await this.#lockedCurrent(
        client,
        candidate.projectionName,
      );

      if (current !== null && hasSameIdentity(current, candidate)) {
        await client.query("COMMIT");
        return;
      }
      if (
        current !== null &&
        candidate.checkpoint < current.checkpoint
      ) {
        throw new ProjectionCheckpointRegression(
          candidate.projectionName,
          current.checkpoint,
          candidate.checkpoint,
        );
      }

      await client.query(
        `INSERT INTO projection_heads (
           projection_name, projection_version, rebuild_id
         ) VALUES ($1, $2, $3)
         ON CONFLICT (projection_name) DO UPDATE
         SET projection_version = EXCLUDED.projection_version,
             rebuild_id = EXCLUDED.rebuild_id,
             promoted_at = clock_timestamp()`,
        [
          candidate.projectionName,
          candidate.projectionVersion,
          candidate.rebuildId,
        ],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async #lockedCandidate(
    client: PoolClient,
    rebuild: ProjectionRebuild<TState>,
  ): Promise<ProjectionRebuild<TState>> {
    const result = await client.query<ProjectionRow<TState>>(
      `SELECT ${projectionColumns}
         FROM projection_rebuilds
        WHERE projection_name = $1
          AND projection_version = $2
          AND rebuild_id = $3
          AND rebuild_status = 'COMPLETED_AWAITING_PROMOTION'
        FOR UPDATE`,
      [
        rebuild.projectionName,
        rebuild.projectionVersion,
        rebuild.rebuildId,
      ],
    );
    const row = result.rows[0];
    if (row !== undefined) {
      return toProjectionRebuild(row);
    }

    const incompatible = await client.query(
      `SELECT rebuild_id
         FROM projection_rebuilds
        WHERE rebuild_id = $1
        LIMIT 1
        FOR UPDATE`,
      [rebuild.rebuildId],
    );
    if (incompatible.rowCount !== 0) {
      throw new ProjectionIdentityMismatch(rebuild.rebuildId);
    }
    throw new ProjectionCandidateNotFound(rebuild.rebuildId);
  }

  async #lockedCurrent(
    client: PoolClient,
    projectionName: string,
  ): Promise<ProjectionRebuild<TState> | null> {
    const result = await client.query<ProjectionRow<TState>>(
      `SELECT ${projectionColumns
        .split(",")
        .map((column) => `r.${column.trim()}`)
        .join(", ")}
         FROM projection_heads h
         JOIN projection_rebuilds r
           ON r.projection_name = h.projection_name
          AND r.projection_version = h.projection_version
          AND r.rebuild_id = h.rebuild_id
        WHERE h.projection_name = $1
        FOR UPDATE OF h, r`,
      [projectionName],
    );
    const row = result.rows[0];
    return row === undefined ? null : toProjectionRebuild(row);
  }
}
