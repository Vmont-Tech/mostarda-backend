# Mostarda Edge — Player Specification

**Status:** DRAFT
**Version:** 1.0.0
**Owner:** Mostarda Architecture
**Prerequisites:** `EDGE_HARDWARE_PROFILES.md`, `EDGE_INSTALLATION_PROFILES.md`, `EDGE_OS_SPECIFICATION.md`, `EDGE_SECURITY.md`, `EDGE_OTA.md`, `EDGE_RECOVERY.md`
**Related Domains:** Playback, Evidence Ledger, Telemetry
**Scope:** local-first playback, content integrity, Player lifecycle, health, recovery and execution evidence

---

## 1. Purpose

This document defines the normative contract for the Mostarda Edge Player.

The Player is a constrained playback module designed for heterogeneous Edge hardware, including low-resource TV Boxes. It consumes authorized content from the Local Content Store through Edge Runtime interfaces and renders it through the Web Engine and hardware capabilities declared by the Hardware Profile.

It defines:

- Web/HTML5 Player architecture;
- Local Content Store and offline playback;
- preload, download and manifest handling;
- Player state machine and lifecycle;
- campaign/playlist manifests and timing;
- duration and schedule behavior;
- asset checksum and integrity validation;
- codec, display, GPU/VPU and Web Engine capability use;
- resource limits for low-memory devices;
- watchdog, crash recovery and reboot resumption;
- clock synchronization and network loss;
- atomic content activation and fallback;
- invalid or malicious content handling;
- authorized communication with Edge Runtime;
- playback telemetry and authoritative execution facts;
- `PlayerHealth` and `PlaybackResult`;
- OTA and Recovery integration;
- normative `PLY-*` requirements.

The Player does not decide Campaign, Pricing, Settlement, responsibility or Evidence semantics. Playback produces execution facts; Evidence Ledger may materialize Evidence from those facts.

---

## 2. Architectural Boundary

The authoritative playback path is:

```text
Cloud / Edge Runtime Sync
             |
             v
      Local Content Store
             |
             v
      Player Web / HTML5
             |
             v
      Web Engine / Decoder
             |
             v
           Display
```

The network is used to synchronize authorized manifests, content and configuration. It is not required during playback when the required content is already validated locally.

The following path is prohibited as an authoritative design:

```text
Internet -> Browser -> Browser Cache -> Playback
```

Browser cache is never the Local Content Store and cannot be used as proof that content was provisioned or played.

### 2.1 Player owns

The Player owns:

- playback lifecycle and state transitions;
- selection and sequencing from an authorized local playlist;
- timing and schedule adherence;
- media decode and display handoff;
- local content readiness checks;
- playback health and failure reporting;
- immutable playback attempt/result references;
- watchdog and restart integration for the Player process.

### 2.2 Player does not own

The Player does not own:

- content approval, campaign authorization or pricing;
- Hardware Profile or codec capability publication;
- Installation Profile or provisioning;
- Local Content Store ingestion or trust policy;
- Device identity or private keys;
- OTA or Recovery execution;
- Evidence materialization;
- demographic or audience truth;
- financial charging or compensation.

---

## 3. Trust and Capability Inputs

The Player shall start only after the Edge OS and Runtime provide:

```text
trusted Player artifact
active Hardware Profile reference
active Installation Profile reference
validated Web Engine capability
validated codec and VPU capability
validated display path
authorized Local Content Store interface
Player security policy
clock status
Runtime control interface
```

The Player shall not guess capabilities. It shall consume the validated capability result from the Hardware Profile and report `UNAVAILABLE`, `FAILED` or `UNKNOWN` when a capability is absent or unverifiable.

### 3.1 Hardware-dependent capabilities

The Hardware Profile shall provide, where applicable:

```text
RAM and usable storage limits
CPU / SoC capability
GPU / VPU capability
codec support and limits
display modes
Web Engine identity and version
hardware acceleration state
thermal or sustained workload limits
offline storage limits
watchdog and recovery capability
```

No Player implementation may assume that a commercial device name or SoC family implies a codec, Web Engine or acceleration capability.

### 3.2 Optional collectors

Optional Wi-Fi presence collectors, cameras, tags and other peripherals are not required for playback unless the active profile explicitly marks them mandatory. Their absence shall be reported as an unavailable capability and shall not stop valid playback.

---

## 4. Player Artifact and Runtime Binding

The Player is a signed, versioned artifact bound to:

```text
player_contract_id
player_contract_version
Hardware Profile
Installation Profile
Edge OS contract
Web Engine contract
codec/VPU contract
security policy
```

The Edge OS and Runtime shall verify the Player artifact before activation. A valid signature alone does not authorize a Player whose profile, Web Engine, codec, memory or security bindings are incompatible.

The Player shall communicate only through versioned interfaces exposed by Edge Runtime:

```text
ContentReadInterface
PlaylistReadInterface
PlaybackControlInterface
ClockInterface
DisplayInterface
HealthInterface
TelemetryInterface
RecoveryRequestInterface
```

Undocumented filesystem, process, network or administrative interfaces are prohibited.

---

## 5. Local Content Store Contract

### 5.1 Authoritative local source

The Local Content Store is the authoritative source for offline playback. It stores:

```text
campaign or content manifest
asset metadata
asset bytes
asset digest and integrity metadata
authorization state
schedule and slot metadata
content readiness state
previously validated fallback content
content migration metadata
```

The Player shall request content through the authorized Local Content Store interface. It shall not treat browser cache, temporary files or an arbitrary URL as authoritative content.

### 5.2 Content states

Each content package shall have an explicit state:

```text
DISCOVERED
DOWNLOADING
DOWNLOADED
VERIFIED
AUTHORIZED
READY
ACTIVE
EXPIRED
REVOKED
INVALID
QUARANTINED
```

Only `READY` and `ACTIVE` content that is authorized for the current schedule may be selected for playback.

### 5.3 Content integrity

The Player shall receive integrity results from the Local Content Store. It shall not independently reinterpret an invalid digest as usable content.

Required metadata includes:

```text
content_id
content_revision
asset_id
asset_digest
manifest_reference
authorization_reference
codec_reference
duration_reference
verification_result
```

### 5.4 Content isolation

Content is data, not trusted executable code. Content, HTML, CSS, media metadata, QR payloads, tags and scripts shall not access DeviceKey, OS partitions, Runtime administration, OTA, Recovery or arbitrary process creation.

---

## 6. Synchronization and Preload

### 6.1 Runtime synchronization

Edge Runtime is responsible for receiving, validating and committing content and playlist updates into the Local Content Store. The Player reads a committed snapshot; it does not download campaign content directly from Cloud during playback.

### 6.2 Preload requirements

Before a campaign or playlist becomes eligible for playback, the Local Content Store shall confirm:

```text
manifest present
all required assets present
all asset digests valid
authorization valid
schedule resolved
codec and Web Engine compatible
storage reservation valid
content policy satisfied
```

If any required asset is not ready, the package remains non-playable. The Player shall not create a partial active playlist.

### 6.3 Atomic content activation

Content updates shall use a prepare/commit model:

```text
receive update
      |
      v
verify complete package
      |
      v
prepare immutable snapshot
      |
      v
commit snapshot atomically
      |
      v
Player observes new snapshot at a safe boundary
```

An active playlist remains valid until the new snapshot is completely verified and committed. A partially downloaded or invalid package cannot replace the active package.

### 6.4 Update without interrupting playback

The Player shall continue the active item while a new content snapshot is prepared. The new snapshot becomes eligible only at a declared playlist boundary, slot boundary or other safe synchronization point.

The Player shall not switch content in the middle of a committed playback item unless the current manifest explicitly authorizes interruption.

### 6.5 Fallback

If the newest snapshot fails verification or becomes unavailable, the Player shall use the last previously validated and authorized snapshot when its schedule remains effective. If no valid campaign content exists, it shall use the declared institutional or operational fallback; it shall not render an uncontrolled black screen as a normal state.

---

## 7. Playlist and Campaign Manifest

### 7.1 Manifest authority

The playlist or campaign manifest is the authoritative schedule input for Player selection. It shall be signed or integrity-bound through the Runtime and Local Content Store contracts.

The Player shall not invent a campaign, slot, duration, target display or schedule.

### 7.2 Canonical manifest

```text
PlaybackManifest
|- manifest_id
|- manifest_revision
|- campaign_reference
|- schedule_reference
|- target_hardware_profile
|- target_installation_profile
|- target_player_contract
|- target_web_engine_contract
|- timezone_reference
|- clock_policy
|- playlist_entries[]
|- fallback_reference
|- authorization_reference
|- content_store_snapshot_reference
|- validity_period
|- integrity_reference
|- signature_reference
```

### 7.3 Playlist entry

Each entry shall contain:

```text
entry_id
asset_id
asset_revision
slot_reference
start_constraint
end_constraint
maximum_duration
declared_duration
transition_policy
display_policy
authorization_reference
```

The Player shall honor the manifest's maximum duration and schedule. It shall not extend an item into another paid or reserved slot.

### 7.4 Duration

The content manifest, not the Player, defines the authorized maximum duration. A media asset shorter than the authorized slot may finish according to its declared transition policy; a media asset longer than the authorized maximum shall be rejected or handled by the declared truncation/fallback policy.

The Player shall record the actual start, stop, completion and failure facts without changing the authorized slot semantics.

### 7.5 Schedule and timezone

Schedule evaluation shall use the authoritative clock and timezone references from Edge Runtime. Local wall-clock changes shall not silently change an active schedule. If clock trust is insufficient, the Player shall enter the declared degraded or waiting state rather than inventing a time.

---

## 8. Player State Machine

The Player shall use one normative state machine:

```text
NOT_STARTED
    |
    v
INITIALIZING
    |
    v
READY
    |
    v
PLAYING
    |
    +--> PAUSED
    |       |
    |       v
    |    PLAYING
    |
    +--> WAITING_FOR_CONTENT
    |       |
    |       +--> READY
    |       +--> DEGRADED
    |
    +--> DEGRADED
    |       |
    |       +--> READY
    |       +--> RECOVERING
    |
    +--> ERROR
            |
            v
        RECOVERING
            |
            +--> READY
            +--> DEGRADED
            +--> ERROR
```

`STOPPED`, `DISABLED`, `REVOKED` and `BLOCKED` may be declared terminal operational results by the Runtime or security contracts. They are not inferred by the Player from an ordinary content miss.

### 8.1 State meanings

- `NOT_STARTED`: Player process has not begun initialization.
- `INITIALIZING`: artifact, Runtime interfaces, Web Engine, display and capability checks are being validated.
- `READY`: an authorized playlist snapshot and playable content are available.
- `PLAYING`: a manifest-authorized item is being rendered.
- `PAUSED`: playback is intentionally paused at a permitted boundary.
- `WAITING_FOR_CONTENT`: no required playable item is currently available, but recovery or synchronization may restore it.
- `DEGRADED`: playback or an optional capability is operating under an explicit reduced condition.
- `ERROR`: a Player-level failure prevents normal playback.
- `RECOVERING`: Player restart, configuration recovery, content fallback or Runtime recovery is executing.

### 8.2 State invariants

- The Player shall not enter `PLAYING` without a verified active manifest and playable asset.
- `WAITING_FOR_CONTENT` shall not be treated as successful playback.
- `DEGRADED` shall identify the missing capability or fallback content.
- `ERROR` shall retain the failure code and affected item reference.
- Recovery shall not silently replace the active manifest with an unverified one.
- A state transition shall be observable through `PlayerHealth` and telemetry.

---

## 9. Web Engine and Media Capability Contract

### 9.1 Web Engine binding

The Web Engine is a capability supplied by the Hardware Profile and Edge OS contract. The Player shall receive:

```text
web_engine_id
web_engine_version
html5_capabilities
javascript_capabilities
media_capabilities
hardware_acceleration_state
sandbox_capabilities
memory_limits
known_incompatibilities
```

The Player shall not select a Web Engine by browser name, user agent or commercial device model. If the declared Web Engine is unavailable, the Player shall fail the health gate or enter the declared degraded path.

### 9.2 Codec and VPU capabilities

Codec support shall be resolved from the Hardware Profile:

```text
codec_id
codec_version
container_support
profile_level
resolution_limit
framerate_limit
bitrate_limit
hardware_or_software_path
tested_sustained_behavior
```

A file extension or MIME type alone does not prove codec support. The Local Content Store shall reject or mark incompatible content before playback whenever the capability contract can determine the incompatibility.

### 9.3 Display path

The Player shall render through the validated display interface:

```text
display_id
mode
resolution
refresh_rate
pixel_format
orientation
initialization_state
```

Display failure shall produce a Player/OS health failure and shall not be reported as a successful playback.

### 9.4 Capability result states

Every material capability shall expose one of:

```text
AVAILABLE
UNAVAILABLE
FAILED
UNKNOWN
DEGRADED
```

Capability state is an observation. The Player shall not convert `UNKNOWN` into `AVAILABLE` by continuing optimistically.

---

## 10. Low-Resource Operation

### 10.1 Resource contract

The Hardware Profile shall declare the resource limits available to the Player:

```text
ram_limit
cpu_budget
gpu_budget
vpu_budget
storage_budget
decode_concurrency
texture_budget
web_engine_process_limit
thermal_limit
watchdog_policy
```

The Player shall remain within the effective limits. Runtime and OS resource enforcement are authoritative; Player heuristics cannot increase the declared budget.

### 10.2 One-gigabyte RAM profile

For a device with approximately 1 GB RAM, the Player shall operate only when the active Hardware Profile and Web Engine contract validate that configuration. The profile may constrain:

```text
single active media item
single Web Engine page or process
bounded preload window
bounded decoded frame buffers
disabled nonessential visual effects
limited telemetry batching in memory
aggressive release of completed assets
```

The Player shall not assume that 1 GB RAM is sufficient for a generic desktop browser, multiple simultaneous videos or unbounded campaign preloading.

### 10.3 Memory discipline

The Player shall:

- release decoded frames and buffers at the item boundary;
- bound playlist and manifest memory;
- avoid retaining completed DOM, media or canvas objects;
- stream or chunk large assets according to the content contract;
- keep only the minimum active and next-item state required by the schedule;
- expose allocation pressure and failed allocation as health signals;
- avoid forced garbage-collection assumptions as a correctness mechanism.

### 10.4 CPU/GPU/VPU discipline

The Player shall prefer the validated hardware decode and render path. Software fallback is permitted only when the Hardware Profile validates sustained performance, thermal behavior and playback quality.

The Player shall not start a workload that exceeds declared CPU/GPU/VPU limits. It shall report `DEGRADED` or reject the item before claiming playback when a limit prevents compliant execution.

### 10.5 Storage discipline

The Player shall not allocate arbitrary persistent storage. Local Content Store and Runtime enforce staging, content and telemetry quotas. A full store shall produce a typed result and shall not cause silent deletion of active content.

---

## 11. Timing and Playback Execution

### 11.1 Playback start

Playback begins only when:

```text
manifest is active
entry is authorized for the current time
asset is READY
integrity is valid
codec and Web Engine are compatible
display is initialized
clock is acceptable
```

The Player shall record the scheduled start and actual start. A failure before actual rendering is not a successful playback.

### 11.2 Exact schedule boundary

The Player shall respect the start and end boundaries of the authorized entry. It shall not move an item into a different paid slot or extend it beyond its maximum duration to compensate for a previous failure.

### 11.3 Short content

If an asset ends before the authorized maximum duration, the Player follows the entry's declared transition policy. A permitted final-frame hold, neutral transition or fallback must remain within the same entry boundary and shall be recorded.

### 11.4 Long or invalid content

An asset that exceeds the manifest maximum, fails duration validation or cannot be rendered shall be rejected or handled by the explicit manifest policy. The Player shall not silently rewrite the schedule or report an unrendered item as complete.

### 11.5 Transition

Transitions shall be deterministic and bounded. The Player shall not use an unbounded loading screen, browser navigation or network fetch between entries. If a transition cannot load the next verified item, the declared fallback is used and the gap is reported.

### 11.6 Clock synchronization

The Edge Runtime supplies the authoritative time and synchronization status. The Player shall use the declared timezone, clock source and uncertainty policy.

When clock confidence is insufficient for schedule evaluation, the Player shall:

```text
continue a currently authorized item when safe
pause at a safe boundary
enter WAITING_FOR_CONTENT or DEGRADED
request Runtime time recovery
```

It shall not invent a new campaign schedule.

---

## 12. Offline Playback

### 12.1 Required offline behavior

When content has been provisioned and validated locally, the Player shall continue playback without Internet access.

Offline playback may use:

```text
active Local Content Store snapshot
locally validated manifest
locally persisted schedule
authoritative local clock state within policy
previously validated fallback content
```

### 12.2 Network loss

Loss of network connectivity shall not stop a valid active item or invalidate the Local Content Store. The Player shall report the connection degradation through Runtime and continue until local authorization, clock or content policy no longer permits playback.

### 12.3 Expiration offline

When an asset or manifest expires while offline, the Player follows the explicit content policy. It shall not extend an expired authorization simply because no network is available.

### 12.4 Reconnection

After reconnection, Edge Runtime synchronizes and validates new content. The Player observes a committed snapshot at a safe boundary and does not replace active content with a partially synchronized package.

---

## 13. Content Security and Script Restrictions

### 13.1 No arbitrary campaign JavaScript

Campaign content shall not execute arbitrary JavaScript with Player, OS or Runtime privileges.

If HTML content is supported, scripts execute only inside the declared Web Engine sandbox and are limited by the Player/content policy. The policy shall define:

```text
allowed origins
network permissions
storage scope
API surface
execution time
memory limit
process limit
```

### 13.2 Authorized interfaces only

Campaign content may communicate with the Player only through a constrained, versioned content interface. It shall not call internal Runtime endpoints, access local sockets, inspect identity files or invoke shell/process APIs.

### 13.3 Media parsing

Media containers, codecs, images, fonts, QR payloads and metadata are untrusted input. Parsing failures shall be isolated to the item or Player process and shall not grant execution or alter schedule state.

### 13.4 Revocation and quarantine

Revoked or quarantined content shall not be selected for playback. If an active item becomes revoked, the Runtime and content policy determine the safe boundary for stopping or replacing it; the Player shall record the reason and actual result.

---

## 14. Fallback and Degradation

### 14.1 Fallback hierarchy

The Player shall prefer the least disruptive valid fallback:

```text
next verified item in current manifest
    |
    v
previously validated equivalent item
    |
    v
declared institutional content
    |
    v
declared operational no-signal content
    |
    v
WAITING_FOR_CONTENT / DEGRADED
    |
    v
ERROR / RECOVERING
```

The fallback hierarchy is valid only when the content is signed or integrity-bound, authorized and within its schedule/policy. A fallback is not permission to invent a commercial campaign.

### 14.2 No black-screen success

An uncontrolled black screen or uninitialized display shall not be reported as successful playback. A declared neutral or institutional fallback may be rendered and shall be identified as fallback in telemetry and `PlaybackResult`.

### 14.3 Degraded operation

Degraded operation shall state:

```text
missing capability
affected entry
fallback content
start and end time
reason code
whether playback remained valid
```

### 14.4 Optional telemetry absence

Missing camera, Wi-Fi, tag or audience telemetry shall not invalidate media playback. The Player records playback facts independently from optional audience measurements.

---

## 15. Watchdog and Crash Recovery

### 15.1 Watchdog inputs

The Player watchdog shall observe:

```text
process liveness
render loop progress
media decode progress
display output health
memory pressure
CPU/GPU/VPU pressure
manifest responsiveness
Runtime interface health
```

### 15.2 Recovery hierarchy

Player recovery shall prefer the least destructive valid action:

```text
restart playback item
    |
    v
reload Player state from committed snapshot
    |
    v
restart Player process
    |
    v
restore Player configuration
    |
    v
restore Player artifact
    |
    v
restart Edge Runtime
    |
    v
system rollback / Recovery handoff
```

The Player shall not trigger full system Recovery merely because one content item failed. Escalation requires evidence that lower-level actions cannot restore a valid Player state.

### 15.3 Crash evidence

Each crash or watchdog action shall preserve:

```text
player_instance_id
manifest_reference
entry_reference
asset_reference
state
health
resource_observation
error_code
restart_count
timestamp
```

Private keys, credentials and raw protected content are excluded.

### 15.4 Reboot resumption

After reboot, the Player shall:

1. validate the signed Player artifact and Runtime interface;
2. obtain the active committed Local Content Store snapshot;
3. validate clock and schedule state;
4. recover only an authorized playlist entry;
5. record that the prior instance ended by reboot or interruption;
6. enter `READY`, `PLAYING`, `WAITING_FOR_CONTENT` or `DEGRADED` according to observed facts.

It shall not claim continuity of an item whose actual rendering cannot be established.

---

## 16. PlayerHealth

`PlayerHealth` is an operational observation, not a compatibility or Evidence decision.

### 16.1 Canonical PlayerHealth

```text
PlayerHealth
|- player_instance_id
|- player_contract_reference
|- HardwareProfile reference
|- InstallationProfile reference
|- state
|- web_engine_status
|- display_status
|- codec_status
|- content_store_status
|- clock_status
|- memory_status
|- cpu_status
|- gpu_vpu_status
|- watchdog_status
|- last_playback_reference
|- last_error_reference
|- observed_at
|- health_revision
|- result_hash
```

### 16.2 Health states

```text
HEALTHY
DEGRADED
UNHEALTHY
UNKNOWN
```

`HEALTHY` requires the mandatory Player, Web Engine, display, content and Runtime checks to pass. Optional collector absence may coexist with `HEALTHY` when the active profile marks the collector optional.

### 16.3 Health transitions

Health shall be recalculated from observations and policy. It shall not be set to `HEALTHY` merely because the process is alive or the Web Engine page loaded.

The Player shall expose health before entering `READY`, after each recovery action and at the end of a playback session or update health gate.

---

## 17. Playback Facts and PlaybackResult

### 17.1 Playback fact boundary

Playback is the authoritative producer of execution facts. A Playback fact states what the Player observed during its own execution; it does not by itself assert legal validity, audience truth or financial responsibility.

Evidence Ledger may validate, correlate and materialize Evidence from authoritative Playback facts. Telemetry and AudienceProjection do not generate Evidence.

### 17.2 PlaybackResult schema

Every attempted playback entry shall produce an immutable `PlaybackResult`:

```text
PlaybackResult
|- playback_id
|- player_instance_id
|- device_identity_reference
|- HardwareProfile reference
|- InstallationProfile reference
|- manifest_reference
|- campaign_reference
|- entry_reference
|- asset_reference
|- scheduled_start
|- actual_start
|- scheduled_end
|- actual_end
|- duration_observed
|- completion_state
|- display_result
|- decode_result
|- integrity_result
|- fallback_result
|- interruption_result
|- health_reference
|- clock_reference
|- evidence_input_reference
|- telemetry_reference
|- result_hash
```

### 17.3 Completion states

```text
STARTED
COMPLETED
PARTIALLY_RENDERED
FAILED_BEFORE_RENDER
FAILED_DURING_RENDER
INTERRUPTED
FALLBACK_RENDERED
NOT_PLAYED
```

The Player shall not mark `COMPLETED` when the asset was never rendered, integrity failed before start or the schedule was not valid.

### 17.4 Playback signature

Where the Playback contract requires a signature, the Player shall produce the declared signed or integrity-bound execution record without exposing DeviceKey private material. The identity service or Runtime may perform the cryptographic operation on the Player's behalf.

### 17.5 Immutable execution facts

Playback results are append-only. A later correction or Evidence decision does not rewrite the original Player observation. A superseding interpretation references the original result.

---

## 18. Telemetry

The Player shall emit structured telemetry for:

```text
player_initialized
player_ready
player_state_changed
playlist_snapshot_loaded
content_wait_started
content_wait_ended
playback_started
playback_progress
playback_completed
playback_failed
fallback_started
fallback_completed
clock_degraded
codec_failure
display_failure
web_engine_failure
memory_pressure
watchdog_triggered
player_restarted
player_recovered
player_degraded
player_error
```

Each event shall include, where applicable:

```text
event_id
playback_id
player_instance_id
device_identity_reference
manifest_reference
asset_reference
state
timestamp
clock_reference
health_reference
error_code
content_digest_reference
causation_reference
```

Telemetry is queued locally when offline and synchronized by Edge Runtime. The Player shall not emit secrets, raw protected content, private keys or unnecessary personal data.

---

## 19. Network and Runtime Interface Failure

### 19.1 Runtime unavailable

If Edge Runtime becomes temporarily unavailable while the Player has an active validated snapshot, the Player may continue playback according to the content and clock policy. It shall report the Runtime degradation and stop accepting new control instructions until the interface is restored.

### 19.2 Interface integrity failure

If the Player cannot authenticate or validate a Runtime interface, it shall not send credentials, accept new manifests or execute privileged requests. Existing playback continues only when the local content and security policy permit it.

### 19.3 Content Store unavailable

If the Local Content Store cannot be read or its integrity cannot be verified, the Player shall enter `WAITING_FOR_CONTENT`, `DEGRADED` or `ERROR` according to the observed condition. It shall not substitute browser cache or a network URL as the authoritative store.

### 19.4 Network reconnection

When the Runtime reconnects, the Player shall not interrupt a valid item solely to acknowledge the connection. It observes new committed content at the next permitted boundary.

---

## 20. OTA and Recovery Integration

### 20.1 OTA precondition

OTA shall not activate a new Player or Web Engine artifact until the Hardware Profile, Installation Profile, security policy, artifact manifest and Player health contract are validated.

### 20.2 Content preservation

Player artifact updates and OS updates shall preserve Local Content Store content by default. A content migration is a separate explicitly signed policy.

### 20.3 Player update activation

The new Player artifact shall be staged and verified without modifying the active Player until the OTA activation boundary. After activation, the Player shall pass:

```text
artifact verification
Web Engine compatibility
codec/display capability
Local Content Store access
manifest loading
clock integration
health checks
```

Failure returns to the OTA/Recovery contract; the Player shall not select an arbitrary prior binary.

### 20.4 Recovery

Recovery may restart or restore Player state according to the Recovery Plan. A Player failure alone shall not erase identity, content or system state. Recovery shall preserve the active committed content snapshot when the policy allows.

### 20.5 Last Known Good

Player health is one of the required conditions for an OTA state to become `MARKED_GOOD`. A device shall not mark a new OS/Runtime/Player state good while Player health is unknown or failed.

---

## 21. Content and Playback Error Catalog

The following Player error identities are normative:

```text
PLY_MANIFEST_MISSING
PLY_MANIFEST_INVALID
PLY_MANIFEST_REVOKED
PLY_MANIFEST_NOT_EFFECTIVE
PLY_CONTENT_NOT_READY
PLY_CONTENT_DIGEST_MISMATCH
PLY_CONTENT_REVOKED
PLY_CONTENT_QUARANTINED
PLY_CONTENT_STORE_UNAVAILABLE
PLY_CONTENT_STORE_INTEGRITY_FAILED
PLY_HARDWARE_PROFILE_MISSING
PLY_INSTALLATION_PROFILE_MISSING
PLY_WEB_ENGINE_UNSUPPORTED
PLY_CODEC_UNSUPPORTED
PLY_CODEC_INITIALIZATION_FAILED
PLY_DISPLAY_INITIALIZATION_FAILED
PLY_CLOCK_UNTRUSTED
PLY_SCHEDULE_INVALID
PLY_SLOT_BOUNDARY_CONFLICT
PLY_RUNTIME_INTERFACE_UNAVAILABLE
PLY_RUNTIME_INTERFACE_UNTRUSTED
PLY_MEMORY_LIMIT
PLY_CPU_LIMIT
PLY_GPU_VPU_LIMIT
PLY_THERMAL_LIMIT
PLY_ASSET_TOO_LARGE
PLY_ASSET_DURATION_INVALID
PLY_SCRIPT_POLICY_VIOLATION
PLY_PLAYER_ARTIFACT_INVALID
PLY_PLAYER_SIGNATURE_INVALID
PLY_WATCHDOG_TIMEOUT
PLY_RENDER_STALLED
PLY_DECODE_STALLED
PLY_PLAYBACK_INTERRUPTED
PLY_FALLBACK_UNAVAILABLE
PLY_RECOVERY_FAILED
PLY_TELEMETRY_QUEUE_FULL
PLY_RESULT_SEAL_FAILED
```

Each error shall declare phase, retryability, recoverability, affected item, fallback behavior and required telemetry. An error shall not be silently converted into successful playback.

---

## 22. Player Security Invariants

The Player shall:

- run only from a verified and authorized artifact;
- consume only committed Local Content Store snapshots;
- use only the Web Engine and codecs declared by the Hardware Profile;
- operate offline when local authorization and content permit it;
- never use browser cache as the authoritative store;
- never access DeviceKey, trust anchors or private secrets;
- never execute arbitrary campaign JavaScript outside the declared sandbox;
- never write boot, system, identity or Recovery partitions;
- never alter Campaign, Pricing, Financial, Evidence or Settlement state;
- preserve schedule and slot boundaries;
- record actual playback facts immutably;
- protect playback and telemetry from replay or duplicate side effects;
- stop, degrade or recover explicitly when integrity or capability is unknown.

---

## 23. Normative Requirements

### PLY-001

The Player shall use Local Content Store as the authoritative source for offline playback.

### PLY-002

The Player shall not use browser cache as an authoritative content store.

### PLY-003

The Player shall reproduce authorized content without Internet access when the content, manifest, clock and policy are locally valid.

### PLY-004

The Player shall consume content only through authorized Edge Runtime and Local Content Store interfaces.

### PLY-005

The Player shall require a verified Hardware Profile, Installation Profile, Web Engine, codec and display capability context.

### PLY-006

The Player shall use one explicit state machine including `READY`, `PLAYING`, `PAUSED`, `WAITING_FOR_CONTENT`, `DEGRADED`, `ERROR` and `RECOVERING`.

### PLY-007

The Player shall enter `PLAYING` only with a verified, authorized and schedule-valid asset.

### PLY-008

Content activation shall be atomic; a partial or invalid content package shall not replace the active snapshot.

### PLY-009

Content updates shall not interrupt valid playback except where the manifest explicitly authorizes interruption.

### PLY-010

The Player shall preserve schedule and slot boundaries and shall not move an item into another authorized slot.

### PLY-011

The Player shall apply explicit duration, transition and fallback policies.

### PLY-012

The Player shall report invalid, missing, revoked or incompatible content without treating it as successfully rendered.

### PLY-013

Resource usage shall respect the CPU, memory, GPU, VPU, storage and thermal limits of the active Hardware Profile.

### PLY-014

One-gigabyte RAM devices shall be supported only when the bound Hardware Profile and Web Engine contract validate the constrained configuration.

### PLY-015

The Player shall release temporary media and rendering resources at safe item boundaries and expose resource pressure.

### PLY-016

The Player shall use the validated hardware decode/render path or an explicitly validated software fallback.

### PLY-017

The Player shall use authoritative Runtime clock and timezone state for schedule evaluation.

### PLY-018

Network loss shall not stop valid offline playback or cause substitution with browser cache.

### PLY-019

The Player shall not execute arbitrary campaign JavaScript with privileged access.

### PLY-020

Player and Web Engine failures shall be isolated from identity, OTA, Recovery and audit controls.

### PLY-021

The watchdog shall detect Player liveness, render, decode, display and resource failures.

### PLY-022

Player recovery shall prefer restart and local state restoration before system rollback or full Recovery.

### PLY-023

After reboot, the Player shall resume only from the committed and validated local snapshot.

### PLY-024

Every playback attempt shall produce an immutable `PlaybackResult`.

### PLY-025

Playback facts shall remain distinct from Evidence materialization and audience projections.

### PLY-026

Player telemetry shall be structured, replay-protected where required and free of secret material.

### PLY-027

OTA shall not mark a new system state good until Player health confirmation succeeds.

### PLY-028

Revoked or quarantined content shall not be selected for playback.

### PLY-029

Fallback content shall be previously validated, authorized and explicitly identified in playback results.

### PLY-030

Unknown mandatory capability, integrity or authorization shall produce an explicit wait, degradation, error or Recovery result, never implicit success.

---

## 24. Completion Criteria

The Player contract is implementable for a target only when its Hardware Profile, Installation Profile, Edge OS and Runtime provide:

```text
validated Web Engine
codec and VPU limits
display path
RAM/CPU/GPU/VPU budgets
Local Content Store interface
manifest and authorization contract
clock and timezone contract
watchdog and recovery contract
security sandbox
telemetry and PlaybackResult contract
OTA/Recovery integration
```

An absent or unknown mandatory capability blocks the affected playback path. The Player shall not infer support from a commercial name, file extension, browser user agent or successful process startup.

---

## 25. Relationship to Other Specifications

```text
EDGE_HARDWARE_PROFILES.md
        |
        v
EDGE_INSTALLATION_PROFILES.md
        |
        v
EDGE_OS_SPECIFICATION.md
        |
        +--> Edge Runtime
        |       |
        |       v
        |  Local Content Store
        |       |
        |       v
        |  EDGE_PLAYER_SPECIFICATION.md
        |
        +--> EDGE_SECURITY.md
        +--> EDGE_OTA.md
        +--> EDGE_RECOVERY.md
        +--> Playback / Evidence Ledger contracts
```

The Player remains a playback execution component. It does not create a new Audience Bounded Context and does not acquire authority over Evidence, Pricing or financial consequences.

---

## 26. Next Review

Before implementation, the architecture review shall verify:

```text
Hardware Profile capability bindings
Installation Profile target bindings
Edge OS Web Engine contract
Security sandbox and privilege contract
Local Content Store contract
Playback and Evidence event contracts
OTA Player health gate
Recovery escalation path
low-resource validation evidence
```

No concrete Web Engine, codec, TV Box model or RAM optimization strategy becomes homologated merely by this document. Concrete choices require Hardware Profile evidence and the applicable installation, OS, security, OTA and Recovery gates.
