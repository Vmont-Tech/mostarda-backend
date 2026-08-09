# Mostarda Edge — Edge OS Specification

**Status:** DRAFT  
**Version:** 1.0.0  
**Owner:** Mostarda Architecture  
**Prerequisites:** `EDGE_HARDWARE_COMPATIBILITY.md`, `EDGE_HARDWARE_DISCOVERY.md`, `EDGE_HARDWARE_PROFILES.md`, `EDGE_INSTALLER_SPECIFICATION.md`, `EDGE_PROVISIONING.md`, `EDGE_RECOVERY.md`  
**Related ADR:** ADR-010 — Edge Hardware and Provisioning  
**Scope:** Edge OS contract, runtime envelope, local-first operation and platform capabilities

---

## 1. Purpose

This document defines the normative contract for Mostarda Edge OS.

Mostarda Edge OS is the product operating-system envelope that provides a stable, secure and recoverable environment for:

```text
Provisioning
      ↓
Edge OS
      ↓
Edge Runtime
 ┌────┼────┐
 ↓    ↓    ↓
Player OTA Telemetry
 ↓
Local Content Store
 ↓
Recovery
```

It defines:

- OS layers and boundaries;
- the relationship between OS, Runtime and modules;
- candidate Linux base policy;
- boot and filesystem contracts;
- partition roles;
- mandatory services;
- process supervision and resource limits;
- network and offline behavior;
- display, GPU/VPU and Web Engine capability contracts;
- Player sandbox requirements;
- local storage and identity;
- security, logs and watchdog behavior;
- health checks and lifecycle states;
- OTA and Recovery integration;
- minimum requirements for Hardware Profiles.

This document defines what an Edge OS implementation must provide. It does not make Armbian the permanent product base and does not select a universal Web Engine, filesystem, bootloader or codec implementation.

---

## 2. Architectural Principle

`Mostarda Edge OS` is a product contract, not the name of a Linux distribution.

```text
Mostarda Edge OS Contract
        │
        ├── Armbian candidate implementation
        ├── another Linux implementation
        └── future compatible implementation
```

Armbian is the first Linux base candidate for homologating the initial Hardware Profiles. It remains replaceable as long as the replacement satisfies this contract and passes the same profile, security, recovery and operational gates.

An implementation shall not claim Edge OS compatibility merely because it boots Linux or Armbian. It must satisfy the observable contracts in this document.

---

## 3. Architectural Layers

### 3.1 Boot and platform layer

Provides the validated boot path, hardware initialization, device-tree or equivalent hardware description, trusted artifact activation and recovery entry.

### 3.2 Edge OS base

Provides the kernel, system libraries, filesystem, device access, process supervision, security boundary, networking and persistent system configuration required by Edge Runtime.

### 3.3 Edge Runtime

Provides the Mostarda operational envelope. It supervises Player, Local Content Store, Telemetry, OTA and health behavior without containing business rules.

### 3.4 Player

Provides timeline, content selection from authorized local storage, media decode and display rendering. Player is isolated from OS control-plane privileges.

### 3.5 Local Content Store

Provides authoritative local persistence for content, manifests, integrity metadata, playback readiness and offline operation. Browser cache is not the authoritative store.

### 3.6 Telemetry

Collects and persists operational observations. Telemetry does not create Evidence, decide compatibility or alter commercial commitments.

### 3.7 OTA

Coordinates authorized Edge OS, Runtime and module updates. OTA shall verify profile, signature, artifact and rollback compatibility before activation.

### 3.8 Recovery

Restores a known-good state through an explicit Recovery Plan. Recovery owns its recovery process and does not make compatibility decisions.

---

## 4. OS Responsibility Boundary

The Edge OS shall provide:

- deterministic boot and shutdown behavior;
- hardware and device access for authorized modules;
- persistent configuration and identity storage;
- process supervision;
- resource isolation;
- network interfaces;
- display and media capability access;
- secure artifact verification support;
- watchdog and health primitives;
- time and event ordering primitives;
- local storage durability;
- update and recovery hooks;
- structured logs and diagnostic evidence.

The Edge OS shall not provide:

- Campaign, Pricing, Financial, Settlement or Evidence rules;
- responsibility classification;
- audience or pricing decisions;
- an arbitrary image selection mechanism;
- a commercial API that bypasses bounded-context contracts.

---

## 5. Edge OS State Lifecycle

The Edge OS shall expose one operational lifecycle state:

```text
FACTORY
PROVISIONING
ACTIVE
DEGRADED
UPDATING
ROLLING_BACK
RECOVERY
QUARANTINED
SHUTDOWN
```

### 5.1 FACTORY

The device has not completed authorized provisioning. Production services shall not be presented as operational.

### 5.2 PROVISIONING

Provisioning is actively establishing the OS, Runtime, identity and configuration state.

### 5.3 ACTIVE

The OS, Runtime and required health checks are operational for the current Hardware Profile.

### 5.4 DEGRADED

The OS remains available but one or more non-terminal capabilities are unavailable or outside normal health. The state and affected capability shall be observable.

Degraded state shall not silently claim that all services are healthy.

### 5.5 UPDATING

An authorized OTA operation is staging or activating a validated update.

### 5.6 ROLLING_BACK

The OS is restoring the last known-good version after update or activation failure.

### 5.7 RECOVERY

The Recovery contract is executing or awaiting an authorized recovery path.

### 5.8 QUARANTINED

The device is prevented from normal production operation because integrity, identity, profile, security or recovery conditions are not safe.

### 5.9 SHUTDOWN

The OS has completed an authorized shutdown or is no longer providing active services.

---

## 6. State Transition Rules

The normal lifecycle is:

```text
FACTORY → PROVISIONING → ACTIVE
ACTIVE → DEGRADED
DEGRADED → ACTIVE
ACTIVE → UPDATING
UPDATING → ACTIVE
UPDATING → ROLLING_BACK
ROLLING_BACK → ACTIVE
ROLLING_BACK → RECOVERY
ACTIVE → RECOVERY
DEGRADED → RECOVERY
RECOVERY → ACTIVE
RECOVERY → QUARANTINED
ANY_ACTIVE_STATE → SHUTDOWN
```

Invalid transitions shall be rejected and logged. A module shall not change OS lifecycle state directly; it requests a transition through the Runtime control plane.

The OS shall preserve the reason, actor, timestamp, profile reference and evidence for every transition.

---

## 7. Hardware Profile Contract

An Edge OS instance shall run only under a validated Hardware Profile.

The profile shall identify:

```text
architecture
soc and board
RAM and usable storage
GPU/VPU
display
network
boot path
recovery path
secure boot state
Player/Web Engine capability
codec capability
OTA capability
identity capability
```

The OS shall expose the active profile identity and version to Runtime, Player, OTA, Recovery and Telemetry.

The OS shall not change Hardware Profile by inference after boot. A material hardware change requires Discovery, compatibility evaluation and profile resolution.

---

## 8. Base Linux and Armbian Policy

### 8.1 Contract independence

The Edge OS contract is distribution-independent.

### 8.2 Armbian candidate

Armbian may be used as the first Linux base for the initial experimental profiles. Its use requires:

- profile-specific boot validation;
- kernel and device-tree validation;
- driver and GPU/VPU validation;
- filesystem and persistence validation;
- OTA and recovery validation;
- security and long-run validation.

### 8.3 Replacement base

A different Linux base may replace Armbian only after demonstrating equivalent or superior compliance with this specification and the affected Hardware Profile requirements.

### 8.4 Base-specific assumptions

Edge modules shall consume OS capabilities through declared interfaces. They shall not assume an implementation-specific path, package manager, process manager or filesystem layout unless the Hardware Profile contract explicitly includes it.

---

## 9. Boot Contract

The boot path shall be defined by the Hardware Profile, Installation Profile and boot contract associated with the target.

The OS boot contract shall provide:

- verified artifact selection;
- hardware/profile binding;
- kernel and hardware-description binding;
- root filesystem selection;
- recovery entry;
- update activation marker;
- rollback marker where supported;
- boot-attempt tracking;
- last-known-good reference;
- secure integrity status.

The OS shall not boot an artifact solely because it is present on storage.

### 9.1 Boot attempts

Each boot attempt shall have a bounded and observable lifecycle:

```text
BOOT_REQUESTED
BOOT_STARTED
BOOT_KERNEL_READY
BOOT_ROOT_READY
BOOT_RUNTIME_HANDOFF
BOOT_HEALTH_PENDING
BOOT_CONFIRMED
BOOT_FAILED
```

Repeated unconfirmed boot attempts shall lead to the declared rollback or Recovery path and shall not create an uncontrolled boot loop.

### 9.2 Secure boot

Production profiles require a verifiable chain of integrity and trust, with Secure Boot where the hardware supports it or an explicitly validated equivalent. The concrete bootloader and key implementation remain Hardware Profile-specific.

---

## 10. Filesystem and Partition Contract

The exact filesystem implementation is Hardware Profile-specific, but the OS shall provide the following logical roles:

```text
BOOT
SYSTEM
RUNTIME
CONFIGURATION
IDENTITY
RECOVERY
UPDATE_STAGING
LOCAL_CONTENT
TELEMETRY_QUEUE
LOGS
```

### 10.1 Partition roles

Every role shall declare:

```text
role
target
capacity
mount or access mode
integrity behavior
preservation policy
rollback relation
recovery relation
```

### 10.2 System immutability

Production system artifacts shall not be modified by Player, content or ordinary Runtime operations.

### 10.3 Configuration persistence

Configuration shall survive ordinary Runtime restart and authorized OS update according to its policy. It shall not be stored only in transient memory or browser cache.

### 10.4 Identity persistence

Identity storage shall be separated from disposable application state and protected by the identity contract.

### 10.5 Local Content Store separation

Local Content Store shall not consume capacity reserved for boot, Runtime, recovery, identity, update staging or telemetry persistence.

### 10.6 Storage failure

The OS shall expose storage integrity, capacity and write-failure conditions. It shall prevent content allocation from consuming mandatory system reserve.

---

## 11. Minimum Capacity Requirements

The initial eligibility boundaries are inherited from `EDGE_HARDWARE_COMPATIBILITY.md`:

| Profile | Minimum RAM | Minimum usable storage | Treatment |
| --- | ---: | ---: | --- |
| Experimental | 1 GB | 8 GB | restricted and non-production |
| Production | 2 GB | 16 GB | minimum production candidate |
| Preferred | 4 GB | 32 GB | recommended operating margin |

RAM and storage are necessary filters, not sufficient compatibility conditions.

The OS shall reserve capacity for:

- boot;
- system;
- Runtime;
- Player;
- recovery;
- update artifacts;
- identity;
- configuration;
- telemetry queue;
- logs;
- Local Content Store metadata.

### 11.1 Memory behavior

The OS shall expose:

```text
total memory
usable memory
reserved memory
available memory
pressure state
process usage
```

The Runtime and modules shall be subject to profile-specific resource limits. Memory pressure shall produce a health signal before the OS reaches an unrecoverable condition.

### 11.2 Storage behavior

The OS shall expose nominal, usable, reserved and available storage separately. It shall reject new content or update staging when the mandatory reserve would be violated.

### 11.3 Resource failure

Resource exhaustion shall not silently kill a critical service without a health event, log and recovery policy.

---

## 12. Mandatory System Services

An Edge OS implementation shall provide service capabilities equivalent to:

```text
boot and activation manager
process supervisor
Edge Runtime host
identity service
configuration service
network manager
storage manager
Local Content Store interface
Player host interface
telemetry agent
watchdog
health manager
OTA agent
recovery handoff
logging service
time service
security/trust service
```

The concrete process manager or init system is implementation-specific. The observable lifecycle and health contracts are mandatory.

### 12.1 Service identity

Each service shall expose a stable service identity, contract version, lifecycle state and health result.

### 12.2 Service dependencies

Dependencies shall be explicit. A service shall not silently assume that a dependency is ready because its process exists.

### 12.3 Critical services

The OS shall distinguish critical services from optional collectors and modules. Failure of an optional capability shall not stop the Player unless the Hardware Profile explicitly requires it.

---

## 13. Process Management

The OS shall provide:

- process supervision;
- startup ordering;
- graceful shutdown;
- bounded restart behavior;
- resource limits;
- process identity and permissions;
- crash evidence;
- dependency health;
- prevention of uncontrolled restart loops.

### 13.1 Restart policy

Each managed service shall declare:

```text
restartable
maximum restart rate
backoff
dependency policy
failure escalation
```

The exact quantitative values are profile or operational configuration parameters, but their existence and observability are mandatory.

### 13.2 Process isolation

Player, content processing, telemetry collectors, OTA and Recovery interfaces shall not receive unrestricted OS privileges.

### 13.3 Shutdown

The OS shall provide an orderly shutdown path that flushes configuration, journal, identity references, Local Content Store metadata and telemetry according to their durability contract.

---

## 14. Edge Runtime Integration

Edge Runtime is the primary control-plane process inside the OS.

The OS shall provide Runtime with:

```text
process supervision
identity access
configuration access
Local Content Store access
network status
display/media capability access
telemetry queue
OTA handoff
Recovery handoff
health and watchdog interface
```

Runtime shall not require direct access to arbitrary boot or system partitions.

The OS shall expose desired and observed Runtime state separately.

---

## 15. Player and Web Engine Contract

### 15.1 Player boundary

Player shall run as an OS-managed module with restricted permissions.

Player may access:

- authorized Local Content Store content;
- display and media interfaces;
- required local configuration;
- playback telemetry interface.

Player shall not access:

- private identity keys;
- boot or recovery partitions;
- arbitrary system configuration;
- business bounded-context state;
- unsigned content manifests.

### 15.2 Web-capable environment

The Edge OS shall provide a Web-capable rendering environment sufficient for the validated Player implementation, including:

- JavaScript execution;
- HTML5 support;
- local content access through the authorized interface;
- persistent application state through the Local Content Store contract;
- media playback;
- hardware-accelerated rendering where required;
- stable long-duration operation.

The concrete Web Engine is selected per Hardware Profile and is not fixed by this document.

### 15.3 Sandbox

Player content shall execute in a sandbox with:

- restricted filesystem access;
- restricted network access according to policy;
- no key access;
- no arbitrary process creation;
- no boot or partition write capability;
- bounded resource usage.

### 15.4 Codec and VPU

Codec and VPU support shall come from the validated Hardware Profile. The OS shall expose capability and failure state rather than allowing Player to guess support.

---

## 16. Display and Graphics

The OS shall expose a validated display path for the active Hardware Profile:

```text
connector
mode
resolution
refresh rate
pixel format
display state
initialization result
GPU/VPU path
```

Display initialization shall be tested across cold boot, warm reboot, power cycle and recovery activation.

The OS shall expose rendering failures and hardware acceleration state to Runtime and Telemetry.

Software fallback may be used only when the Hardware Profile validates its performance and thermal behavior.

---

## 17. Network Contract

The OS shall provide network abstraction for:

```text
Ethernet
Wi-Fi
DNS
DHCP or static configuration
time synchronization
certificate trust
reconnection state
```

The exact network driver and interface are Hardware Profile-specific.

### 17.1 Desired and observed network state

The OS shall distinguish requested network configuration from observed link, address, DNS and connectivity state.

### 17.2 Intermittent connectivity

Network loss shall transition the OS or Runtime to an observable degraded condition without automatically stopping local playback or destroying queued telemetry.

### 17.3 Secure transport

All remote control, artifact, configuration and telemetry channels shall use the platform's approved secure transport and certificate policy. The OS shall expose certificate or trust failures explicitly.

---

## 18. Local-First and Offline Operation

The Edge OS shall support local-first operation after authorized content and configuration are synchronized.

Offline operation shall allow, subject to the Hardware Profile and Runtime contracts:

- playback from Local Content Store;
- local configuration access;
- identity continuity;
- telemetry queueing;
- operational health observation;
- later synchronization after reconnection.

Offline operation shall not:

- invent compatibility decisions;
- alter commercial commitments;
- publish Evidence without authoritative Playback facts;
- accept unsigned updates;
- silently change desired state.

Browser cache shall never be the authoritative offline content store.

---

## 19. Identity and Trust

The OS shall expose protected access to:

```text
EdgeInstallationId
DeviceKey
HardwareProfile reference
InstallationProfile reference
trust anchors
key status
```

Private keys shall never be exposed to Player, ordinary Runtime modules, logs, telemetry or content.

Identity shall survive ordinary Runtime restart and authorized OS update. Recovery and factory reset follow their explicit identity policies.

MAC address shall not be the primary Edge identity.

The OS shall expose identity inconsistency as a health and security condition, not silently create a replacement identity.

---

## 20. Security Contract

The Edge OS shall provide:

- verified boot or validated equivalent;
- signed artifact verification;
- trusted key storage or protected key integration;
- least-privilege services;
- Player sandbox;
- protected configuration and identity;
- secure update handoff;
- rollback policy enforcement;
- audit logs;
- secure transport;
- secret redaction.

### 20.1 Deny by default

Unknown modules, artifacts, profiles, configuration schemas and privileged requests shall be rejected unless explicitly authorized.

### 20.2 Downgrade

OS downgrade shall be allowed only through an authorized OTA or Recovery policy. A valid signature alone does not authorize a security downgrade.

### 20.3 Compromise response

When trust or identity cannot be verified, the OS shall enter `QUARANTINED`, `RECOVERY` or `SHUTDOWN` according to the applicable contract. It shall not continue silently as healthy.

---

## 21. Logs and Diagnostics

The OS shall provide structured logs for:

```text
boot
service lifecycle
resource pressure
storage
network
display
Player
identity
OTA
Recovery
security
configuration
```

Each log record shall include, where applicable:

```text
timestamp
device identity reference
Hardware Profile
OS version
Runtime version
service
severity
event code
correlation id
diagnostic references
```

Logs shall not contain private keys, passwords, tokens or raw secret material.

Log persistence shall survive the failure modes required by the Hardware Profile and shall have bounded storage consumption.

---

## 22. Watchdog and Health Checks

### 22.1 Watchdog

The OS shall provide a watchdog capable of detecting:

- boot non-confirmation;
- Runtime deadlock or failure;
- Player unresponsiveness;
- critical storage or configuration failure;
- repeated service crash;
- unacceptable resource pressure;
- failed update activation.

### 22.2 Health dimensions

Health shall be reported separately for:

```text
OS
Runtime
Player
Local Content Store
network
identity
storage
display
OTA
Recovery
telemetry
```

### 22.3 Health result

The OS shall expose:

```text
HEALTHY
DEGRADED
UNHEALTHY
UNKNOWN
```

Health is an operational observation. It does not replace compatibility or business decisions.

### 22.4 Recovery escalation

The watchdog shall prefer the least destructive valid response:

```text
restart module
    ↓
restart Runtime
    ↓
OS service recovery
    ↓
rollback
    ↓
Recovery
    ↓
quarantine/manual intervention
```

The exact escalation thresholds are profile or operational parameters; the ordering and observability are mandatory.

---

## 23. OTA Integration

OTA shall consume:

```text
Hardware Profile
Edge OS contract
artifact manifest
signature and trust policy
Recovery/rollback contract
```

The OS shall provide:

- staging location;
- artifact verification;
- profile binding;
- activation marker;
- health confirmation;
- rollback marker;
- last-known-good reference;
- update result and telemetry.

An update shall not become active merely because its version is newer.

The OS shall remain operational or enter a declared `UPDATING`, `ROLLING_BACK` or `RECOVERY` state during the lifecycle.

---

## 24. Recovery Integration

The OS shall integrate with Recovery through an explicit handoff containing:

```text
Hardware Profile
Installation Profile
Recovery Plan
current OS state
last-known-good reference
identity reference
journal reference
failure reason
```

The OS shall not invoke a generic recovery image.

Recovery shall validate restored OS, Runtime, Player, identity, configuration and telemetry before producing `KNOWN_GOOD_EDGE`.

---

## 25. Provisioning Integration

Provisioning establishes the OS state through the Installation Profile and shall persist:

```text
OS version
Runtime version
Hardware Profile
Installation Profile
boot configuration
filesystem roles
identity reference
network configuration reference
Recovery metadata
OTA metadata
```

The OS shall expose a post-provisioning validation interface. It shall not report `ACTIVE` before required checks pass.

---

## 26. Resource and Performance Requirements

### 26.1 Profile-specific limits

The Hardware Profile shall define tested limits for:

```text
CPU
RAM
storage
GPU/VPU
display
network
thermal behavior
continuous playback
```

The OS shall expose resource usage and pressure to Runtime and Telemetry.

### 26.2 No hidden exhaustion

The OS shall not allow Local Content Store, logs, telemetry, caches or staging artifacts to consume reserved capacity silently.

### 26.3 Long-run operation

Production profiles require long-run validation under representative playback, synchronization, telemetry and network conditions.

### 26.4 Performance failure

If resource or thermal limits are exceeded, the OS shall expose the condition and enter `DEGRADED`, `ROLLING_BACK`, `RECOVERY` or `QUARANTINED` according to the applicable policy. It shall not report healthy operation while required checks fail.

---

## 27. Configuration and Desired State

The OS shall distinguish:

```text
Desired State
Observed State
Last Known Good State
```

Desired State is supplied through authorized contracts. The OS shall not invent desired configuration when the control plane is unavailable.

Observed State shall report actual service, network, storage, display, Player, identity and update conditions.

Last Known Good State shall reference verified OS, Runtime, Player, configuration, identity and recovery metadata.

---

## 28. Hardware Profile Minimum Requirements

An Edge OS implementation shall not be promoted for a Hardware Profile unless the profile has validated:

### 28.1 Capacity

```text
Experimental: ≥ 1 GB RAM, ≥ 8 GB usable storage
Production:   ≥ 2 GB RAM, ≥ 16 GB usable storage
Preferred:    ≥ 4 GB RAM, ≥ 32 GB usable storage
```

### 28.2 Compute and media

- supported architecture;
- validated CPU/SoC;
- GPU/VPU path;
- required codec playback;
- display initialization;
- Web-capable Player environment.

### 28.3 System safety

- validated boot path;
- recovery path;
- OTA and rollback path;
- identity persistence;
- protected configuration;
- resource and thermal stability;
- long-run operation.

RAM and storage alone shall never promote a profile.

---

## 29. Failure Behavior

The OS shall use explicit failure codes and states for:

```text
BOOT_INTEGRITY_FAILURE
PROFILE_MISMATCH
IDENTITY_FAILURE
STORAGE_RESERVE_EXHAUSTED
FILESYSTEM_INTEGRITY_FAILURE
RUNTIME_START_FAILURE
PLAYER_START_FAILURE
DISPLAY_INITIALIZATION_FAILURE
NETWORK_CONFIGURATION_FAILURE
OTA_VALIDATION_FAILURE
RECOVERY_HANDOFF_FAILURE
RESOURCE_PRESSURE
WATCHDOG_ESCALATION
SCHEMA_UNSUPPORTED
TRUST_FAILURE
```

Failures shall preserve diagnostic evidence and shall not be converted to a healthy state by fallback inference.

---

## 30. Versioning and Compatibility

The OS shall preserve independent opaque identities for:

```text
edge_os_contract_version
base_distribution_version
kernel_version
runtime_version
player_version
web_engine_version
filesystem_contract_version
boot_contract_version
```

The platform shall not infer ordering or compatibility between these values. A compatibility matrix or profile contract shall declare supported combinations.

An unknown OS contract, configuration schema or module contract shall cause explicit rejection, safe degradation or recovery according to the applicable policy. It shall not be silently ignored.

---

## 31. Security and Privacy Boundaries

The OS shall minimize collection of personal or unrelated data. It shall expose only the hardware, health, runtime and telemetry capabilities required by authorized contracts.

The OS shall protect:

- identity keys;
- network credentials;
- artifact trust anchors;
- configuration secrets;
- local content integrity metadata;
- recovery and update metadata.

Player content and operational telemetry shall not gain access to private identity material.

---

## 32. Operational Completion Criteria

An OS installation may be considered operational only when:

```text
boot confirmed
Hardware Profile matched
Edge OS integrity verified
Edge Runtime healthy
Player initialized
display validated
Local Content Store available
identity available
configuration persisted
network state classified
watchdog active
health checks passing
telemetry emitted or durably queued
recovery metadata valid
```

The device shall be `ACTIVE` only after these checks pass or the Hardware Profile explicitly permits a declared degraded condition.

---

## 33. Normative Requirements

### OS-001

Mostarda Edge OS shall be defined as a product contract independent of a permanent Linux distribution.

### OS-002

Armbian may be the first candidate implementation but shall not be treated as the permanent Edge OS contract.

### OS-003

Edge OS, Edge Runtime, Player, OTA, Telemetry, Local Content Store and Recovery shall remain distinct layers with explicit interfaces.

### OS-004

The OS shall run only under a validated Hardware Profile.

### OS-005

The OS shall expose an explicit lifecycle state and reject invalid transitions.

### OS-006

The OS shall provide a validated boot path and last-known-good reference.

### OS-007

The OS shall provide logical storage roles for system, runtime, identity, recovery, update, content, telemetry and logs.

### OS-008

Local Content Store shall not consume mandatory system, identity, recovery, update or telemetry reserve.

### OS-009

The OS shall provide process supervision, resource limits and bounded restart behavior.

### OS-010

Critical service failure shall produce health, log and telemetry evidence.

### OS-011

The OS shall expose memory, storage, CPU, GPU/VPU, network and thermal conditions.

### OS-012

Player shall run with restricted OS privileges and shall not access private keys or boot partitions.

### OS-013

The OS shall provide a validated Web-capable environment for the active Player profile.

### OS-014

Codec and VPU support shall be validated per Hardware Profile.

### OS-015

The OS shall support local-first and offline playback from the authoritative Local Content Store.

### OS-016

Browser cache shall not be the authoritative offline content store.

### OS-017

The OS shall preserve `EdgeInstallationId` and `DeviceKey` according to identity policy.

### OS-018

MAC address shall not be the primary Edge identity.

### OS-019

Production OS artifacts shall be verified through signatures, digests and profile compatibility.

### OS-020

The OS shall provide watchdog and health checks for OS, Runtime, Player, storage, display, identity, network, OTA, Recovery and telemetry.

### OS-021

The OS shall integrate with OTA through staging, activation, health confirmation and rollback metadata.

### OS-022

The OS shall integrate with Recovery through an explicit Recovery Plan and last-known-good state.

### OS-023

The OS shall not silently continue after trust, identity, boot or storage integrity failure.

### OS-024

The OS shall preserve structured logs and diagnostic evidence without exposing secrets.

### OS-025

The OS shall support offline operation when the Hardware Profile and Runtime contracts permit it.

### OS-026

The OS shall not introduce Campaign, Pricing, Financial, Evidence or Settlement logic.

### OS-027

RAM and storage thresholds shall be evaluated together with CPU/SoC, GPU/VPU, codecs, display, thermal, boot, recovery, OTA and identity capabilities.

### OS-028

Unknown module, artifact, profile or schema behavior shall be rejected or explicitly degraded rather than inferred.

### OS-029

The OS shall distinguish Desired State, Observed State and Last Known Good State.

### OS-030

The OS shall not report `ACTIVE` until required post-provisioning health checks pass.

---

## 34. Next Specification

The next specification shall define the Edge OTA contract:

`EDGE_OTA.md`

It shall consume:

```text
EDGE_HARDWARE_COMPATIBILITY.md
EDGE_HARDWARE_DISCOVERY.md
EDGE_HARDWARE_PROFILES.md
EDGE_INSTALLER_SPECIFICATION.md
EDGE_PROVISIONING.md
EDGE_RECOVERY.md
EDGE_OS_SPECIFICATION.md
```

It shall define update manifests, compatibility, rollout, activation, rollback and version evolution without changing the Edge OS boundaries established here.
