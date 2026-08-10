import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  canonicalHardwareProfileHash,
  createHardwareProfileCandidate,
  type HardwareProfile,
} from "../../packages/edge-hardware-profile/src/index.ts";
import {
  canonicalEvidenceRoot,
  canonicalRecordHash,
  type DiscoveryRecord,
} from "../../packages/edge-discovery/src/index.ts";

function loadSealedDiscovery(): DiscoveryRecord & { readonly recordHash: string; readonly sealedAt: string } {
  const artifactPath = path.resolve("artifacts/edge-discovery/mxq-pro-4k-5g/discovery-2026-08-10.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8")) as {
    discovery: DiscoveryRecord & { readonly recordHash: string; readonly sealedAt: string };
  };
  return artifact.discovery;
}

function loadCandidateArtifact(): HardwareProfile {
  const artifactPath = path.resolve("artifacts/edge-hardware-profiles/mxq-pro-4k-5g/hardware-profile-candidate-2026-08-10.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8")) as { profile: HardwareProfile };
  return artifact.profile;
}

function capability(profile: HardwareProfile, key: string) {
  const candidate = profile.capabilitySet[key as keyof HardwareProfile["capabilitySet"]];
  if (!candidate) throw new Error(`missing capability ${key}`);
  return candidate;
}

test("creates only a CANDIDATE profile from the sealed MXQ Discovery", () => {
  const discovery = loadSealedDiscovery();
  const profile = createHardwareProfileCandidate(discovery);

  assert.equal(profile.lifecycleState, "CANDIDATE");
  assert.equal(profile.profileVersion, "profile-v1");
  assert.equal(profile.discoveryReference.discoveryId, discovery.discoveryId);
  assert.equal(profile.discoveryReference.discoveryRecordHash, discovery.recordHash);
  assert.equal(profile.discoveryReference.evidenceRoot, discovery.evidenceRoot);
  assert.equal(profile.discoveryReference.discoverySchemaVersion, discovery.schemaVersion);
  assert.equal(profile.hardwareIdentity.identityStatus, "PROVISIONAL");
  assert.equal(profile.hardwareIdentity.fingerprint.validationState, "UNRESOLVED");
  assert.equal(profile.installationProfileReferences.length, 0);
  assert.equal(profile.operationalAuthorization, "BLOCKED");
  assert.equal(profile.homologation.status, "NOT_EXECUTED");
  assert.equal(profile.integrity.verificationState, "UNSIGNED_CANDIDATE");
});

test("preserves every Discovery Fact and its provenance without promoting declarations", () => {
  const discovery = loadSealedDiscovery();
  const profile = createHardwareProfileCandidate(discovery);

  assert.deepEqual(profile.discoverySnapshot.facts, discovery.facts);
  assert.equal(profile.discoverySnapshot.conflicts.length, discovery.conflicts.length);
  assert.equal(profile.knownObservations.length, discovery.facts.length);

  const ram = capability(profile, "ram");
  const storage = capability(profile, "storage");
  assert.equal(ram.status, "UNKNOWN");
  assert.equal(ram.validationState, "UNRESOLVED");
  assert.equal(storage.status, "UNKNOWN");
  assert.equal(storage.validationState, "UNRESOLVED");
  assert.equal(ram.value, null);
  assert.equal(storage.value, null);
  assert.ok(ram.provenanceFactIds.includes("mxq-intake-memory-ram-total"));
  assert.ok(storage.provenanceFactIds.includes("mxq-intake-storage-nominal"));
});

test("keeps all hardware capabilities unknown when the sealed Discovery has no validated facts", () => {
  const profile = createHardwareProfileCandidate(loadSealedDiscovery());

  for (const [key, candidate] of Object.entries(profile.capabilitySet)) {
    assert.equal(candidate.status, "UNKNOWN", `${key} must remain unknown`);
    assert.notEqual(candidate.validationState, "VERIFIED", `${key} must not be verified`);
  }
  assert.deepEqual(profile.installationProfileReferences, []);
  assert.equal(profile.compatibilityReference.evaluationState, "UNKNOWN");
  assert.equal(profile.compatibilityReference.automaticProvisioning, "BLOCKED");
});

test("derives a reproducible fingerprint and profile hash from the same sealed Discovery", () => {
  const discovery = loadSealedDiscovery();
  const first = createHardwareProfileCandidate(discovery);
  const second = createHardwareProfileCandidate(discovery);

  assert.deepEqual(second, first);
  assert.equal(canonicalHardwareProfileHash(first), first.integrity.profileHash);
  assert.match(first.hardwareIdentity.fingerprint.value, /^[a-f0-9]{64}$/);
  assert.deepEqual(first.hardwareIdentity.fingerprint.inputFactIds, [
    "mxq-intake-board-identifier",
    "mxq-intake-cpu-architecture",
    "mxq-intake-soc-family",
  ]);
});

test("rejects an unsealed, tampered, or legacy Discovery record", () => {
  const sealed = loadSealedDiscovery();

  assert.throws(
    () => createHardwareProfileCandidate({ ...sealed, lifecycleState: "COMPLETE" }),
    /SEALED/i,
  );

  const tampered = { ...sealed, facts: sealed.facts.map((fact) => fact.factType === "board.identifier" ? { ...fact, value: "other-board" } : fact) };
  assert.throws(() => createHardwareProfileCandidate(tampered), /recordHash/i);

  const legacy = { ...sealed, schemaVersion: "hardware-discovery-schema-v1" };
  assert.throws(() => createHardwareProfileCandidate(legacy), /schema/i);
});

test("does not create a candidate from a conflicted Discovery", () => {
  const sealed = loadSealedDiscovery();
  const conflicted = {
    ...sealed,
    lifecycleState: "SEALED" as const,
    conflicts: [{
      conflictId: "conflict-1",
      factType: "board.identifier",
      observations: [],
      conflictKind: "VALUE_MISMATCH" as const,
      deterministicResolution: "NO_SELECTION_ALL_OBSERVATIONS_PRESERVED" as const,
      blockingScope: "FACT_TYPE" as const,
      createdAt: sealed.sealedAt,
    }],
  };
  conflicted.recordHash = canonicalRecordHash(conflicted);
  assert.throws(() => createHardwareProfileCandidate(conflicted), /conflict/i);
});

test("the candidate artifact is not an InstallationProfile or provisioning authorization", () => {
  const profile = createHardwareProfileCandidate(loadSealedDiscovery());

  assert.equal("installationProfile" in profile, false);
  assert.equal("provisioningPlan" in profile, false);
  assert.equal(profile.lifecycleState === "PRODUCTION" || profile.lifecycleState === "PREFERRED", false);
  assert.equal(profile.operationalAuthorization, "BLOCKED");
});

test("Discovery hashes remain valid when used as the profile source", () => {
  const discovery = loadSealedDiscovery();
  assert.equal(canonicalEvidenceRoot(discovery.facts), discovery.evidenceRoot);
  assert.equal(canonicalRecordHash(discovery), discovery.recordHash);
});

test("the committed candidate artifact is reproduced exactly from the sealed Discovery", () => {
  const generated = createHardwareProfileCandidate(loadSealedDiscovery());
  const artifact = loadCandidateArtifact();

  assert.deepEqual(artifact, generated);
  assert.equal(canonicalHardwareProfileHash(artifact), artifact.integrity.profileHash);
  assert.equal(artifact.lifecycleState, "CANDIDATE");
  assert.equal(artifact.operationalAuthorization, "BLOCKED");
});
