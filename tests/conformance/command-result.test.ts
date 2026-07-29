import assert from "node:assert/strict";
import test from "node:test";

import {
  accepted,
  conflict,
  duplicate,
  type CommandResult,
} from "../../packages/kernel/src/command-result.ts";

test("Accepted records the observable command outcome", () => {
  const result = accepted({
    commandId: "cmd-1",
    aggregateId: "aggregate-1",
    aggregateRevision: 3,
    eventIds: ["event-1"],
    value: { published: true },
  });

  assert.deepEqual(result, {
    status: "Accepted",
    commandId: "cmd-1",
    aggregateId: "aggregate-1",
    aggregateRevision: 3,
    eventIds: ["event-1"],
    value: { published: true },
  });
});

test("Duplicate preserves the complete original result", () => {
  const original = accepted({
    commandId: "cmd-original",
    aggregateId: "aggregate-1",
    aggregateRevision: 4,
    eventIds: ["event-1", "event-2"],
    value: { published: true },
  });

  const result = duplicate("cmd-retry", original);

  assert.equal(result.status, "Duplicate");
  assert.equal(result.commandId, "cmd-retry");
  assert.deepEqual(result.originalResult, original);
  assert.strictEqual(result.originalResult, original);
});

test("same idempotency identity with divergent payload produces Conflict", () => {
  const result: CommandResult<never> = conflict({
    commandId: "cmd-2",
    code: "TBS_IDEMPOTENCY_PAYLOAD_MISMATCH",
    expectedRevision: 2,
    actualRevision: 2,
  });

  assert.equal(result.status, "Conflict");
  assert.equal(result.code, "TBS_IDEMPOTENCY_PAYLOAD_MISMATCH");
});
