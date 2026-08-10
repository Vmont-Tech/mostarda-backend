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
import { canonicalEvidenceRoot } from "../../packages/edge-discovery/src/record.ts";

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
  assert.match(sealed.evidenceRoot, /^[a-f0-9]{64}$/);
  assert.equal(sealed.evidenceRoot, canonicalEvidenceRoot(sealed.facts));
  assert.notEqual(sealed.evidenceRoot, sealed.recordHash);
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

test("physical runner fails instead of sealing when ADB produces no facts", async () => {
  await assert.rejects(
    () => runDiscoveryWithTransport({
      discoveryId: "disc-mxq-runner-unavailable-001",
      startedAt: "2026-08-09T12:31:00.000Z",
      capturedAt: "2026-08-09T12:31:01.000Z",
      sealedAt: "2026-08-09T12:31:02.000Z",
      evidenceReference: "adb:mxq-pro-unavailable",
      targetReference: "mxq-pro-4k-5g-lab-001",
    }, {
      async exec() {
        return { stdout: "", stderr: "adb unavailable", exitCode: 1 };
      },
    }),
    /ADB discovery failed.*no facts/i,
  );
});

test("process ADB transport rejects non-read-only commands before execution", async () => {
  const transport = createProcessAdbTransport("mxq-test");

  await assert.rejects(
    () => transport.exec("pm install evil.apk"),
    /not allow-listed for read-only discovery/i,
  );
});

test("CLI requires an explicit ADB serial and never accepts an empty target", () => {
  assert.deepEqual(parseArguments(["--serial", "192.168.1.50:5555"]), {
    serial: "192.168.1.50:5555",
    evidenceReference: "adb:192.168.1.50:5555",
  });
  assert.throws(() => parseArguments([]), /usage:/i);
  assert.throws(() => createProcessAdbTransport(""), /serial must not be empty/i);
});

function collectionWithModel(model: string): Promise<Awaited<ReturnType<typeof collectAndroidFacts>>> {
  return collectAndroidFacts({
    async exec(command) {
      return command === "getprop ro.product.model"
        ? { stdout: `${model}\n`, stderr: "", exitCode: 0 }
        : { stdout: "", stderr: "", exitCode: 0 };
    },
  }, {
    collectedAt: "2026-08-09T12:40:00.000Z",
    targetReference: "mxq-pro-4k-5g-lab-001",
    evidenceReference: "adb:mxq-pro-001",
  });
}

test("correlation preserves corroborating facts without creating a conflict", async () => {
  const intake = createInitialMxqIntake({
    discoveryId: "disc-mxq-correlation-same-001",
    startedAt: "2026-08-09T12:40:00.000Z",
    capturedAt: "2026-08-09T12:40:00.000Z",
    evidenceReference: "user-provided-images:mxq-system-and-network",
  });
  const collection = await collectionWithModel("Nex30");
  const first = composeAndSealDiscovery(intake, collection, "2026-08-09T12:40:01.000Z");
  const second = composeAndSealDiscovery(intake, collection, "2026-08-09T12:40:01.000Z");

  assert.equal(first.conflicts.length, 0);
  assert.equal(first.facts.filter((fact) => fact.factType === "software.device_model").length, 2);
  assert.equal(first.recordHash, second.recordHash);
  assert.equal(first.evidenceRoot, second.evidenceRoot);
});

test("correlation preserves both values and seals an explicit conflict", async () => {
  const intake = createInitialMxqIntake({
    discoveryId: "disc-mxq-correlation-conflict-001",
    startedAt: "2026-08-09T12:41:00.000Z",
    capturedAt: "2026-08-09T12:41:00.000Z",
    evidenceReference: "user-provided-images:mxq-system-and-network",
  });
  const collection = await collectionWithModel("DifferentModel");
  const sealed = composeAndSealDiscovery(intake, collection, "2026-08-09T12:41:01.000Z");
  const repeated = composeAndSealDiscovery(intake, collection, "2026-08-09T12:41:01.000Z");

  assert.equal(sealed.lifecycleState, "SEALED");
  assert.equal(sealed.conflicts.length, 1);
  const conflict = sealed.conflicts[0];
  assert.ok(conflict);
  assert.equal(conflict.factType, "software.device_model");
  assert.equal(conflict.conflictKind, "VALUE_MISMATCH");
  assert.equal(conflict.observations.length, 2);
  assert.equal(conflict.deterministicResolution, "NO_SELECTION_ALL_OBSERVATIONS_PRESERVED");
  assert.equal(sealed.recordHash, repeated.recordHash);
  assert.equal(sealed.evidenceRoot, repeated.evidenceRoot);
  assert.equal(sealed.conflicts[0]?.conflictId, repeated.conflicts[0]?.conflictId);
  assert.deepEqual(
    sealed.facts.filter((fact) => fact.factType === "software.device_model").map((fact) => fact.value).sort(),
    ["DifferentModel", "Nex30"],
  );
});

test("correlation does not create a conflict when only one source exists", async () => {
  const intake = createInitialMxqIntake({
    discoveryId: "disc-mxq-correlation-single-001",
    startedAt: "2026-08-09T12:42:00.000Z",
    capturedAt: "2026-08-09T12:42:00.000Z",
    evidenceReference: "user-provided-images:mxq-system-and-network",
  });
  const collection = await collectAndroidFacts({
    async exec() {
      return { stdout: "", stderr: "", exitCode: 0 };
    },
  }, {
    collectedAt: "2026-08-09T12:42:00.000Z",
    targetReference: "mxq-pro-4k-5g-lab-001",
    evidenceReference: "adb:mxq-pro-001",
  });
  const sealed = composeAndSealDiscovery(intake, collection, "2026-08-09T12:42:01.000Z");

  assert.equal(sealed.conflicts.length, 0);
  assert.equal(sealed.facts.filter((fact) => fact.factType === "software.device_model").length, 1);
});
