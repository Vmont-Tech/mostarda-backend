import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  canonicalHardwareValidationHash,
  createHardwareValidationRecord,
  type HardwareValidationRecord,
} from "../../packages/edge-hardware-validation/src/index.ts";
import { canonicalRecordHash, type DiscoveryRecord } from "../../packages/edge-discovery/src/index.ts";
import {
  canonicalHardwareProfileHash,
  type HardwareProfile,
} from "../../packages/edge-hardware-profile/src/index.ts";

type SealedDiscovery = DiscoveryRecord & { readonly recordHash: string; readonly sealedAt: string };

function loadDiscovery(): SealedDiscovery {
  const artifact = JSON.parse(fs.readFileSync(path.resolve("artifacts/edge-discovery/mxq-pro-4k-5g/discovery-2026-08-10.json"), "utf8")) as { discovery: SealedDiscovery };
  return artifact.discovery;
}

function loadProfile(): HardwareProfile {
  const artifact = JSON.parse(fs.readFileSync(path.resolve("artifacts/edge-hardware-profiles/mxq-pro-4k-5g/hardware-profile-candidate-2026-08-10.json"), "utf8")) as { profile: HardwareProfile };
  return artifact.profile;
}

function create(): HardwareValidationRecord {
  return createHardwareValidationRecord({
    discovery: loadDiscovery(),
    profile: loadProfile(),
    validatedAt: "2026-08-10T20:45:54.567Z",
  });
}

test("creates an incomplete validation record without mutating or promoting the candidate", () => {
  const record = create();

  assert.equal(record.validationState, "INCOMPLETE");
  assert.equal(record.operationalAuthorization, "BLOCKED");
  assert.equal(record.promotion.status, "BLOCKED");
  assert.equal(record.profileReference.lifecycleState, "CANDIDATE");
  assert.equal(record.profileReference.identityStatus, "PROVISIONAL");
  assert.deepEqual(record.profileReference.installationProfileReferences, []);
  assert.equal(record.methods.find((method) => method.id === "READ_ONLY_ADB")?.status, "UNAVAILABLE");
  assert.equal(record.methods.find((method) => method.id === "READ_ONLY_ADB")?.attempted, false);
});

test("preserves every source fact and does not promote declared or inferred observations", () => {
  const discovery = loadDiscovery();
  const record = create();

  assert.deepEqual(record.sourceFacts, discovery.facts);
  assert.equal(record.sourceFacts.length, 24);
  assert.ok(record.sourceFacts.some((fact) => fact.observationKind === "DECLARED"));
  assert.ok(record.sourceFacts.some((fact) => fact.observationKind === "INFERRED"));
  assert.equal(record.findings.some((finding) => finding.status === "VALIDATED"), false);
  assert.equal(record.findings.find((finding) => finding.factTypes.includes("memory.ram.total.physical"))?.status, "UNKNOWN");
  assert.equal(record.findings.find((finding) => finding.factTypes.includes("storage.usable.physical"))?.status, "UNKNOWN");
});

test("enumerates unresolved compatibility requirements with provenance and applicable non-invasive methods", () => {
  const discovery = loadDiscovery();
  const record = create();

  assert.ok(record.findings.length > 0);
  assert.deepEqual(record.missingDiscoveryRequirements, discovery.missingRequirements);
  assert.equal(record.missingDiscoveryRequirements.length, discovery.missingRequirements.length);
  for (const finding of record.findings) {
    assert.equal(finding.status, "UNKNOWN");
    assert.equal(finding.validationState, "UNRESOLVED");
    assert.ok(finding.applicableMethods.includes("READ_ONLY_ADB"));
    assert.ok(Array.isArray(finding.existingFactIds));
    assert.ok(Array.isArray(finding.evidenceReferences));
  }
  const boardFinding = record.findings.find((finding) => finding.requirementId === "HC-006");
  assert.ok(boardFinding);
  assert.ok(boardFinding.existingFactIds.includes("mxq-intake-board-identifier"));
  assert.equal(boardFinding.status, "UNKNOWN");
});

test("is reproducible and independently hashable", () => {
  const first = create();
  const second = create();

  assert.deepEqual(first, second);
  assert.equal(canonicalHardwareValidationHash(first), first.integrity.validationRecordHash);
  assert.equal(canonicalRecordHash(loadDiscovery()), loadDiscovery().recordHash);
  assert.equal(canonicalHardwareProfileHash(loadProfile()), loadProfile().integrity.profileHash);
});

test("rejects an unsealed or tampered Discovery before producing validation", () => {
  const discovery = loadDiscovery();
  const profile = loadProfile();

  assert.throws(
    () => createHardwareValidationRecord({
      discovery: { ...discovery, lifecycleState: "COMPLETE" },
      profile,
      validatedAt: "2026-08-10T20:45:54.567Z",
    }),
    /SEALED/i,
  );

  const tampered = {
    ...discovery,
    facts: discovery.facts.map((fact) => fact.factType === "board.identifier" ? { ...fact, value: "other" } : fact),
  };
  assert.throws(
    () => createHardwareValidationRecord({ discovery: tampered, profile, validatedAt: "2026-08-10T20:45:54.567Z" }),
    /recordHash/i,
  );
});

test("rejects a candidate whose profile hash or lifecycle was changed", () => {
  const discovery = loadDiscovery();
  const profile = loadProfile();

  assert.throws(
    () => createHardwareValidationRecord({
      discovery,
      profile: { ...profile, integrity: { ...profile.integrity, profileHash: "bad" } },
      validatedAt: "2026-08-10T20:45:54.567Z",
    }),
    /profileHash/i,
  );
  assert.throws(
    () => createHardwareValidationRecord({
      discovery,
      profile: { ...profile, lifecycleState: "PRODUCTION" },
      validatedAt: "2026-08-10T20:45:54.567Z",
    }),
    /CANDIDATE/i,
  );
});

test("does not expose installation, provisioning, or hardware authorization in the validation record", () => {
  const record = create();

  assert.equal("installationProfile" in record, false);
  assert.equal("provisioning" in record, false);
  assert.equal(record.compatibility.state, "UNKNOWN");
  assert.equal(record.compatibility.automaticProvisioning, "BLOCKED");
  assert.deepEqual(record.profileReference.installationProfileReferences, []);
});

test("freezes only the validation result and never freezes or mutates its inputs", () => {
  const discovery = loadDiscovery();
  const profile = loadProfile();
  const beforeFacts = structuredClone(discovery.facts);
  const beforeProfileHash = profile.integrity.profileHash;

  assert.equal(Object.isFrozen(discovery), false);
  assert.equal(Object.isFrozen(discovery.facts), false);
  const record = createHardwareValidationRecord({
    discovery,
    profile,
    validatedAt: "2026-08-10T20:45:54.567Z",
  });

  assert.equal(Object.isFrozen(record), true);
  assert.equal(Object.isFrozen(record.sourceFacts), true);
  assert.equal(Object.isFrozen(discovery), false);
  assert.equal(Object.isFrozen(discovery.facts), false);
  assert.deepEqual(discovery.facts, beforeFacts);
  assert.equal(profile.integrity.profileHash, beforeProfileHash);
});

test("committed validation artifact is reproduced byte-for-byte", () => {
  const artifactPath = path.resolve("artifacts/edge-hardware-validation/mxq-pro-4k-5g/hardware-validation-2026-08-10.json");
  if (!fs.existsSync(artifactPath)) return;
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8")) as { validation: HardwareValidationRecord };
  assert.deepEqual(artifact.validation, create());
  assert.equal(canonicalHardwareValidationHash(artifact.validation), artifact.validation.integrity.validationRecordHash);
});
