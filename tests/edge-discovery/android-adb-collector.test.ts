import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  READ_ONLY_ANDROID_COMMANDS,
  assertReadOnlyAndroidCommand,
  collectAndroidFacts,
  type AdbTransport,
} from "../../packages/edge-discovery/src/android-adb-collector.ts";

test("collector executes only the declared read-only Android commands", async () => {
  const commands: string[] = [];
  const transport: AdbTransport = {
    async exec(command) {
      commands.push(command);
      return { stdout: "", stderr: "", exitCode: 0 };
    },
  };

  await collectAndroidFacts(transport, {
    collectedAt: "2026-08-09T12:10:00.000Z",
    targetReference: "mxq-pro-4k-5g-lab-001",
    evidenceReference: "adb:mxq-pro-001",
  });

  assert.ok(commands.length > 0);
  assert.ok(commands.every((command) => READ_ONLY_ANDROID_COMMANDS.has(command)));
  assert.throws(() => assertReadOnlyAndroidCommand("dd if=/dev/zero of=/dev/block/mmcblk0"), /not allow-listed/i);
  assert.throws(() => assertReadOnlyAndroidCommand("pm install evil.apk"), /not allow-listed/i);
});

test("unavailable optional probes become typed missing observations", async () => {
  const transport: AdbTransport = {
    async exec(command) {
      if (command === "getprop ro.product.model") {
        return { stdout: "Nex30\n", stderr: "", exitCode: 0 };
      }
      return { stdout: "", stderr: "command unavailable\n", exitCode: 127 };
    },
  };

  const result = await collectAndroidFacts(transport, {
    collectedAt: "2026-08-09T12:10:00.000Z",
    targetReference: "mxq-pro-4k-5g-lab-001",
    evidenceReference: "adb:mxq-pro-001",
  });

  assert.equal(result.facts.find((fact) => fact.factType === "software.device_model")?.value, "Nex30");
  assert.ok(result.missingRequirements.includes("cpu.architecture.effective"));
  assert.ok(result.failures.some((failure) => failure.code === "SOURCE_UNREADABLE"));
});

test("ADB facts explicitly mark observation time as unavailable and digest the raw result", async () => {
  const result = await collectAndroidFacts({
    async exec(command) {
      return command === "getprop ro.product.model"
        ? { stdout: "Nex30\n", stderr: "", exitCode: 0 }
        : { stdout: "", stderr: "", exitCode: 0 };
    },
  }, {
    collectedAt: "2026-08-09T12:10:00.000Z",
    targetReference: "mxq-pro-4k-5g-lab-001",
    evidenceReference: "adb:mxq-pro-001",
  });

  const fact = result.facts.find((candidate) => candidate.factType === "software.device_model");
  assert.ok(fact);
  assert.equal(fact.observedAt, null);
  const expectedDigest = createHash("sha256")
    .update(JSON.stringify({
      command: "getprop ro.product.model",
      stdout: "Nex30\n",
      stderr: "",
      exitCode: 0,
    }))
    .digest("hex");
  assert.equal(fact.evidence.digest, expectedDigest);
});
