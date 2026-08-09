import test from "node:test";
import assert from "node:assert/strict";
import {
  composeAndSealDiscovery,
  createInitialMxqIntake,
  type AdbTransport,
  collectAndroidFacts,
} from "../../packages/edge-discovery/src/index.ts";
import {
  createProcessAdbTransport,
  parseArguments,
  runDiscoveryWithTransport,
} from "../../scripts/edge-discovery.ts";

test("composed discovery seals facts without compatibility or profile classification", async () => {
  const intake = createInitialMxqIntake({
    discoveryId: "disc-mxq-integration-001",
    startedAt: "2026-08-09T12:20:00.000Z",
    capturedAt: "2026-08-09T12:20:01.000Z",
    evidenceReference: "lab-intake:mxq-pro-001",
  });
  const outputs = new Map<string, string>([
    ["getprop ro.product.model", "Nex30\n"],
    ["getprop ro.build.version.release", "13.0\n"],
    ["getprop ro.board.platform", "rk322x\n"],
    ["cat /proc/cpuinfo", "Processor : ARMv7 Processor rev 0 (v7l)\n"],
    ["cat /proc/meminfo", "MemTotal:        1048576 kB\n"],
  ]);
  const transport: AdbTransport = {
    async exec(command) {
      return { stdout: outputs.get(command) ?? "", stderr: "", exitCode: 0 };
    },
  };
  const collection = await collectAndroidFacts(transport, {
    collectedAt: "2026-08-09T12:20:02.000Z",
    targetReference: "mxq-pro-4k-5g-lab-001",
    evidenceReference: "adb:mxq-pro-001",
  });

  const sealed = composeAndSealDiscovery(intake, collection, "2026-08-09T12:20:03.000Z");

  assert.equal(sealed.lifecycleState, "SEALED");
  assert.match(sealed.recordHash, /^[a-f0-9]{64}$/);
  assert.ok(sealed.facts.some((fact) => fact.factType === "soc.model" && fact.value === "rk322x"));
  assert.ok(sealed.facts.some((fact) => fact.factType === "memory.ram.total.physical"));
  assert.ok(sealed.missingRequirements.length > 0);
  assert.equal("classification" in sealed, false);
  assert.equal("hardwareProfile" in sealed, false);
});

test("laboratory runner composes a read-only discovery from an injected transport", async () => {
  const result = await runDiscoveryWithTransport({
    discoveryId: "disc-mxq-runner-001",
    startedAt: "2026-08-09T12:30:00.000Z",
    capturedAt: "2026-08-09T12:30:01.000Z",
    sealedAt: "2026-08-09T12:30:02.000Z",
    evidenceReference: "adb:mxq-pro-001",
    targetReference: "mxq-pro-4k-5g-lab-001",
  }, {
    async exec(command) {
      return { stdout: command === "getprop ro.product.model" ? "Nex30\n" : "", stderr: "", exitCode: 0 };
    },
  });

  assert.equal(result.lifecycleState, "SEALED");
  assert.equal(result.facts.find((fact) => fact.factType === "software.device_model")?.value, "Nex30");
});

test("CLI requires an explicit ADB serial and never accepts an empty target", () => {
  assert.deepEqual(parseArguments(["--serial", "192.168.1.50:5555"]), {
    serial: "192.168.1.50:5555",
    evidenceReference: "adb:192.168.1.50:5555",
  });
  assert.throws(() => parseArguments([]), /usage:/i);
  assert.throws(() => createProcessAdbTransport(""), /serial must not be empty/i);
});
