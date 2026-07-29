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
  await store.stage(candidate);
  candidate.state.nested.value = "caller-mutated";

  await store.promote(candidate);
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
});
