import assert from "node:assert/strict";
import test from "node:test";

import {
  accepted,
  conflict,
  duplicate,
  expired,
  invariantViolation,
  rejected,
  unauthorized,
  type CommandResult,
} from "../../packages/kernel/src/command-result.ts";

test("Accepted records the observable command outcome", () => {
  const result = accepted({
    commandId: "cmd-1",
    aggregateId: "aggregate-1",
    observedRevision: 2n,
    newRevision: 3n,
    correlationId: "correlation-1",
    causationId: "cause-1",
    errors: [],
    eventIds: ["event-1"],
    value: { published: true },
  });

  assert.deepEqual(result, {
    status: "Accepted",
    commandId: "cmd-1",
    aggregateId: "aggregate-1",
    observedRevision: 2n,
    newRevision: 3n,
    correlationId: "correlation-1",
    causationId: "cause-1",
    errors: [],
    eventIds: ["event-1"],
    value: { published: true },
  });
});

test("all normative non-success outcomes have deterministic factories", () => {
  const base = {
    commandId: "cmd-3",
    aggregateId: "aggregate-1",
    observedRevision: 2n,
    correlationId: "correlation-1",
    causationId: "cause-1",
    errors: [],
    eventIds: [],
    code: "FIXTURE_ERROR",
  };

  assert.equal(rejected(base).status, "Rejected");
  assert.equal(expired(base).status, "Expired");
  assert.equal(unauthorized(base).status, "Unauthorized");
  assert.equal(invariantViolation(base).status, "InvariantViolation");
});

test("Duplicate preserves the complete original result", () => {
  const original = accepted({
    commandId: "cmd-original",
    aggregateId: "aggregate-1",
    observedRevision: 3n,
    newRevision: 4n,
    correlationId: "correlation-1",
    causationId: "cause-1",
    errors: [],
    eventIds: ["event-1", "event-2"],
    value: { published: true },
  });

  const result = duplicate(original);

  assert.equal(result.status, "Duplicate");
  assert.equal(result.commandId, "cmd-original");
  assert.deepEqual(result.eventIds, ["event-1", "event-2"]);
  assert.deepEqual(result.originalResult, original);
  assert.strictEqual(result.originalResult, original);
});

test("same idempotency identity with divergent payload produces Conflict", () => {
  const result: CommandResult<never> = conflict({
    commandId: "cmd-2",
    aggregateId: "aggregate-1",
    observedRevision: 2n,
    correlationId: "correlation-1",
    causationId: "cause-1",
    errors: [],
    eventIds: [],
    code: "TBS_IDEMPOTENCY_PAYLOAD_MISMATCH",
    expectedRevision: 2n,
    actualRevision: 2n,
  });

  assert.equal(result.status, "Conflict");
  assert.equal(result.code, "TBS_IDEMPOTENCY_PAYLOAD_MISMATCH");
});

test("factories own their discriminant and enforce result invariants", () => {
  const input = {
    commandId: "cmd-runtime",
    aggregateId: "aggregate-1",
    observedRevision: 0n,
    newRevision: 1n,
    correlationId: "correlation-1",
    causationId: null,
    errors: [],
    eventIds: ["event-1"],
    value: null,
    status: "Rejected",
  } as any;
  assert.equal(accepted(input).status, "Accepted");
  assert.throws(() => accepted({ ...input, newRevision: null }), /newRevision/);
  assert.throws(() => rejected({ ...input, code: "FAILED" }), /cannot publish Events/);
  assert.throws(() => conflict({ ...input, code: "CONFLICT" }), /cannot publish Events/);
});
