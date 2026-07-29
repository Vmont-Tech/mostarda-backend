import assert from "node:assert/strict";
import test from "node:test";

import type {
  AtomicProjectionStore,
  ProjectionRebuild,
} from "../../packages/kernel/src/projection.ts";
import {
  InMemoryProjectionStore,
  ProjectionCandidateConflict,
  ProjectionCandidateNotFound,
  ProjectionCheckpointRegression,
  ProjectionIdentityMismatch,
  ProjectionInvalidationConflict,
} from "../../packages/persistence/src/index.ts";

interface FixtureState {
  nested: {
    value: string;
  };
}

function rebuild(
  rebuildId: string,
  checkpoint: bigint,
  value = rebuildId,
): ProjectionRebuild<FixtureState> {
  return {
    projectionName: "fixture",
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

test("staging a complete candidate does not change the current projection", async () => {
  const store = new InMemoryProjectionStore<FixtureState>();

  await store.stage(rebuild("candidate-1", 3n));

  assert.equal(await store.current("fixture"), null);
});

test("promotion atomically replaces the current projection with the staged candidate", async () => {
  const store = new InMemoryProjectionStore<FixtureState>();
  const first = rebuild("candidate-1", 3n);
  const replacement = rebuild("candidate-2", 7n);
  await store.stage(first);
  await store.promote(first);
  await store.stage(replacement);

  assert.equal((await store.current("fixture"))?.rebuildId, "candidate-1");

  await store.promote(replacement);

  assert.deepEqual(await store.current("fixture"), replacement);
});

test("repeated promotion of the same rebuild is idempotent", async () => {
  const store = new InMemoryProjectionStore<FixtureState>();
  const candidate = rebuild("candidate-1", 3n);
  await store.stage(candidate);

  await store.promote(candidate);
  await store.promote(candidate);

  assert.deepEqual(await store.current("fixture"), candidate);
});

test("the same rebuild id can be staged for independent projections", async () => {
  const store = new InMemoryProjectionStore<FixtureState>();
  const first = rebuild("shared-rebuild", 3n);
  const second: ProjectionRebuild<FixtureState> = {
    ...rebuild("shared-rebuild", 5n),
    projectionName: "another-projection",
  };

  await store.stage(first);
  await store.stage(second);
  await store.promote(first);
  await store.promote(second);

  assert.deepEqual(await store.current("fixture"), first);
  assert.deepEqual(await store.current("another-projection"), second);
});

test("restaging a logically identical candidate is idempotent", async () => {
  const store = new InMemoryProjectionStore<FixtureState>();
  const candidate = rebuild("candidate-1", 3n);

  await store.stage(candidate);
  await store.stage(structuredClone(candidate));
  await store.promote(candidate);

  assert.deepEqual(await store.current("fixture"), candidate);
});

const divergentCandidates: ReadonlyArray<{
  readonly description: string;
  readonly change: (
    candidate: ProjectionRebuild<FixtureState>,
  ) => ProjectionRebuild<FixtureState>;
}> = [
  {
    description: "checkpoint",
    change: (candidate) => ({ ...candidate, checkpoint: 4n }),
  },
  {
    description: "state",
    change: (candidate) => ({
      ...candidate,
      state: { nested: { value: "divergent" } },
    }),
  },
  {
    description: "staleness metadata",
    change: (candidate) => ({
      ...candidate,
      staleness: {
        ...candidate.staleness,
        lagMilliseconds: 2_000,
      },
    }),
  },
];

for (const { description, change } of divergentCandidates) {
  test(`restaging the same candidate identity with divergent ${description} is a conflict`, async () => {
    const store = new InMemoryProjectionStore<FixtureState>();
    const candidate = rebuild("candidate-1", 3n);
    await store.stage(candidate);

    await assert.rejects(
      store.stage(change(candidate)),
      (error) =>
        error instanceof ProjectionCandidateConflict &&
        error.rebuildId === "candidate-1",
    );
  });
}

test("promotion rejects a candidate that was not staged", async () => {
  const store = new InMemoryProjectionStore<FixtureState>();

  await assert.rejects(
    store.promote(rebuild("missing", 3n)),
    (error) =>
      error instanceof ProjectionCandidateNotFound &&
      error.rebuildId === "missing",
  );
});

test("promotion rejects a staged rebuild with a mismatched projection identity", async () => {
  const store = new InMemoryProjectionStore<FixtureState>();
  const candidate = rebuild("candidate-1", 3n);
  await store.stage(candidate);

  await assert.rejects(
    store.promote({
      ...candidate,
      projectionName: "another-projection",
    }),
    (error) =>
      error instanceof ProjectionIdentityMismatch &&
      error.rebuildId === "candidate-1",
  );
  assert.equal(await store.current("fixture"), null);
});

test("promotion rejects supplied content that diverges from the staged candidate", async () => {
  const store = new InMemoryProjectionStore<FixtureState>();
  const candidate = rebuild("candidate-1", 3n);
  await store.stage(candidate);

  const divergences: ProjectionRebuild<FixtureState>[] = [
    { ...candidate, checkpoint: 4n },
    { ...candidate, state: { nested: { value: "divergent" } } },
    {
      ...candidate,
      asOf: "2026-07-29T12:00:02.000Z",
      staleness: {
        ...candidate.staleness,
        asOf: "2026-07-29T12:00:02.000Z",
      },
    },
    {
      ...candidate,
      staleness: {
        ...candidate.staleness,
        lagMilliseconds: 2_000,
      },
    },
    {
      ...candidate,
      rebuildStatus: "INVALID" as ProjectionRebuild<FixtureState>["rebuildStatus"],
    },
  ];

  for (const divergent of divergences) {
    await assert.rejects(
      store.promote(divergent),
      (error) => error instanceof ProjectionCandidateConflict,
    );
  }
  assert.equal(await store.current("fixture"), null);
});

test("invalidation removes only the current head and preserves its staged candidate", async () => {
  const store = new InMemoryProjectionStore<FixtureState>();
  const candidate = rebuild("candidate-1", 3n);
  await store.stage(candidate);
  await store.promote(candidate);

  await store.invalidate({
    projectionName: candidate.projectionName,
    projectionVersion: candidate.projectionVersion,
    rebuildId: candidate.rebuildId,
  });

  assert.equal(await store.current("fixture"), null);
  await store.promote(candidate);
  assert.deepEqual(await store.current("fixture"), candidate);
});

test("repeated invalidation of the same current generation is idempotent", async () => {
  const store = new InMemoryProjectionStore<FixtureState>();
  const candidate = rebuild("candidate-1", 3n);
  const identity = {
    projectionName: candidate.projectionName,
    projectionVersion: candidate.projectionVersion,
    rebuildId: candidate.rebuildId,
  };
  await store.stage(candidate);
  await store.promote(candidate);

  await store.invalidate(identity);
  await store.invalidate(identity);

  assert.equal(await store.current("fixture"), null);
});

test("stale invalidation cannot remove a newer projection head", async () => {
  const store = new InMemoryProjectionStore<FixtureState>();
  const first = rebuild("candidate-1", 3n);
  const newer = rebuild("candidate-2", 4n);
  const firstIdentity = {
    projectionName: first.projectionName,
    projectionVersion: first.projectionVersion,
    rebuildId: first.rebuildId,
  };
  await store.stage(first);
  await store.promote(first);
  await store.invalidate(firstIdentity);
  await store.stage(newer);
  await store.promote(newer);

  await assert.rejects(
    store.invalidate(firstIdentity),
    (error) => error instanceof ProjectionInvalidationConflict,
  );
  assert.deepEqual(await store.current("fixture"), newer);
});

test("invalidation fails explicitly when no matching generation is current or tombstoned", async () => {
  const store = new InMemoryProjectionStore<FixtureState>();

  await assert.rejects(
    store.invalidate({
      projectionName: "fixture",
      projectionVersion: 1,
      rebuildId: "missing",
    }),
    (error) => error instanceof ProjectionInvalidationConflict,
  );
});

test("checkpoint regression is rejected without changing the current projection", async () => {
  const store = new InMemoryProjectionStore<FixtureState>();
  const current = rebuild("candidate-current", 7n);
  const stale = rebuild("candidate-stale", 6n);
  await store.stage(current);
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
});

test("stored candidates and reads are isolated structured clones", async () => {
  const store = new InMemoryProjectionStore<FixtureState>();
  const candidate = rebuild("candidate-1", 3n, "original");
  const staged = structuredClone(candidate);
  await store.stage(candidate);
  candidate.state.nested.value = "caller-mutated";

  await assert.rejects(
    store.promote(candidate),
    (error) => error instanceof ProjectionCandidateConflict,
  );
  await store.promote(staged);
  const firstRead = await store.current("fixture");
  assert.ok(firstRead);
  assert.equal(firstRead.state.nested.value, "original");
  firstRead.state.nested.value = "reader-mutated";

  assert.equal(
    (await store.current("fixture"))?.state.nested.value,
    "original",
  );
});

test("the in-memory store implements the kernel atomic promotion contract", () => {
  const contract: AtomicProjectionStore<FixtureState> =
    new InMemoryProjectionStore<FixtureState>();

  assert.equal(typeof contract.promote, "function");
  assert.equal(typeof contract.invalidate, "function");
});
