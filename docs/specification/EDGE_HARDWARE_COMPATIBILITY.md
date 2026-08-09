# Mostarda Edge — Hardware Compatibility Specification

**Status:** DRAFT  
**Version:** 1.0.0  
**Owner:** Mostarda Architecture  
**Related ADR:** ADR-010 — Edge Hardware and Provisioning  
**Supersedes:** None  
**Scope:** Edge hardware eligibility, compatibility classification and homologation

---

## 1. Purpose

This document defines the normative compatibility contract for hardware capable of running Mostarda Edge.

It establishes:

- minimum hardware requirements;
- compatibility classes;
- hardware capability requirements;
- eligibility rules;
- rejection rules;
- homologation evidence;
- relationship between hardware compatibility and Hardware Profiles;
- lifecycle of supported hardware;
- requirements for unknown hardware.

This document does not define the implementation of Hardware Discovery, Installation Adapters, Edge OS, Player, OTA or Recovery. Those components shall consume the compatibility contract defined here.

---

# 2. Architectural Principle

Mostarda Edge is hardware-independent at the platform contract level.

A commercial device model, manufacturer name or product name is not sufficient to establish compatibility.

Compatibility shall be determined from actual hardware capabilities.

Therefore:

```text
Commercial Device Name
        ≠
Hardware Identity
        ≠
Hardware Profile
```

The compatibility decision shall be based on detected and validated hardware characteristics.

The platform shall never install production Edge software solely because a device reports a known commercial model name.

---

# 3. Compatibility Model

Hardware compatibility is evaluated through the following layers:

```text
Hardware Discovery
        ↓
Hardware Capabilities
        ↓
Compatibility Evaluation
        ↓
Hardware Profile
        ↓
Installation Profile
```

Each layer has a distinct responsibility.

### 3.1 Hardware Discovery

Determines what hardware is actually present.

Discovery is responsible for collecting facts.

It shall not decide whether hardware is supported.

### 3.2 Hardware Capabilities

Represent objectively detected capabilities, including:

* CPU/SoC;
* architecture;
* RAM;
* storage;
* GPU;
* VPU/video decoder;
* codecs;
* display output;
* network interfaces;
* USB;
* thermal characteristics;
* boot characteristics;
* recovery capabilities;
* update capabilities.

### 3.3 Compatibility Evaluation

Evaluates detected capabilities against the compatibility rules defined in this document.

### 3.4 Hardware Profile

Represents a validated hardware configuration that has passed the required compatibility and homologation criteria.

### 3.5 Installation Profile

Defines how a specific Hardware Profile is provisioned.

A Hardware Profile does not itself define the installation mechanism.

---

# 4. Compatibility States

Every detected hardware configuration shall have exactly one compatibility state.

```text
UNKNOWN
UNSUPPORTED
EXPERIMENTAL
PRODUCTION
PREFERRED
DEPRECATED
BLOCKED
```

## 4.1 UNKNOWN

The hardware cannot be reliably matched to a known Hardware Profile.

Characteristics:

* incomplete discovery;
* unknown board;
* unknown boot characteristics;
* insufficient capability information;
* no validated profile.

Behavior:

```text
NO AUTOMATIC PROVISIONING
NO PRODUCTION INSTALLATION
```

Unknown hardware shall be treated as unsafe by default.

---

## 4.2 UNSUPPORTED

The hardware is known but does not satisfy the minimum requirements.

Examples:

* insufficient RAM;
* insufficient storage;
* unsupported architecture;
* unsupported codec requirements;
* unsupported display capabilities;
* insufficient recovery capability.

Behavior:

```text
NO PROVISIONING
NO PRODUCTION INSTALLATION
```

---

## 4.3 EXPERIMENTAL

The hardware satisfies minimum technical requirements but has not completed production homologation.

Experimental hardware may be used for:

* laboratory testing;
* development;
* controlled pilots;
* engineering validation.

Experimental hardware shall not automatically enter the production hardware catalog.

---

## 4.4 PRODUCTION

The hardware has passed all mandatory compatibility and homologation criteria.

Production hardware may be provisioned automatically according to its Installation Profile.

---

## 4.5 PREFERRED

A Production profile that exceeds the minimum requirements and is recommended for new deployments.

Preferred status does not change the functional contract.

---

## 4.6 DEPRECATED

Previously supported hardware that shall no longer be used for new deployments.

Existing devices may remain operational according to the applicable lifecycle policy.

---

## 4.7 BLOCKED

Hardware explicitly prohibited from provisioning.

A profile may be blocked because of:

* security vulnerability;
* unrecoverable installation behavior;
* unstable firmware;
* defective hardware revision;
* incompatibility discovered after production;
* inability to guarantee content playback;
* inability to guarantee recovery;
* inability to guarantee secure updates.

Blocked hardware shall never be automatically provisioned.

---

# 5. Minimum Hardware Requirements

The following requirements establish the initial Mostarda Edge eligibility boundaries.

These are architectural eligibility thresholds and do not constitute a guarantee that every device satisfying them will pass homologation.

---

## 5.1 RAM

| Class        | Minimum RAM |
| ------------ | ----------: |
| Experimental |        1 GB |
| Production   |        2 GB |
| Preferred    |        4 GB |

Devices below 1 GB RAM are unsupported.

RAM capacity alone does not establish compatibility.

---

## 5.2 Storage

| Class        | Minimum Storage |
| ------------ | --------------: |
| Experimental |            8 GB |
| Production   |           16 GB |
| Preferred    |           32 GB |

Devices below 8 GB usable storage are unsupported.

The relevant value is **usable storage available to the Edge installation**, not the nominal capacity printed by the manufacturer.

Storage consumed by inaccessible, reserved or vendor-specific partitions shall not count toward the requirement.

---

# 6. Storage Reservation

The Edge shall reserve storage capacity for system-critical functions.

Reserved capacity shall include, where supported:

```text
Edge OS
Edge Runtime
Player
Recovery
OTA artifacts
Telemetry queue
Configuration
Local Content Store
```

Content storage shall never be allowed to consume storage required for:

* boot;
* runtime;
* recovery;
* update;
* configuration;
* identity;
* telemetry persistence.

The implementation shall enforce storage thresholds before accepting new content.

## 6.1 Canonical cross-layer resource contract

`EDGE_HARDWARE_COMPATIBILITY.md` is the sole source for platform-wide eligibility thresholds. Other Edge specifications consume the values declared by the active `HardwareProfile` and `InstallationProfile`; they shall not introduce competing minimums.

| Dimension | Experimental minimum | Production minimum | Preferred target | Source of remaining operational limits |
| --- | --- | --- | --- | --- |
| RAM | 1 GB | 2 GB | 4 GB | `memory.ram.usable`, Runtime/Player reserve and profile evidence |
| Usable storage | 8 GB | 16 GB | 32 GB | `storage.usable`, `storage.reserved`, partition plan and Store quota |
| CPU/SoC | supported architecture and validated workload | same plus production homologation | validated sustained margin | Hardware Profile operational limits and test evidence |
| GPU/VPU/codecs/display | required path validated for the declared Player workload | production playback evidence | validated margin for intended workload | Hardware Profile capability and playback evidence |
| Thermal | bounded laboratory validation | sustained commercial workload without unsafe throttling | validated margin under long-run workload | Hardware Profile `maximum_sustained_temperature` and evidence |
| Network | declared bootstrap/offline behavior | at least one reliable path | Ethernet preferred for fixed installations | Hardware Profile interface and reconnection limits |
| Player/Web Engine | profile-specific health and playback validation | production playback and offline validation | validated resource/thermal margin | Player, Web Engine and codec references in Hardware Profile |
| Local Content Store | reserved system/update/recovery/telemetry capacity | same plus production quota and power-loss validation | additional content margin | Installation Profile storage plan and Store quota |

For dimensions without a universal scalar, `minimum`, `recommended` and `preferred` are profile states, not guessed numbers: the minimum is a mandatory measured capability, the recommended value is a tested operating margin and the preferred value is the margin required for `PREFERRED` lifecycle. A profile cannot omit a limit, replace it with a commercial name or leave a production threshold implicit.

The active profile must expose, at minimum, the limit name, value, unit, scope, test reference, test environment, confidence and observation time defined by `EDGE_HARDWARE_PROFILES.md`. This makes generic implementation deterministic while keeping hardware-specific values out of the platform-wide contract.

---

# 7. CPU / SoC

A compatible device shall use a supported CPU architecture and SoC family.

The Hardware Profile shall identify at minimum:

```text
architecture
soc_vendor
soc_family
soc_model
board_identifier
board_revision
```

The following are not sufficient for compatibility:

```text
manufacturer name
commercial model name
CPU marketing name
Android build fingerprint alone
```

SoC compatibility shall be evaluated together with:

* GPU/VPU;
* kernel support;
* device tree;
* boot mechanism;
* video decoding;
* display pipeline;
* thermal behavior.

---

# 8. GPU and Video Processing

A compatible hardware profile shall provide a validated rendering path for the selected Player implementation.

The profile shall identify:

```text
GPU
GPU driver
VPU
hardware decode capabilities
hardware encode capabilities, if required
supported display modes
```

Hardware acceleration shall be preferred over software decoding.

A device shall not be promoted to Production when required playback workloads depend on sustained software decoding that causes unacceptable CPU utilization, thermal behavior or playback instability.

---

# 9. Codec Compatibility

Codec support shall be evaluated per Hardware Profile.

The platform shall not assume codec support solely from the SoC name.

The profile shall record:

```text
codec
container
maximum resolution
maximum frame rate
hardware/software path
bit depth
hardware acceleration
```

A codec shall be considered production-supported only after successful playback validation on the target Hardware Profile.

---

# 10. Web Engine Compatibility

The Player architecture requires a Web-capable rendering environment.

A Hardware Profile shall identify the validated Web Engine implementation.

The Web Engine shall provide sufficient support for the Mostarda Player runtime, including:

* JavaScript execution;
* HTML5;
* media playback;
* hardware-accelerated rendering where required;
* local content access;
* persistent local application state;
* required browser APIs;
* stable long-duration execution.

Web Engine selection is implementation-specific and shall be recorded in the Hardware Profile.

The hardware compatibility decision shall not depend on a single universal Web Engine.

---

# 11. Display and HDMI

Production hardware shall provide a validated display output compatible with the intended deployment.

The Hardware Profile shall record:

```text
connector
maximum resolution
supported refresh rates
HDCP requirements, if applicable
display initialization behavior
```

A device shall not be considered Production-compatible if display initialization is unreliable across reboot and power-cycle scenarios.

---

# 12. Network

A production profile shall provide at least one reliable network path.

Supported interfaces may include:

```text
Ethernet
Wi-Fi
```

The profile shall record:

```text
interface
chipset
driver
link state
DHCP behavior
DNS behavior
reconnection behavior
```

Ethernet is preferred for fixed commercial installations.

Wi-Fi may be used where Ethernet is unavailable and the profile has passed stability testing.

---

# 13. USB

USB is not a universal requirement for normal playback operation.

When present, USB may be used for:

* assisted provisioning;
* external bootstrap;
* recovery;
* diagnostics;
* controlled maintenance.

USB shall not be required for a Production installation when the corresponding Hardware Profile declares a fully automated provisioning method.

---

# 14. Thermal Requirements

The device shall be capable of sustained operation under expected commercial workload.

Thermal validation shall include:

```text
continuous playback
network activity
content synchronization
telemetry
CPU utilization
GPU/VPU utilization
ambient operating conditions
```

A device shall not be promoted to Production if thermal throttling or overheating causes:

* playback interruption;
* system instability;
* reboot;
* corruption;
* unacceptable performance degradation.

Thermal behavior is part of hardware compatibility.

---

# 15. Boot Compatibility

A Hardware Profile shall define the validated boot path.

The profile shall identify, where applicable:

```text
bootloader
boot mode
boot partition
kernel requirements
DTB requirements
recovery mechanism
secure boot state
```

The Mostarda installer shall never assume that Android permission implies permission to modify:

* bootloader;
* boot partition;
* recovery;
* kernel;
* device tree;
* eMMC;
* system partitions.

---

# 16. Recovery Compatibility

Production hardware shall provide a validated recovery path.

The recovery mechanism may be:

* A/B system slots;
* recovery partition;
* known-good system image;
* hardware-supported recovery;
* another validated mechanism.

The exact mechanism is Hardware Profile-specific.

A device that cannot be safely recovered from a failed production update shall not be classified as Production unless an equivalent validated recovery mechanism exists.

---

# 17. OTA Compatibility

Production hardware shall support the required OTA lifecycle.

The profile shall define:

```text
update mechanism
boot requirements
rollback mechanism
minimum firmware requirements
artifact compatibility
recovery path
```

An update shall never be applied solely because a newer version exists.

The update system shall verify compatibility with the Hardware Profile before activation.

---

# 18. Device Identity

A compatible device shall support persistent Edge identity.

The production identity model shall include:

```text
EdgeInstallationId
DeviceKey
HardwareProfile
InstallationProfile
```

MAC address shall not be used as the primary device identity.

Hardware identity shall survive normal software updates.

---

# 19. Unknown Hardware Policy

Unknown hardware shall be blocked by default.

The provisioning system shall execute:

```text
DISCOVER
    ↓
IDENTIFY
    ↓
MATCH PROFILE
    ↓
EVALUATE
    ↓
PROVISION
```

If profile matching fails:

```text
STOP
```

The installer shall not attempt to guess a compatible image.

It shall not:

* select a generic DTB;
* select a generic kernel;
* overwrite unknown partitions;
* force installation;
* modify bootloader state;
* write eMMC;
* bypass compatibility checks.

---

# 20. Commercial Model Independence

Hardware compatibility shall not be keyed exclusively by commercial model.

For example:

```text
MXQ Pro 4K 5G
```

shall not constitute a Hardware Profile.

Different boards may share the same commercial name.

The actual profile shall represent the detected hardware configuration.

Example:

```text
hardware_profile:
  soc_family: amlogic-gxl
  soc_model: s905w
  board: <detected-board>
  revision: <detected-revision>
  ram: 1024
  storage: 16384
```

The exact profile identifier shall only be created after discovery and validation.

---

# 21. Initial Experimental Hardware Target

The first experimental hardware family shall be:

```text
Amlogic S905W / GXL
```

This designation represents a candidate hardware family, not automatic compatibility.

The first laboratory device may be an MXQ Pro 4K 5G.

The MXQ Pro 4K 5G shall remain:

```text
EXPERIMENTAL
```

until its exact hardware configuration has been discovered and all required validation criteria have passed.

The commercial product name shall never be used as the production compatibility key.

---

# 22. Compatibility Evaluation

Compatibility shall be evaluated as a conjunction of mandatory capabilities.

Conceptually:

```text
Compatible =
    RAM
    AND Storage
    AND CPU/SoC
    AND GPU/VPU
    AND Codec
    AND WebEngine
    AND Display
    AND Network
    AND Thermal
    AND Boot
    AND Recovery
    AND OTA
    AND Identity
```

A failure in any mandatory production capability prevents Production classification.

Optional capabilities shall not be treated as mandatory.

---

# 23. Homologation Requirements

A Hardware Profile shall not become Production solely from static hardware inspection.

The following validation categories are mandatory.

## 23.1 Discovery

Verify:

* hardware identification;
* board identification;
* RAM;
* storage;
* network;
* GPU/VPU;
* boot characteristics.

## 23.2 Boot

Verify:

* cold boot;
* warm reboot;
* power-cycle boot;
* normal shutdown/startup;
* repeated reboot stability.

## 23.3 Provisioning

Verify:

* profile matching;
* installation;
* identity creation;
* configuration;
* first boot;
* provisioning recovery after interruption.

## 23.4 Playback

Verify:

* supported media;
* rendering;
* hardware acceleration;
* long-duration playback;
* scheduled transitions;
* resource utilization.

## 23.5 Offline Operation

Verify:

* content preloading;
* network loss;
* continued playback;
* telemetry persistence;
* network recovery;
* synchronization after reconnection.

## 23.6 OTA

Verify:

* valid update;
* invalid update rejection;
* incompatible artifact rejection;
* interrupted update;
* successful activation.

## 23.7 Rollback

Verify:

* failed update;
* automatic rollback;
* boot into known-good state;
* preservation of identity;
* preservation of configuration.

## 23.8 Recovery

Verify:

* recovery invocation;
* recovery after failed boot;
* recovery after failed update;
* restoration of operational state.

## 23.9 Telemetry

Verify:

* device identity;
* hardware profile;
* software version;
* uptime;
* resource metrics;
* network state;
* player state;
* synchronization;
* update state;
* recovery state.

## 23.10 Long-run Stability

Production hardware shall pass sustained operation under representative workload.

The validation period and workload shall be defined by the Hardware Profile test plan.

---

# 24. Promotion Rules

A Hardware Profile follows:

```text
Candidate
   ↓
Experimental
   ↓
Production
   ↓
Preferred
```

Promotion shall require evidence.

### Candidate → Experimental

Requires:

* successful hardware discovery;
* minimum RAM;
* minimum usable storage;
* supported architecture;
* bootable Edge OS path;
* basic Player path.

### Experimental → Production

Requires all mandatory homologation categories.

### Production → Preferred

Requires:

* production stability;
* adequate performance margin;
* favorable operational characteristics;
* preferred RAM/storage profile;
* no unresolved critical issues.

---

# 25. Failure and Blocking Rules

A Hardware Profile shall be blocked when any condition creates unacceptable operational risk.

Examples:

* repeated boot failure;
* unrecoverable OTA;
* persistent thermal instability;
* hardware decode failure;
* display instability;
* network driver instability;
* identity loss;
* storage corruption;
* inability to recover;
* security vulnerability;
* inconsistent board identification.

Blocking shall immediately prevent new automatic provisioning.

---

# 26. Hardware Profile Relationship

The compatibility specification defines eligibility.

The Hardware Profile defines the validated configuration.

Therefore:

```text
EDGE_HARDWARE_COMPATIBILITY.md
              │
              │ defines
              ▼
      Compatibility Rules
              │
              ▼
EDGE_HARDWARE_PROFILES.md
              │
              │ instantiates
              ▼
     Validated Hardware
```

A Hardware Profile shall not override compatibility requirements.

---

# 27. Installation Relationship

Hardware compatibility does not determine the installation mechanism by itself.

The flow is:

```text
Hardware Profile
        ↓
Installation Profile
        ↓
Installation Adapter
        ↓
Provisioning
```

A hardware profile may have more than one valid installation profile.

For example:

```text
Full Provisioning
Assisted Provisioning
External Bootstrap
```

The provisioning system shall select only an Installation Profile explicitly associated with the Hardware Profile.

---

# 28. Production Safety Rule

The provisioning system shall favor false negatives over unsafe installation.

When compatibility cannot be established with sufficient confidence:

```text
DO NOT INSTALL
```

A device requiring manual engineering investigation shall be classified as:

```text
UNKNOWN
```

or:

```text
EXPERIMENTAL
```

rather than being provisioned as Production.

---

# 29. Normative Requirements

The following requirements are normative.

### HC-001

Production hardware shall have at least 2 GB RAM.

### HC-002

Production hardware shall have at least 16 GB usable storage.

### HC-003

Hardware below 1 GB RAM or 8 GB usable storage shall be unsupported.

### HC-004

RAM and storage shall not be sufficient by themselves to establish compatibility.

### HC-005

Unknown hardware shall be blocked from automatic provisioning.

### HC-006

Commercial model names shall not be used as the sole hardware identity.

### HC-007

Production hardware shall have a validated boot path.

### HC-008

Production hardware shall have a validated recovery path.

### HC-009

Production hardware shall support validated OTA behavior.

### HC-010

Production hardware shall support persistent Edge identity.

### HC-011

Production hardware shall support the validated Mostarda Player execution environment.

### HC-012

Required playback codecs shall be validated on the target Hardware Profile.

### HC-013

Production hardware shall pass thermal stability validation.

### HC-014

Production hardware shall pass offline playback validation.

### HC-015

Production hardware shall pass OTA and rollback validation.

### HC-016

Production hardware shall pass long-run stability validation.

### HC-017

Hardware profiles shall have explicit lifecycle states.

### HC-018

Hardware that fails a mandatory production criterion shall not be classified as Production.

### HC-019

The MXQ Pro 4K 5G shall remain experimental until its exact hardware configuration is identified and homologated.

### HC-020

Amlogic S905W/GXL is an initial experimental target family and does not imply automatic compatibility.

---

# 30. Next Specification

The next specification shall define the implementation of hardware discovery:

`EDGE_HARDWARE_DISCOVERY.md`

It shall consume this document and define how the Edge obtains the hardware facts required to perform compatibility evaluation.

It shall not redefine compatibility thresholds established here.
