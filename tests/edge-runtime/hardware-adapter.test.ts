import assert from "node:assert/strict";
import test from "node:test";

import { HostHardwareAdapter } from "../../packages/edge-runtime/src/index.ts";

test("host hardware adapter reports local software facts without claiming MXQ validation", async () => {
  const result = await new HostHardwareAdapter(process.cwd()).discover();

  assert.equal(result.validationStatus, "SOFTWARE_VERIFIED");
  assert.equal(result.physicalHardwareStatus, "NOT_PERFORMED");
  assert.equal(result.hardwareModel.status, "UNKNOWN");
  assert.equal(result.hardwareModel.value, null);
  assert.equal(result.capabilities.gpu.status, "UNKNOWN");
  assert.equal(result.capabilities.display.status, "UNKNOWN");
  assert.equal(result.capabilities.codecs.status, "UNKNOWN");
  assert.equal(result.facts.os.status, "PASS");
  assert.equal(result.facts.architecture.status, "PASS");
  assert.ok(result.facts.networkInterfaces.value.length >= 0);
});

test("hardware adapter keeps missing physical capabilities explicit", async () => {
  const result = await new HostHardwareAdapter(process.cwd()).discover();
  const unknowns = Object.values(result.capabilities).filter((fact) => fact.status === "UNKNOWN");

  assert.equal(unknowns.length, Object.keys(result.capabilities).length);
  assert.equal(result.mxqProvisioning, "BLOCKED");
});
