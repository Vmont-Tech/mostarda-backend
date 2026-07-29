import assert from "node:assert/strict";
import test from "node:test";

import {
  rebuildProjection,
  type ProjectionDefinition,
} from "../../packages/kernel/src/projection.ts";

type Total = { readonly total: number };

const projection: ProjectionDefinition<Total, number> = {
  name: "total",
  version: 1,
  initialState: { total: 0 },
  apply: (state, value) => ({ total: state.total + value }),
};

test("rebuild returns isolated state and checkpoint without side effects", () => {
  let externallyPublished = 0;

  const result = rebuildProjection({
    definition: projection,
    events: [
      { position: 10n, occurredAt: "2026-07-29T10:00:00.000Z", value: 2 },
      { position: 11n, occurredAt: "2026-07-29T10:01:00.000Z", value: 3 },
    ],
    rebuildId: "rebuild-1",
    evaluatedAt: "2026-07-29T10:02:00.000Z",
  });

  assert.equal(externallyPublished, 0);
  assert.deepEqual(result, {
    projectionName: "total",
    projectionVersion: 1,
    state: { total: 5 },
    checkpoint: 11n,
    asOf: "2026-07-29T10:01:00.000Z",
    staleness: {
      asOf: "2026-07-29T10:01:00.000Z",
      evaluatedAt: "2026-07-29T10:02:00.000Z",
      lagMilliseconds: 60_000,
    },
    rebuildId: "rebuild-1",
    rebuildStatus: "COMPLETED_AWAITING_PROMOTION",
  });
});

test("out-of-order projection input aborts rebuild", () => {
  assert.throws(
    () =>
      rebuildProjection({
        definition: projection,
        events: [
          { position: 10n, occurredAt: "2026-07-29T10:00:00.000Z", value: 2 },
          { position: 9n, occurredAt: "2026-07-29T10:01:00.000Z", value: 3 },
        ],
        rebuildId: "rebuild-2",
        evaluatedAt: "2026-07-29T10:02:00.000Z",
      }),
    /strictly ordered/,
  );
});
