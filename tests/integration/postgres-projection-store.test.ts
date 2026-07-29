import assert from "node:assert/strict";
import test from "node:test";

import type { ProjectionRebuild } from "../../packages/kernel/src/projection.ts";
import {
  ProjectionCandidateConflict,
  ProjectionCandidateNotFound,
  ProjectionCheckpointRegression,
  ProjectionIdentityMismatch,
  ProjectionInvalidationConflict,
} from "../../packages/persistence/src/index.ts";

const databaseUrl = process.env.DATABASE_URL;

interface FixtureState {
  nested: {
    value: string;
  };
}

function rebuild(
  projectionName: string,
  rebuildId: string,
  checkpoint: bigint,
  value = rebuildId,
): ProjectionRebuild<FixtureState> {
  return {
    projectionName,
    projectionVersion: 1,
    state: { nested: { value } },
    checkpoint,
    asOf: "2026-07-29T12:00:00.000Z",
    staleness: {
      asOf: "2026-07-29T12:00:00.000Z",
      evaluatedAt: "2026-07-29T12:00:01.000Z",
      lagMilliseconds: 1_000,
    },
    rebuildId,
    rebuildStatus: "COMPLETED_AWAITING_PROMOTION",
  };
}

test(
  "PostgreSQL stages and atomically promotes projection rebuilds",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async (context) => {
    const { Pool } = await import("pg");
    const {
      applySqlMigration,
      PostgresProjectionStore,
    } = await import("../../packages/persistence-postgres/src/index.ts");
    const pool = new Pool({ connectionString: databaseUrl });

    async function resetStore(): Promise<void> {
      await pool.query(
        "TRUNCATE projection_heads, projection_invalidations, projection_rebuilds",
      );
    }

    try {
      await applySqlMigration(
        pool,
        new URL("../../migrations/004_projection_store.sql", import.meta.url),
      );
      await applySqlMigration(
        pool,
        new URL(
          "../../migrations/005_projection_invalidation.sql",
          import.meta.url,
        ),
      );

      await context.test(
        "staging leaves the head unchanged and current returns the full candidate",
        async () => {
          await resetStore();
          const store = new PostgresProjectionStore<FixtureState>(pool);
          const candidate = rebuild(
            "fixture",
            "candidate-large-checkpoint",
            9_007_199_254_740_993n,
          );

          await store.stage(candidate);
          assert.equal(await store.current("fixture"), null);

          await store.promote(candidate);

          assert.deepEqual(await store.current("fixture"), candidate);
        },
      );

      await context.test(
        "restaging is idempotent only for a logically identical candidate",
        async () => {
          await resetStore();
          const store = new PostgresProjectionStore<FixtureState>(pool);
          const candidate = rebuild("fixture", "candidate-1", 3n);
          await store.stage(candidate);
          await store.stage(structuredClone(candidate));

          await assert.rejects(
            store.stage({
              ...candidate,
              state: { nested: { value: "divergent" } },
            }),
            (error) =>
              error instanceof ProjectionCandidateConflict &&
              error.rebuildId === candidate.rebuildId,
          );
        },
      );

      await context.test(
        "missing and incompatible candidates fail without publishing a head",
        async () => {
          await resetStore();
          const store = new PostgresProjectionStore<FixtureState>(pool);
          const candidate = rebuild("fixture", "candidate-1", 3n);
          await store.stage(candidate);

          await assert.rejects(
            store.promote({
              ...candidate,
              projectionName: "another-projection",
            }),
            (error) =>
              error instanceof ProjectionIdentityMismatch &&
              error.rebuildId === candidate.rebuildId,
          );
          await assert.rejects(
            store.promote(rebuild("fixture", "missing", 4n)),
            (error) =>
              error instanceof ProjectionCandidateNotFound &&
              error.rebuildId === "missing",
          );
          assert.equal(await store.current("fixture"), null);
        },
      );

      await context.test(
        "promotion retry is idempotent and checkpoint regression preserves the head",
        async () => {
          await resetStore();
          const store = new PostgresProjectionStore<FixtureState>(pool);
          const current = rebuild("fixture", "candidate-current", 7n);
          const stale = rebuild("fixture", "candidate-stale", 6n);
          await store.stage(current);
          await store.promote(current);
          await store.promote(current);
          await store.stage(stale);

          await assert.rejects(
            store.promote(stale),
            (error) =>
              error instanceof ProjectionCheckpointRegression &&
              error.currentCheckpoint === 7n &&
              error.candidateCheckpoint === 6n,
          );
          assert.deepEqual(await store.current("fixture"), current);
        },
      );

      await context.test(
        "candidate identity permits the same rebuild id for independent projections",
        async () => {
          await resetStore();
          const store = new PostgresProjectionStore<FixtureState>(pool);
          const first = rebuild("fixture", "shared-rebuild", 3n);
          const second = rebuild("another-projection", "shared-rebuild", 5n);

          await store.stage(first);
          await store.stage(second);
          await store.promote(first);
          await store.promote(second);

          assert.deepEqual(await store.current("fixture"), first);
          assert.deepEqual(await store.current("another-projection"), second);
        },
      );

      await context.test(
        "promotion rejects content divergent from the staged candidate",
        async () => {
          await resetStore();
          const store = new PostgresProjectionStore<FixtureState>(pool);
          const candidate = rebuild("fixture", "candidate-1", 3n);
          await store.stage(candidate);

          await assert.rejects(
            store.promote({
              ...candidate,
              state: { nested: { value: "divergent" } },
            }),
            (error) => error instanceof ProjectionCandidateConflict,
          );
          assert.equal(await store.current("fixture"), null);
        },
      );

      await context.test(
        "invalidation preserves candidates, retries deterministically, and rejects stale identity",
        async () => {
          await resetStore();
          const store = new PostgresProjectionStore<FixtureState>(pool);
          const first = rebuild("fixture", "candidate-1", 3n);
          const newer = rebuild("fixture", "candidate-2", 4n);
          const firstIdentity = {
            projectionName: first.projectionName,
            projectionVersion: first.projectionVersion,
            rebuildId: first.rebuildId,
          };
          await store.stage(first);
          await store.promote(first);

          await store.invalidate(firstIdentity);
          await store.invalidate(firstIdentity);
          assert.equal(await store.current("fixture"), null);

          await store.stage(newer);
          await store.promote(newer);
          await assert.rejects(
            store.invalidate(firstIdentity),
            (error) => error instanceof ProjectionInvalidationConflict,
          );
          assert.deepEqual(await store.current("fixture"), newer);
        },
      );
    } finally {
      await pool.end();
    }
  },
);
