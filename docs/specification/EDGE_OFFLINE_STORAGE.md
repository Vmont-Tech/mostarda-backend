# Mostarda Edge — Local Content Store Specification

**Status:** DRAFT
**Version:** 1.0.0
**Owner:** Mostarda Architecture
**Prerequisites:** `EDGE_HARDWARE_PROFILES.md`, `EDGE_INSTALLATION_PROFILES.md`, `EDGE_OS_SPECIFICATION.md`, `EDGE_SECURITY.md`, `EDGE_PLAYER_SPECIFICATION.md`, `EDGE_OTA.md`, `EDGE_RECOVERY.md`
**Scope:** local content persistence, offline playback, atomic snapshots, integrity, capacity and recovery

---

## 1. Purpose

This document defines the normative contract for the Mostarda Edge Local Content Store.

The Local Content Store is the authoritative local persistence layer for manifests, assets, playback readiness and previously validated fallback content. It is designed so that a low-resource TV Box can continue displaying content that was already validated even when it is completely disconnected from the Internet.

It defines:

- ownership and architectural responsibility;
- filesystem and logical storage layout;
- capacity sizing and reserved space;
- separation from OS, Runtime, identity, OTA, Recovery and telemetry storage;
- manifest and asset structure;
- content lifecycle and integrity states;
- staging, verification and atomic commit;
- immutable snapshots, Active Snapshot and Previous Known-Good Snapshot;
- fallback, expiration, revocation and garbage collection;
- quotas and full-storage protection;
- hashes, digests and optional at-rest encryption;
- reboot, power-loss, corruption and Recovery behavior;
- offline operation and reconnection;
- storage migration and OTA integration;
- `ContentStoreResult`, telemetry, errors and `STG-*` requirements.

The Local Content Store is not a browser cache, a generic file directory or an executable package manager.

---

## 2. Architectural Boundary

The authoritative content path is:

```text
Cloud / Control Plane
          |
          v
Edge Runtime Sync and Verification
          |
          v
Local Content Store
          |
          v
Player Web / HTML5
          |
          v
Display
```

### 2.1 Local Content Store owns

The Local Content Store owns:

- local persistence of authorized content packages;
- manifest and asset integrity metadata;
- staged package lifecycle;
- immutable snapshot construction;
- Active Snapshot and Previous Known-Good Snapshot references;
- quotas, reserved capacity and content garbage collection;
- content expiration and revocation application;
- recovery of the store after restart, power loss or corruption;
- content-store-specific telemetry and `ContentStoreResult`.

### 2.2 Edge Runtime owns

Edge Runtime owns synchronization orchestration and authenticated communication with Cloud. It supplies packages and commands to the Local Content Store and consumes store results. It does not bypass store verification or write active content directly.

### 2.3 Player owns

Player reads only a committed, authorized snapshot through the Local Content Store interface. Player does not download content from the Internet, mutate snapshots, run garbage collection or reinterpret integrity states.

### 2.4 Security, OTA and Recovery

- Security owns trust anchors, keys, encryption policy, authorization and revocation trust.
- OTA owns system/Runtime/Player update orchestration and coordinates content policy without erasing content implicitly.
- Recovery owns recovery execution and may request store repair or restoration through the Recovery Plan.

### 2.5 Explicit non-responsibilities

The Local Content Store shall not:

- decide Campaign, Pricing, Settlement, Financial or responsibility rules;
- create Playback Evidence;
- select a Hardware Profile or Installation Profile;
- treat browser cache or a network URL as authoritative content;
- activate a partial or unverified package;
- delete active or Previous Known-Good content to make room for a new package;
- erase identity, OS, Runtime or telemetry data as ordinary garbage collection;
- invent fallback content or schedules.

---

## 3. Storage Roles and Layout

The concrete filesystem and partition implementation is Hardware Profile-specific. The logical roles and protection boundaries are normative.

```text
STORAGE DEVICE
|
|- BOOT
|- SYSTEM / EDGE_OS
|- RUNTIME
|- IDENTITY
|- RECOVERY
|- OTA_STAGING
|- TELEMETRY_QUEUE
|- LOGS
|- CONFIGURATION
`- LOCAL_CONTENT_STORE
    |- MANIFESTS
    |- ASSETS
    |- SNAPSHOTS
    |- ACTIVE_POINTER
    |- PREVIOUS_KNOWN_GOOD_POINTER
    |- QUARANTINE
    |- STORE_JOURNAL
    `- STORE_INDEX
```

### 3.1 Separation invariants

The Local Content Store shall not consume capacity reserved for:

```text
boot
Edge OS
Runtime
identity and DeviceKey references
Recovery
OTA staging
telemetry queue
logs
mandatory configuration
```

The OS shall expose nominal, usable, reserved and available capacity separately. A filesystem path or browser origin is not sufficient to prove logical separation.

### 3.2 Filesystem contract

The Hardware Profile and Installation Profile shall declare:

```text
storage_device_binding
filesystem_contract
mount_or_access_mode
integrity_behavior
encryption_behavior
power_loss_behavior
recovery_behavior
```

The Local Content Store implementation shall not assume a universal filesystem, partition name, mount path or block-device identity.

### 3.3 Access boundary

Only the authorized Local Content Store service may mutate manifests, assets, snapshot pointers, index, quarantine or garbage-collection metadata. Player receives read-only interfaces for committed content.

---

## 4. Capacity and Sizing

### 4.1 Hardware baseline

Capacity eligibility is inherited from the active Hardware Profile and Edge OS contract. The current platform baseline is:

| Lifecycle | Minimum usable storage | Treatment |
| --- | ---: | --- |
| Experimental | 8 GB | restricted, controlled use |
| Production | 16 GB | minimum production candidate |
| Preferred | 32 GB | recommended operating margin |

These values are eligibility thresholds, not a promise that all capacity is available to content.

### 4.2 Capacity model

The store shall calculate capacity using:

```text
usable_capacity
    - system_reserve
    - identity_reserve
    - recovery_reserve
    - ota_staging_reserve
    - telemetry_reserve
    - log_reserve
    - configuration_reserve
    - snapshot_reserve
    = content_capacity
```

The exact reserve values are declared by the Hardware Profile, Installation Profile and operational configuration. The Local Content Store shall refuse a reservation that would reduce any mandatory reserve below its declared minimum.

### 4.3 Snapshot reserve

The store shall reserve enough capacity for the active snapshot, the Previous Known-Good Snapshot and a transactionally staged replacement when the profile declares atomic replacement. If the device cannot satisfy this requirement, the incoming package shall remain uncommitted and the active snapshot shall remain untouched.

### 4.4 Low-storage mode

The store shall expose explicit capacity states:

```text
NORMAL
LOW
CRITICAL
FULL
RESERVE_VIOLATION
UNKNOWN
```

`LOW` and `CRITICAL` may restrict preloading and garbage collection, but shall not delete active content. `FULL` rejects new staging. `RESERVE_VIOLATION` blocks destructive content operations and alerts Runtime/Cloud.

### 4.5 No silent pressure

A content package shall never be accepted merely because the nominal filesystem reports free bytes. The reservation must account for staging, metadata, digest verification, snapshots and recovery requirements.

---

## 5. Canonical Content Model

### 5.1 ContentManifest

```text
ContentManifest
|- manifest_id
|- manifest_revision
|- campaign_reference
|- schedule_reference
|- target_device_reference
|- target_hardware_profile
|- target_installation_profile
|- target_player_contract
|- timezone_reference
|- validity_period
|- content_policy
|- asset_entries[]
|- fallback_reference
|- snapshot_requirements
|- integrity_reference
|- authorization_reference
|- revocation_reference
|- signature_reference
|- manifest_hash
```

The manifest is immutable after verification. A change creates a new revision and a new package identity.

### 5.2 AssetEntry

```text
AssetEntry
|- asset_id
|- asset_revision
|- content_type
|- media_format
|- codec_reference
|- byte_length
|- declared_duration
|- maximum_duration
|- digest_algorithm
|- digest
|- encryption_reference, when required
|- authorization_reference
|- source_reference
|- integrity_state
```

The store shall validate byte length, digest, format constraints and profile compatibility before an asset becomes `READY`.

### 5.3 Content package

```text
ContentPackage
|- package_id
|- package_revision
|- manifest
|- assets[]
|- required_capabilities
|- storage_reservation
|- commit_policy
|- fallback_policy
|- signature_reference
|- package_hash
```

A package is complete only when all required assets and manifest references are present and verified.

---

## 6. Content Lifecycle

Each manifest and asset shall have one explicit lifecycle state:

```text
DISCOVERED
DOWNLOADING
STAGED
VERIFYING
VERIFIED
AUTHORIZED
READY
ACTIVE
EXPIRED
REVOKED
INVALID
QUARANTINED
DELETED
```

### 6.1 State meanings

- `DISCOVERED`: package identity was received but bytes are not complete.
- `DOWNLOADING`: bytes are being acquired into a non-active staging area.
- `STAGED`: package bytes are complete enough for verification, but not yet verified.
- `VERIFYING`: manifest, assets, signatures, digests and capability constraints are being checked.
- `VERIFIED`: integrity checks passed; authorization may still be pending.
- `AUTHORIZED`: content is authorized for the target and policy, but may await snapshot commit.
- `READY`: content is in a committed snapshot eligible for schedule selection.
- `ACTIVE`: content is referenced by the current active playback snapshot.
- `EXPIRED`: validity period ended; content is not newly selectable.
- `REVOKED`: an explicit revocation prevents selection or activation.
- `INVALID`: verification or schema failed.
- `QUARANTINED`: content is isolated pending security or operational decision.
- `DELETED`: bytes and metadata were removed according to the GC policy; historical references remain.

### 6.2 State invariants

- Only `READY` and `ACTIVE` content can be selected by Player.
- `STAGED`, `VERIFYING`, `INVALID`, `REVOKED` and `QUARANTINED` content cannot replace the Active Snapshot.
- `EXPIRED` content cannot be extended by offline operation without a new authorization.
- `DELETED` content cannot be resurrected by a stale pointer.
- State transitions are journaled and idempotent.

### 6.3 Lifecycle transitions

```text
DISCOVERED -> DOWNLOADING -> STAGED -> VERIFYING -> VERIFIED
                                                   |
                                                   v
                                             AUTHORIZED
                                                   |
                                                   v
                                                READY
                                                   |
                                                   v
                                                ACTIVE
```

Any validation or trust failure may enter `INVALID`, `REVOKED` or `QUARANTINED`. `ACTIVE` may become `EXPIRED` or `REVOKED` only through an explicit policy/event; it shall not be silently deleted while it is the only valid fallback.

---

## 7. Staging

### 7.1 Staging boundary

All incoming packages shall be written to a staging area distinct from the Active Snapshot and Previous Known-Good Snapshot.

```text
receive package
      |
      v
create staging identity
      |
      v
reserve capacity
      |
      v
write manifest and asset bytes
      |
      v
persist checkpoints
      |
      v
STAGED
```

Staging shall not alter the active playlist, Player pointers, OS partitions or telemetry reserve.

### 7.2 Resumable acquisition

Acquisition may resume from verified byte ranges only when the package identity, digest, source authorization and staging journal remain valid. Unverified partial bytes shall be discarded or revalidated; they shall not be treated as complete.

### 7.3 Reservation

Before writing a package, the store shall reserve capacity for:

```text
manifest and index
all required asset bytes
digest and verification metadata
snapshot metadata
commit journal
declared rollback/fallback retention
```

If reservation fails, the package remains non-active and the current snapshot is unchanged.

### 7.4 Staging cancellation

A cancelled or expired staging operation may delete only its own staging set and journal entries. It shall not delete active, Previous Known-Good, fallback or unrelated package data.

---

## 8. Verification

The transition from `STAGED` to `VERIFIED` requires all mandatory checks:

```text
manifest schema valid
manifest signature valid
manifest digest valid
asset bytes complete
asset digest valid
artifact and key lifecycle valid
revocation state acceptable
Hardware Profile binding valid
Installation Profile binding valid
Player/Web Engine/codec compatibility valid
schedule and timezone valid
storage reservation valid
content policy valid
fallback policy valid
```

### 8.1 Verification result

The store shall persist a structured verification result:

```text
VerificationResult
|- package_id
|- manifest_reference
|- checks[]
|- failed_check, if any
|- key_reference
|- revocation_reference
|- HardwareProfile reference
|- InstallationProfile reference
|- verified_at
|- verifier_version
|- result_hash
```

### 8.2 Unknown or unsupported content

Unknown schema, codec, Web Engine, profile, key or policy shall produce explicit rejection, quarantine or safe wait. The store shall not infer compatibility from file extension, commercial name, version ordering or a browser user agent.

### 8.3 Verification failure

An invalid or revoked package shall never be promoted to `READY`. The failed package may be retained in `QUARANTINED` form for diagnosis if the security policy permits; its bytes shall not be executable or selectable.

---

## 9. Atomic Commit and Snapshot Model

### 9.1 Snapshot

An immutable `ContentSnapshot` is a complete, verified and authorized view of content available to Player:

```text
ContentSnapshot
|- snapshot_id
|- snapshot_revision
|- package_references[]
|- manifest_references[]
|- asset_references[]
|- schedule_index
|- fallback_references[]
|- content_policy_reference
|- created_at
|- valid_period
|- snapshot_hash
|- commit_record_reference
```

The snapshot contains references to immutable manifests and assets. Updating one asset does not mutate an existing snapshot.

### 9.2 Commit sequence

The commit shall follow this sequence:

```text
verify complete package
      |
      v
construct candidate snapshot
      |
      v
persist snapshot and index
      |
      v
persist commit marker
      |
      v
atomically publish snapshot pointer
      |
      v
acknowledge commit
```

The Player observes the pointer only after the commit marker and snapshot integrity are durable.

### 9.3 Active Snapshot

`ActiveSnapshotPointer` identifies the snapshot currently eligible for playback. It shall contain:

```text
snapshot_id
snapshot_hash
published_at
commit_sequence
pointer_hash
```

Only one Active Snapshot may be effective for a device and scope at an instant.

### 9.4 Previous Known-Good Snapshot

`PreviousKnownGoodSnapshotPointer` identifies the most recent snapshot that passed the required playback and integrity health checks.

It shall not be replaced merely because a newer snapshot was downloaded. Replacement requires successful commit and the policy's confirmation criteria.

### 9.5 Atomicity invariant

A power loss, process crash or storage error before pointer publication leaves the previous Active Snapshot authoritative. A failure after pointer publication is recoverable by verifying the pointer and selecting the Previous Known-Good Snapshot when required.

---

## 10. Fallback and Offline Selection

### 10.1 Snapshot fallback hierarchy

When the Active Snapshot cannot provide an authorized playable item, selection follows:

```text
current Active Snapshot item
        |
        v
another verified item in Active Snapshot
        |
        v
Previous Known-Good Snapshot item
        |
        v
declared institutional content
        |
        v
declared no-signal operational content
        |
        v
WAITING_FOR_CONTENT / DEGRADED
```

The hierarchy never permits unverified, expired, revoked or arbitrary content. It also never moves an item into a different paid slot.

### 10.2 Offline authority

When Internet access is unavailable, the store may serve content whose manifest, authorization, validity period, clock policy and integrity data are locally available and valid.

Offline mode shall not:

- accept a new unsigned package;
- extend an expired manifest;
- ignore revocation already available locally;
- replace the active snapshot with an unverified package;
- use browser cache or a remote URL as fallback;
- delete the only valid active or known-good snapshot to create staging space.

### 10.3 Reconnection

Reconnection causes Edge Runtime to synchronize and verify new packages. It does not force immediate snapshot replacement. The store publishes a new snapshot only after the complete atomic commit sequence.

---

## 11. Expiration and Revocation

### 11.1 Expiration

The store shall evaluate manifest and asset validity against the authoritative clock policy.

At expiration:

```text
content remains historical data
content becomes non-selectable for new playback
active playback follows the declared safe-boundary policy
fallback is selected if authorized
expiration is recorded
```

The store shall not rewrite expiration times locally.

### 11.2 Revocation

Revocation may apply to:

```text
manifest
package
asset
signing key
Hardware Profile
Installation Profile
Player contract
content policy
```

Revoked content cannot become `READY` or `ACTIVE`. If an active item is revoked, the Runtime and Player select the policy-defined safe boundary and fallback. Historical `ContentStoreResult` and playback records remain immutable.

### 11.3 Unavailable revocation data

If a required revocation source is unavailable, the local policy determines whether the package can be used from an already validated state. The store shall not silently assume that missing revocation data means `SUPPORTED` or `AUTHORIZED`.

---

## 12. Quota and Garbage Collection

### 12.1 Quota classes

Storage quota shall be tracked separately for:

```text
active content
Previous Known-Good content
staging
manifests and index
quarantine
fallback content
metadata and journal
```

The quota manager shall also report the reserved capacity owned by OS, Runtime, identity, Recovery, OTA and telemetry.

### 12.2 Garbage-collection eligibility

Content is eligible for garbage collection only when:

```text
not in Active Snapshot
not in Previous Known-Good Snapshot
not required as fallback
not referenced by a pending operation
not under legal/audit retention
not required by Recovery or migration
expired, revoked or otherwise unneeded
```

### 12.3 GC ordering

The default GC order is:

```text
orphaned incomplete staging
expired unreferenced content
revoked unreferenced content
old superseded snapshots
unreferenced assets
```

GC shall be incremental and resumable. A power loss shall not leave active pointers pointing to deleted data.

### 12.4 No forced deletion

If no safe content is eligible for deletion, new staging fails with an explicit capacity result. The store shall not delete active, fallback, known-good, OS, identity, Recovery, OTA or telemetry data to satisfy a new campaign.

---

## 13. Storage-Full Protection

Before accepting new content, the store shall evaluate:

```text
available content capacity
staging reservation
snapshot reserve
active/known-good retention
metadata growth
journal growth
recovery reserve
```

When capacity is insufficient:

```text
do not modify Active Snapshot
do not erase Previous Known-Good Snapshot
do not interrupt current playback
pause or reject staging
emit capacity telemetry
notify Runtime/Cloud
run only safe GC
```

A content package may be partially downloaded for resume, but it shall not become visible to Player until capacity and verification gates pass.

---

## 14. Integrity, Hashes and Digests

### 14.1 Integrity layers

Integrity shall be represented at each layer:

```text
asset digest
manifest hash
package hash
snapshot hash
index hash
pointer hash
journal entry hash
ContentStoreResult hash
```

The exact digest algorithm is declared by the applicable Security and artifact contracts. The store shall preserve the algorithm identity with every digest and shall not compare digests from different algorithms as if they were equivalent.

### 14.2 Canonical serialization

Manifest, snapshot, pointer and result hashes shall use their declared canonical serialization. Whitespace, field ordering, encoding or normalization changes that alter the canonical bytes produce a different identity.

### 14.3 Verification hierarchy

The store shall verify:

```text
bytes -> asset digest
asset set -> manifest
manifest and assets -> package
package references -> snapshot
snapshot -> active/known-good pointer
journal chain -> store history
```

An invalid lower-level digest prevents promotion of the higher-level object.

### 14.4 Corruption result

A failed integrity check shall identify the affected object, expected digest, observed digest, source, timestamp, state and recovery action without exposing secret material.

---

## 15. Encryption and Confidentiality

### 15.1 Policy-driven encryption

Content at-rest encryption is required when the Hardware Profile, Installation Profile, Security policy, contract or content classification requires it. The store shall expose the actual protection state:

```text
HARDWARE_BACKED
SOFTWARE_PROTECTED
UNENCRYPTED_ALLOWED
UNAVAILABLE
UNKNOWN
```

The store shall not claim encryption merely because a filesystem or browser offers an opaque cache.

### 15.2 Key boundary

Encryption keys are owned by the Security/identity boundary. The Player receives authorized content through the Local Content Store interface and shall not receive master keys or key-export capability.

### 15.3 Confidentiality failure

If confidentiality is mandatory and the required key or protected storage is unavailable, the affected package shall not become `READY`. Existing valid active content may continue according to policy, but a new unprotected replacement shall not be committed.

### 15.4 Content classification

The store shall preserve content classification and policy references. It shall not downgrade a protected package to an unprotected state during GC, migration, offline operation or recovery.

---

## 16. Persistence, Reboot and Power Loss

### 16.1 Persistence requirements

The following shall survive ordinary Player/Runtime restart and reboot according to the Hardware Profile durability contract:

```text
verified manifests
verified assets
ContentSnapshots
ActiveSnapshotPointer
PreviousKnownGoodSnapshotPointer
content states
store index
store journal
revocation and expiration observations
ContentStoreResult references
```

### 16.2 Power-loss checkpoints

Every persistent operation shall journal checkpoints before acknowledging:

```text
reservation_created
asset_chunk_persisted
manifest_persisted
verification_started
verification_completed
snapshot_persisted
commit_marker_persisted
active_pointer_published
known_good_pointer_published
gc_started
gc_completed
```

### 16.3 Recovery after restart

After restart or power restoration, the store shall:

1. validate the journal chain;
2. validate Active Snapshot and Previous Known-Good pointers;
3. discard or resume incomplete staging according to checkpoints;
4. verify referenced snapshot and asset digests;
5. select the previous known-good snapshot if the active pointer is invalid;
6. report corruption or Recovery requirements explicitly.

The store shall never assume that a write completed merely because a process emitted a start or completion intent before power loss.

### 16.4 Pointer safety

The active pointer shall be updated atomically according to the filesystem/storage contract. A pointer referencing missing or invalid content is not a valid active state.

---

## 17. Corruption and Recovery

### 17.1 Corruption classes

The store shall distinguish:

```text
asset_corruption
manifest_corruption
snapshot_corruption
index_corruption
pointer_corruption
journal_corruption
storage_device_failure
encryption_key_unavailable
```

### 17.2 Recovery hierarchy

Recovery shall prefer the least destructive valid action:

```text
re-read or revalidate object
    |
    v
rebuild index from immutable manifests/snapshots
    |
    v
restore Active Snapshot from Previous Known-Good
    |
    v
restore declared content-store backup or migration
    |
    v
Recovery handoff
    |
    v
manual intervention / blocked
```

### 17.3 No fabricated repair

The store shall not repair corrupted bytes by inventing content, accepting a different digest or rewriting historical results. A rebuild may reconstruct indexes from valid immutable records; it may not change the records themselves.

### 17.4 Active-content loss

If Active Snapshot content is unavailable but Previous Known-Good content remains valid, the store exposes the fallback result and Player may continue from it. If no valid snapshot remains, the store enters `DEGRADED`, `WAITING_FOR_CONTENT` or `RECOVERY_REQUIRED` according to the Recovery and Player contracts.

---

## 18. Storage Migration

### 18.1 Migration authority

Storage migration requires an explicit signed migration contract referenced by Installation Profile, OTA or Recovery. It is not ordinary garbage collection or filesystem copying.

### 18.2 Migration invariants

Migration shall preserve or explicitly transform:

```text
manifest identity and revision
asset digests
snapshot identity
Active Snapshot semantics
Previous Known-Good reference
expiration and revocation state
content classification
audit history
```

### 18.3 Migration sequence

```text
resolve target storage plan
      |
      v
validate capacity and protection
      |
copy or transform immutable objects
      |
verify digests and snapshot references
      |
publish target pointers atomically
      |
retain source until confirmation
      |
seal migration result
```

If migration fails, the source Active Snapshot remains authoritative until the target is fully verified and committed.

### 18.4 Identity and content

Storage migration shall not change `EdgeInstallationId`, `DeviceKey`, content identity or playback facts unless an explicit identity/content migration authorizes the change.

---

## 19. Content Updates Without Playback Interruption

The store shall support preparation of a new package while Player reads the active snapshot.

```text
ACTIVE SNAPSHOT
        |
        | Player reads
        v
playback continues

NEW PACKAGE -> STAGING -> VERIFYING -> CANDIDATE SNAPSHOT
                                      |
                                      v
                             atomic commit at boundary
```

The commit shall not:

- rewrite an asset currently being rendered;
- move an entry to another paid slot;
- interrupt playback solely because a new package arrived;
- delete the active or known-good snapshot to reduce temporary pressure;
- expose a partially verified snapshot to Player.

After commit, Player observes the new snapshot only at the boundary defined by `EDGE_PLAYER_SPECIFICATION.md`.

---

## 20. OTA, Recovery and Security Integration

### 20.1 OTA

OTA shall treat the Local Content Store as a distinct content policy. System, Runtime, Player and content updates are not interchangeable.

OTA shall preserve content by default and shall validate:

```text
store schema compatibility
filesystem/storage compatibility
snapshot and pointer compatibility
content migration policy
encryption/key policy
recovery and rollback behavior
```

An OS or Runtime update shall not erase or rewrite content without an explicit signed migration or erase authorization.

### 20.2 Recovery

Recovery shall use the Recovery Plan to restore, rebuild or migrate the store. It shall preserve identity and historical content records wherever the plan permits. Recovery shall not select a generic content image or browser cache.

### 20.3 Security

Security controls trust anchors, signatures, keys, encryption, revocation, authorization and tamper response. The store shall apply those decisions but shall not create new security authority.

### 20.4 Player

Player receives read-only access to committed content and reports playback facts. It cannot mutate snapshots, bypass expiry, disable revocation or invoke garbage collection.

---

## 21. ContentStoreResult

Every store operation shall produce an immutable `ContentStoreResult` or an idempotent reference to the same result:

```text
ContentStoreResult
|- operation_id
|- operation_type
|- device_identity_reference
|- HardwareProfile reference
|- InstallationProfile reference
|- package_reference
|- manifest_reference
|- snapshot_reference
|- active_snapshot_before
|- active_snapshot_after
|- previous_known_good_reference
|- storage_observation
|- verification_result
|- reservation_result
|- commit_result
|- fallback_result
|- expiration_result
|- revocation_result
|- recovery_result
|- final_state
|- error_reference, if any
|- evidence_references[]
|- started_at
|- completed_at
|- result_hash
```

### 21.1 Operation types

```text
PACKAGE_STAGE
PACKAGE_VERIFY
SNAPSHOT_COMMIT
SNAPSHOT_ACTIVATE
SNAPSHOT_CONFIRM
CONTENT_EXPIRE
CONTENT_REVOKE
GARBAGE_COLLECT
STORE_RECOVER
STORE_MIGRATE
STORE_REBUILD_INDEX
```

### 21.2 Final states

```text
COMPLETED
COMMITTED
NO_CHANGE
PAUSED
REJECTED
FAILED
DEGRADED
RECOVERY_REQUIRED
QUARANTINED
```

`COMMITTED` is valid only after atomic pointer publication and integrity verification. `NO_CHANGE` is valid when an idempotent request already has the same authoritative result.

---

## 22. Telemetry and Audit

The store shall emit structured telemetry for:

```text
content_package_received
content_stage_started
content_stage_resumed
content_stage_failed
content_verification_started
content_verified
content_verification_failed
snapshot_candidate_created
snapshot_commit_started
snapshot_committed
active_snapshot_changed
known_good_snapshot_changed
content_expired
content_revoked
garbage_collection_started
garbage_collection_completed
storage_low
storage_critical
storage_full
reserve_violation
store_recovery_started
store_recovery_completed
store_corruption_detected
store_migration_started
store_migration_completed
fallback_selected
```

Each event shall include, where applicable:

```text
event_id
operation_id
device_identity_reference
package_reference
snapshot_reference
state
storage_observation
timestamp
result
error_reference
causation_reference
record_hash
```

Telemetry shall not contain private keys, passwords, tokens, raw secret material or unnecessary protected content. Offline telemetry may be queued according to the telemetry contract without changing store authority.

---

## 23. Error Catalog

The following store error identities are normative:

```text
STG_REQUEST_INCOMPLETE
STG_PACKAGE_UNKNOWN
STG_MANIFEST_INVALID
STG_MANIFEST_SIGNATURE_INVALID
STG_MANIFEST_REVOKED
STG_ASSET_MISSING
STG_ASSET_INCOMPLETE
STG_ASSET_DIGEST_MISMATCH
STG_ASSET_FORMAT_UNSUPPORTED
STG_CONTENT_PROFILE_MISMATCH
STG_CONTENT_AUTHORIZATION_INVALID
STG_CONTENT_EXPIRED
STG_CONTENT_REVOKED
STG_CONTENT_QUARANTINED
STG_RESERVATION_FAILED
STG_STORAGE_LOW
STG_STORAGE_CRITICAL
STG_STORAGE_FULL
STG_RESERVE_VIOLATION
STG_FILESYSTEM_UNAVAILABLE
STG_FILESYSTEM_READ_ONLY
STG_FILESYSTEM_INTEGRITY_FAILED
STG_INDEX_CORRUPTED
STG_SNAPSHOT_CORRUPTED
STG_POINTER_CORRUPTED
STG_JOURNAL_CORRUPTED
STG_COMMIT_CONFLICT
STG_COMMIT_INTERRUPTED
STG_POWER_LOSS_RECOVERY_REQUIRED
STG_ENCRYPTION_REQUIRED
STG_ENCRYPTION_UNAVAILABLE
STG_KEY_UNAVAILABLE
STG_REVOCATION_UNAVAILABLE
STG_GC_NOT_SAFE
STG_MIGRATION_UNAUTHORIZED
STG_MIGRATION_INCOMPATIBLE
STG_MIGRATION_FAILED
STG_OFFLINE_AUTHORIZATION_EXPIRED
STG_SCHEMA_UNSUPPORTED
STG_RECOVERY_REQUIRED
STG_RESULT_SEAL_FAILED
```

Each error shall declare phase, retryability, recoverability, affected object, fallback behavior and required telemetry. The same error identity shall not be reused for a different observable condition.

---

## 24. Normative Requirements

### STG-001

The Local Content Store shall be the authoritative local source for offline playback.

### STG-002

Browser cache, temporary files and remote URLs shall not be treated as the authoritative content store.

### STG-003

The store shall keep content storage separate from OS, Runtime, identity, Recovery, OTA, telemetry and log reserves.

### STG-004

The store shall calculate reservations using usable capacity, mandatory reserves, staging, metadata, snapshots and Recovery requirements.

### STG-005

A new package shall not modify the Active Snapshot before complete verification and atomic commit.

### STG-006

Every manifest and asset shall have explicit identity, revision, digest, authorization and lifecycle state.

### STG-007

Only `READY` or `ACTIVE` content may be selected for playback.

### STG-008

Unknown, invalid, revoked or incompatible content shall not become `READY` by inference.

### STG-009

Staging shall be resumable only from verified checkpoints using the same operation identity.

### STG-010

Snapshot publication shall be atomic and shall retain an Active Snapshot and Previous Known-Good Snapshot reference.

### STG-011

A power loss before pointer publication shall preserve the previous authoritative snapshot.

### STG-012

The store shall recover or explicitly report corruption of assets, manifests, snapshots, pointers, indexes or journals.

### STG-013

Garbage collection shall never delete active, Previous Known-Good, required fallback or reserved system data.

### STG-014

Storage pressure shall reject or pause new staging before violating mandatory reserves.

### STG-015

A full store shall not interrupt valid playback or silently erase content to accept a new campaign.

### STG-016

Expiration and revocation shall make content non-selectable according to policy without rewriting historical records.

### STG-017

Offline playback shall continue from locally validated and authorized content without Internet access.

### STG-018

Offline operation shall not extend authorization, bypass revocation or accept unsigned content.

### STG-019

Storage migration shall require an explicit signed migration contract and preserve snapshot and identity semantics.

### STG-020

OTA shall treat content as a distinct policy and shall not erase the store implicitly.

### STG-021

Recovery shall use a trusted Recovery Plan and shall not substitute browser cache or an arbitrary content image.

### STG-022

Player shall receive only committed, authorized snapshots through the declared interface.

### STG-023

Integrity and encryption behavior shall follow Security and Hardware Profile capabilities without claiming unsupported physical protection.

### STG-024

Every store operation shall produce an immutable `ContentStoreResult` or an idempotent reference to an existing result.

### STG-025

Store telemetry and audit records shall be structured, integrity-protected and free of secret material.

### STG-026

A content update shall not interrupt valid playback solely because a new package is being staged or committed.

### STG-027

The store shall maintain a validated fallback path for each Production profile when the active campaign content is unavailable.

### STG-028

The store shall not alter schedule, paid-slot ownership or Campaign semantics.

### STG-029

All persistent store transitions shall be journaled and replayable without inventing state.

### STG-030

Low-resource devices shall be supported only within the storage, snapshot, integrity and recovery limits validated by their Hardware Profile.

---

## 25. Completion Criteria

The Local Content Store contract is implementable for a target when its Hardware Profile and Installation Profile provide:

```text
filesystem and storage roles
usable capacity and mandatory reserves
staging and snapshot reserve
integrity and signature policy
encryption/key policy, when required
manifest and asset compatibility
Active/Previous Known-Good retention policy
fallback content policy
expiration and revocation policy
GC and quota policy
power-loss and corruption behavior
Recovery Plan reference
OTA migration policy
Player interface and schedule contract
telemetry and result contract
```

An absent mandatory storage or policy input blocks the affected operation. It does not authorize a generic directory, browser cache, unsafe erase or unverified content.

---

## 26. Relationship to Other Specifications

```text
EDGE_HARDWARE_PROFILES.md
        |
        v
EDGE_INSTALLATION_PROFILES.md
        |
        v
EDGE_OS_SPECIFICATION.md
        |
        +--> EDGE_SECURITY.md
        +--> EDGE_OTA.md
        +--> EDGE_RECOVERY.md
        |
        v
EDGE_OFFLINE_STORAGE.md
        |
        v
EDGE_PLAYER_SPECIFICATION.md
```

The Local Content Store is a storage and integrity boundary. It does not become a new business Bounded Context and does not acquire authority over Playback Evidence, Audience, Pricing or Campaign decisions.

---

## 27. Next Review

Before implementation, the architecture review shall verify:

```text
Hardware Profile storage capabilities
Installation Profile partition and preservation policy
Edge OS logical storage roles
Security integrity and encryption policy
OTA content migration behavior
Recovery store restoration path
Player snapshot and fallback interface
Telemetry and ContentStoreResult contracts
low-storage and power-loss evidence
```

No content package, filesystem, browser cache or device-specific storage path becomes normative merely because it appears in an implementation. It must satisfy this contract and the active Hardware/Installation Profile gates.
