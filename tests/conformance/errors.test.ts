import assert from "node:assert/strict";
import test from "node:test";

import { defineError, ERROR_FAMILIES } from "../../packages/kernel/src/errors.ts";

test("Error families match the complete normative TBS catalog", () => {
  assert.deepEqual(ERROR_FAMILIES, [
    "AUTHORIZATION",
    "VALIDATION",
    "INVARIANT",
    "CONCURRENCY",
    "IDEMPOTENCY",
    "EXPIRATION",
    "REPLAY",
    "SCHEMA",
    "PERSISTENCE_PUBLICATION",
    "PROJECTION_REBUILD",
    "SAGA_COORDINATION",
  ]);
});

test("Error descriptor preserves every mandatory TBS field", () => {
  const descriptor = defineError({
    code: "TBS_CONCURRENCY_WRONG_REVISION",
    family: "CONCURRENCY",
    meaning: "The observed Aggregate revision differs from ExpectedRevision.",
    condition: "actualRevision !== expectedRevision",
    retryable: false,
    recoverable: true,
    severity: "ERROR",
    consumer: "CommandHandler",
    relatedIdentity: "aggregate-1",
    safeContext: { expectedRevision: 1, actualRevision: 2 },
    version: 1,
  });

  assert.equal(descriptor.code, "TBS_CONCURRENCY_WRONG_REVISION");
  assert.equal(descriptor.recoverable, true);
  assert.deepEqual(descriptor.safeContext, {
    expectedRevision: 1,
    actualRevision: 2,
  });
});

test("invalid Error descriptor fails explicitly", () => {
  assert.throws(
    () =>
      defineError({
        code: "human message",
        family: "VALIDATION",
        meaning: "",
        condition: "",
        retryable: false,
        recoverable: false,
        severity: "",
        consumer: "",
        relatedIdentity: null,
        safeContext: {},
        version: 0,
      }),
    /descriptor/i,
  );
});
