import assert from "node:assert/strict";
import test from "node:test";

import {
  createOpaqueId,
  sameLogicalIdentity,
  type CommandId,
  type EventId,
} from "../../packages/kernel/src/identity.ts";

test("opaque identities retain their stable logical value", () => {
  const first = createOpaqueId<CommandId>("cmd-001");
  const retry = createOpaqueId<CommandId>("cmd-001");

  assert.equal(first, "cmd-001");
  assert.equal(sameLogicalIdentity(first, retry), true);
});

test("identity constructor rejects empty and padded values", () => {
  assert.throws(() => createOpaqueId<EventId>(""), /non-empty/);
  assert.throws(() => createOpaqueId<EventId>(" event-1"), /canonical/);
});
