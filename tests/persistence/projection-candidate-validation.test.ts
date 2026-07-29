import assert from "node:assert/strict";
import test from "node:test";

import type { Pool } from "pg";

import type { ProjectionRebuild } from "../../packages/kernel/src/projection.ts";
import { canonicalizeProjectionCandidate } from "../../packages/persistence-postgres/src/projection-candidate-validation.ts";
import { PostgresProjectionStore } from "../../packages/persistence-postgres/src/postgres-projection-store.ts";

function rebuild(
  state: unknown,
  overrides: Partial<ProjectionRebuild<unknown>> = {},
): ProjectionRebuild<unknown> {
  return {
    projectionName: "fixture",
    projectionVersion: 1,
    state,
    checkpoint: 3n,
    asOf: "2026-07-29T12:00:00.000Z",
    staleness: {
      asOf: "2026-07-29T12:00:00.000Z",
      evaluatedAt: "2026-07-29T12:00:01.000Z",
      lagMilliseconds: 1_000,
    },
    rebuildId: "candidate-1",
    rebuildStatus: "COMPLETED_AWAITING_PROMOTION",
    ...overrides,
  };
}

test("canonicalization accepts exactly JSONB-safe scalar, object, and dense array state", () => {
  const dictionary = Object.assign(Object.create(null) as object, {
    accepted: true,
  });
  const state = {
    nullValue: null,
    stringValue: "value",
    booleanValue: true,
    numberValue: 1.5,
    negativeZero: -0,
    arrayValue: [false, 2, "three", { nested: null }],
    dictionary,
  };

  const candidate = canonicalizeProjectionCandidate(rebuild(state));

  assert.deepEqual(candidate.state, {
    nullValue: null,
    stringValue: "value",
    booleanValue: true,
    numberValue: 1.5,
    negativeZero: 0,
    arrayValue: [false, 2, "three", { nested: null }],
    dictionary: { accepted: true },
  });
  assert.notEqual(candidate.state, state);
});

const invalidStates: ReadonlyArray<{
  readonly description: string;
  readonly state: () => unknown;
}> = [
  { description: "NaN", state: () => Number.NaN },
  { description: "positive infinity", state: () => Number.POSITIVE_INFINITY },
  { description: "negative infinity", state: () => Number.NEGATIVE_INFINITY },
  { description: "undefined", state: () => undefined },
  { description: "nested undefined", state: () => ({ nested: undefined }) },
  { description: "bigint", state: () => 1n },
  { description: "function", state: () => ({ dropped: () => undefined }) },
  { description: "symbol value", state: () => ({ dropped: Symbol("value") }) },
  {
    description: "symbol key",
    state: () => ({ [Symbol("dropped")]: "value" }),
  },
  {
    description: "sparse array",
    state: () => {
      const sparse: unknown[] = [];
      sparse.length = 1;
      return sparse;
    },
  },
  { description: "Date", state: () => new Date("2026-07-29T12:00:00.000Z") },
  { description: "Map", state: () => new Map([["key", "value"]]) },
  { description: "Set", state: () => new Set(["value"]) },
  {
    description: "cycle",
    state: () => {
      const cyclic: { self?: unknown } = {};
      cyclic.self = cyclic;
      return cyclic;
    },
  },
  {
    description: "non-enumerable property",
    state: () =>
      Object.defineProperty({}, "dropped", {
        value: "value",
        enumerable: false,
      }),
  },
  {
    description: "accessor property",
    state: () =>
      Object.defineProperty({}, "computed", {
        get: () => "value",
        enumerable: true,
      }),
  },
];

for (const { description, state } of invalidStates) {
  test(`canonicalization rejects ${description} before persistence`, () => {
    assert.throws(
      () => canonicalizeProjectionCandidate(rebuild(state())),
      (error) =>
        error instanceof TypeError &&
        /candidate\.state/.test(error.message),
    );
  });
}

const invalidTimes: ReadonlyArray<{
  readonly description: string;
  readonly candidate: () => ProjectionRebuild<unknown>;
  readonly expectedField: RegExp;
}> = [
  {
    description: "noncanonical candidate asOf",
    candidate: () => rebuild({}, { asOf: "2026-07-29T12:00:00Z" }),
    expectedField: /candidate\.asOf/,
  },
  {
    description: "invalid candidate asOf",
    candidate: () => rebuild({}, { asOf: "not-an-instant" }),
    expectedField: /candidate\.asOf/,
  },
  {
    description: "noncanonical staleness asOf",
    candidate: () =>
      rebuild({}, {
        staleness: {
          asOf: "2026-07-29T12:00:00Z",
          evaluatedAt: "2026-07-29T12:00:01.000Z",
          lagMilliseconds: 1_000,
        },
      }),
    expectedField: /candidate\.staleness\.asOf/,
  },
  {
    description: "noncanonical staleness evaluatedAt",
    candidate: () =>
      rebuild({}, {
        staleness: {
          asOf: "2026-07-29T12:00:00.000Z",
          evaluatedAt: "2026-07-29T12:00:01Z",
          lagMilliseconds: 1_000,
        },
      }),
    expectedField: /candidate\.staleness\.evaluatedAt/,
  },
];

for (const { description, candidate, expectedField } of invalidTimes) {
  test(`canonicalization rejects ${description}`, () => {
    assert.throws(
      () => canonicalizeProjectionCandidate(candidate()),
      (error) =>
        error instanceof TypeError &&
        expectedField.test(error.message),
    );
  });
}

test("canonicalization requires candidate and staleness asOf to match", () => {
  assert.throws(
    () =>
      canonicalizeProjectionCandidate(
        rebuild({}, {
          staleness: {
            asOf: null,
            evaluatedAt: "2026-07-29T12:00:01.000Z",
            lagMilliseconds: null,
          },
        }),
      ),
    (error) =>
      error instanceof TypeError &&
      /candidate\.staleness\.asOf must match candidate\.asOf/.test(
        error.message,
      ),
  );
});

test("canonicalization accepts matching null asOf values", () => {
  const candidate = canonicalizeProjectionCandidate(
    rebuild({}, {
      asOf: null,
      staleness: {
        asOf: null,
        evaluatedAt: "2026-07-29T12:00:01.000Z",
        lagMilliseconds: null,
      },
    }),
  );

  assert.equal(candidate.asOf, null);
  assert.equal(candidate.staleness.asOf, null);
});

test("the PostgreSQL adapter rejects an invalid stage before issuing SQL", async () => {
  const sqlCalls: string[] = [];
  const pool = {
    query: (sql: string) => {
      sqlCalls.push(sql);
      throw new Error("SQL must not be reached");
    },
  } as unknown as Pool;
  const store = new PostgresProjectionStore<unknown>(pool);

  await assert.rejects(
    store.stage(rebuild({ nested: undefined })),
    (error) =>
      error instanceof TypeError &&
      /candidate\.state/.test(error.message),
  );
  assert.deepEqual(sqlCalls, []);
});

test("the PostgreSQL adapter rejects an invalid promotion before connecting", async () => {
  let connectCalls = 0;
  const pool = {
    connect: () => {
      connectCalls += 1;
      throw new Error("SQL must not be reached");
    },
  } as unknown as Pool;
  const store = new PostgresProjectionStore<unknown>(pool);

  await assert.rejects(
    store.promote(rebuild({}, { asOf: "2026-07-29T12:00:00Z" })),
    (error) =>
      error instanceof TypeError &&
      /candidate\.asOf/.test(error.message),
  );
  assert.equal(connectCalls, 0);
});
