import assert from "node:assert/strict";
import test from "node:test";

import { buildServer } from "../../apps/cloud-api/src/server.ts";

test("health exposes a live foundation runtime", async () => {
  const server = buildServer();
  const response = await server.inject({ method: "GET", url: "/health" });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    service: "mostarda-cloud-api",
    status: "ok",
  });
  await server.close();
});

test("readiness reports unavailable production dependencies honestly", async () => {
  const server = buildServer({ eventStoreProbe: async () => false });
  const response = await server.inject({ method: "GET", url: "/ready" });

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.json(), {
    status: "not-ready",
    dependencies: {
      eventStore: "unavailable",
    },
  });
  await server.close();
});

test("readiness recovers when the Event Store probe succeeds", async () => {
  let ready = false;
  const server = buildServer({ eventStoreProbe: async () => ready });

  const unavailable = await server.inject({ method: "GET", url: "/ready" });
  ready = true;
  const available = await server.inject({ method: "GET", url: "/ready" });

  assert.equal(unavailable.statusCode, 503);
  assert.equal(available.statusCode, 200);
  assert.equal(available.json().dependencies.eventStore, "available");
  await server.close();
});

test("readiness probe is timeout-bounded", async () => {
  const server = buildServer({
    eventStoreProbe: async () => new Promise(() => undefined),
    readinessTimeoutMs: 5,
  });

  const response = await server.inject({ method: "GET", url: "/ready" });

  assert.equal(response.statusCode, 503);
  await server.close();
});

test("capability manifest refuses blocked aggregate implementation", async () => {
  const server = buildServer();
  const response = await server.inject({
    method: "GET",
    url: "/v1/implementation-capabilities",
  });
  const body = response.json();

  assert.equal(response.statusCode, 200);
  assert.equal(body.kernel, "IMPLEMENTATION_READY");
  assert.equal(body.governanceCaseAggregate, "IMPLEMENTATION_PARTIAL");
  assert.equal(body.responsibilityValues, "IMPLEMENTATION_READY");
  assert.equal(
    body.responsibilityDecision,
    "BLOCKED_BY_PARTIAL_DEPENDENCY",
  );
  assert.equal(body.domainCommandsEnabled, false);
});
