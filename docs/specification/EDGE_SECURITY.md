# Mostarda Edge — Security Specification

**Status:** DRAFT
**Version:** 1.0.0
**Owner:** Mostarda Architecture
**Prerequisites:** `EDGE_HARDWARE_COMPATIBILITY.md`, `EDGE_HARDWARE_DISCOVERY.md`, `EDGE_HARDWARE_PROFILES.md`, `EDGE_INSTALLATION_PROFILES.md`, `EDGE_PROVISIONING.md`, `EDGE_RECOVERY.md`, `EDGE_OS_SPECIFICATION.md`, `EDGE_OTA.md`
**Related ADR:** ADR-010 — Edge Hardware and Provisioning
**Scope:** trust model, identity, boot trust, artifact trust, runtime protection, communications and security incident handling

---

## 1. Purpose

This document defines the normative security contract for Mostarda Edge.

The security architecture is mandatory for every Edge installation. The concrete physical or software mechanism used to satisfy a security property is selected by the applicable Hardware Profile, Installation Profile and referenced security contracts.

This document defines:

- the Edge threat model and trust boundaries;
- Device Identity, `EdgeInstallationId` and `DeviceKey`;
- key generation, protection, rotation and revocation;
- Secure Boot and boot trust states;
- the trust chain for OS, Runtime, Player, OTA and Recovery artifacts;
- manifest, profile and artifact verification;
- anti-downgrade and replay protection;
- Runtime privileges and Player isolation;
- Local Content Store protection;
- secret storage and secure communication;
- device authentication, authorization and certificate lifecycle;
- offline security, tamper detection and audit protection;
- behavior for unknown, unsupported, experimental, production and blocked hardware;
- incident states, compromise response, quarantine and Recovery handoff;
- normative `SEC-*` requirements.

Security never grants business authority to Edge. Campaign, Pricing, Financial, Evidence and Settlement rules remain outside this contract.

---

## 2. Architectural Security Chain

The mandatory trust chain is:

```text
Trust Model
    |
    v
Device Identity
    |
    v
Device Key
    |
    v
Secure Boot / Boot Trust
    |
    v
Artifact Signing
    |
    v
Manifest Verification
    |
    v
Hardware Profile Trust
    |
    v
Installation Profile Trust
    |
    v
OTA Trust
    |
    v
Recovery Trust
    |
    v
Runtime Security
    |
    v
Player Isolation
    |
    v
Local Content Store Protection
    |
    v
Telemetry / Audit Security
```

Each layer shall verify the layer it consumes before enabling the next layer. A valid lower-level signature does not authorize an artifact whose profile, manifest, lifecycle or policy is invalid.

---

## 3. Threat Model

### 3.1 Protected assets

The following are protected assets:

```text
EdgeInstallationId
DeviceKey private material
trust anchors
certificate private material
OS and boot artifacts
Runtime and Player artifacts
Recovery and rollback artifacts
Hardware and Installation Profiles
Update Manifests
Local Content Store integrity and authorization metadata
configuration and provisioning state
telemetry and audit records
network credentials and API credentials
identity migration and reset authorization
```

### 3.2 Threat actors

The security contract shall account for:

```text
untrusted network peer
malicious or compromised backend client
tampered installer or external media
malicious content or Player input
compromised Runtime module
local user with physical access
stolen or cloned device
modified firmware, bootloader or OS
replayed command, manifest, certificate or telemetry
insider with unauthorized signing or administrative access
```

The contract does not assume that physical possession is benign or that a commercial device label is authentic.

### 3.3 Security goals

The Edge shall preserve:

- authenticity of device and artifact identity;
- integrity of boot, OS, Runtime, Player, profiles and manifests;
- confidentiality of secrets and protected configuration;
- authorization boundaries between modules;
- continuity and non-repudiation of security-relevant audit records;
- deterministic rejection of unknown or revoked trust material;
- safe operation and Recovery after interruption or compromise.

Availability may be degraded to protect integrity and identity. Security shall not silently continue as healthy when a mandatory trust condition is unknown or violated.

### 3.4 Out of scope

This specification does not define:

- physical anti-tamper hardware not present in the Hardware Profile;
- a universal chip, bootloader, Secure Boot technology or cryptographic library;
- a business decision about responsibility or compensation;
- the contents of advertisements or campaign policy;
- a new Bounded Context.

---

## 4. Trust Boundaries

The Edge shall model these trust zones:

```text
Zone A — Root / Hardware Trust
Zone B — Boot and Recovery
Zone C — Edge OS
Zone D — Privileged Edge Runtime
Zone E — Player and Web Engine
Zone F — Local Content Store
Zone G — Telemetry and Audit Queue
Zone H — Cloud Control Plane
Zone I — External peripherals and user-provided media
```

### 4.1 Zone A — Root / Hardware Trust

This zone contains hardware-backed roots, verified boot capabilities, protected key storage and device identity capabilities when the Hardware Profile declares them.

The security contract shall expose the actual capability state. It shall not claim hardware-backed protection when the profile has only software-backed protection.

### 4.2 Zone B — Boot and Recovery

Boot and Recovery may activate only signed and compatible artifacts. Recovery is a separate trust boundary because it must remain capable of restoring a safe state when the normal OS or Runtime is unavailable.

### 4.3 Zone C — Edge OS

The OS enforces process, filesystem, network, identity and privilege boundaries. System artifacts are protected from Player, content and ordinary Runtime operations.

### 4.4 Zone D — Edge Runtime

Runtime receives only the privileges declared by its contract. It may coordinate modules and communicate with Cloud through authorized interfaces, but it shall not expose private keys or trust anchors to untrusted modules.

### 4.5 Zone E — Player and Web Engine

Player renders authorized content. It is untrusted with respect to identity, signing keys, system partitions, Runtime control and security policy. Player input and content are treated as hostile data.

### 4.6 Zone F — Local Content Store

Content is data, not executable trust material. The store shall be separated from boot, system, identity, staging and Recovery roles. Content may be authenticated and integrity-checked without receiving permission to execute privileged code.

### 4.7 Zone G — Telemetry and Audit Queue

Telemetry is a constrained output boundary. It may contain signed or hashed observations and opaque references, but never private keys, passwords, tokens or raw secret material.

### 4.8 Zone H — Cloud Control Plane

Cloud authenticates the device and authorizes operations through versioned contracts. Network reachability does not itself grant authority to install, update, reset identity or access secrets.

### 4.9 Zone I — External peripherals and media

Webcams, Wi-Fi adapters, USB devices, SD cards and user-provided media are untrusted inputs unless the Hardware Profile and security policy explicitly validate them.

---

## 5. Trust Decisions and Closed-By-Default Rules

Security decisions are closed by default:

```text
no identity proof       -> reject or quarantine
no valid signature      -> reject
no applicable profile   -> reject
unknown key state       -> reject or safe wait
revoked trust material  -> reject
unknown schema          -> reject or safe wait
missing authorization   -> reject
ambiguous state         -> Recovery or quarantine
```

No component may infer trust from:

```text
commercial model name
MAC address alone
matching version text
network location
successful boot alone
valid artifact signature alone
previously observed but unsealed data
human declaration alone
```

A security implementation may strengthen a check, but it may not replace an explicit failed or unknown result with success.

---

## 6. Device Identity

### 6.1 `EdgeInstallationId`

`EdgeInstallationId` is the stable logical identity of an Edge installation in the Mostarda platform.

It is not:

```text
MAC address
commercial serial number
Android identifier
IP address
filesystem path
```

It shall be created, preserved or migrated only through the authorized identity contract.

### 6.2 `DeviceKey`

`DeviceKey` is the cryptographic device identity used to authenticate the Edge and prove possession of its private key.

The identity record shall reference:

```text
edge_installation_id
device_key_id
public_key
key_algorithm_reference
key_storage_capability
certificate_or_attestation_reference
key_state
created_at
last_rotation_at
revocation_reference
```

The private key shall never be serialized into logs, telemetry, manifests, Player state, ordinary Runtime memory exports or diagnostic packages.

### 6.3 Identity binding

The device identity shall be bound to:

```text
Hardware Profile reference
Installation Profile reference
provisioning result
identity creation evidence
```

Changing hardware identity, Installation Profile identity or `EdgeInstallationId` requires an explicit migration or reset operation. OTA and ordinary Recovery preserve identity.

### 6.4 Identity states

The DeviceKey identity lifecycle shall use explicit states:

```text
PENDING
ACTIVE
ROTATION_PENDING
ROTATED
EXPIRED
REVOKED
COMPROMISED
DESTROYED
```

`REVOKED`, `COMPROMISED` and `DESTROYED` keys shall not authenticate new production operations. Historical signatures remain evidence and are not rewritten.

### 6.5 Identity authority map

`EdgeInstallationId` and `DeviceKey` are distinct identities with distinct owners:

| Artifact | Authority | Other components |
| --- | --- | --- |
| `EdgeInstallationId` logical installation identity | TV Network / `EdgeInstallation` | Installer and Provisioning request creation or preservation; Runtime, OTA and Recovery consume it |
| `DeviceKey` cryptographic key material and lifecycle | Security | Provisioning requests authorized creation; Runtime requests use; OTA/Recovery preserve or invoke explicit rotation/reset |
| identity binding to Hardware/Installation Profile | Provisioning result under the accepted profiles | Security validates; Runtime reports; no component infers a new binding |

Installer, Provisioning, Runtime, OTA and Recovery shall never create competing identity models. A retry reuses the same identity and operation references. Migration, rotation, revocation and reset are explicit Security-authorized operations; ordinary installation retry, OTA and Recovery preserve the existing identity.

---

## 7. Key Generation and Storage

### 7.1 Generation

Device keys shall be generated through the authorized identity contract. The private key shall be generated on the device or inside an approved protected key service whenever the Hardware Profile supports that capability.

If key generation occurs outside the device, the transfer and import process shall be explicitly authorized, authenticated, journaled and validated. Plain private-key transport is prohibited.

### 7.2 Hardware-backed capability

The Hardware Profile shall declare the DeviceKey storage capability as an observed and validated fact:

```text
HARDWARE_BACKED
SOFTWARE_PROTECTED
EXTERNAL_PROTECTED
NOT_SUPPORTED
UNKNOWN
```

The security architecture remains mandatory for every state. A Production Installation Profile shall define the security policy applicable to the actual capability; it shall not advertise hardware-backed protection when the hardware does not provide it.

### 7.3 Software-backed fallback

Software-backed storage may be used only when explicitly authorized by the Hardware Profile, Installation Profile and security policy. It shall use the declared protected storage, access controls, encryption and recovery behavior.

The absence of hardware-backed storage shall be visible in the security posture and may restrict lifecycle promotion or operations according to the profile policy.

### 7.4 Secret storage

Secrets shall be stored only in declared protected targets. The following are prohibited:

```text
Player local storage
browser cache
Local Content Store
plain configuration files
logs or telemetry
external media without protection
command-line arguments
```

---

## 8. Key Rotation and Revocation

### 8.1 Rotation

Key rotation is an explicit, signed, idempotent operation. It shall preserve the link between the old identity and the new identity without exposing either private key.

The rotation plan shall contain:

```text
rotation_id
device_key_id_current
device_key_id_next
new_public_key
activation_point
overlap_or_transition_policy
authorization_reference
rollback_or_recovery_reference
```

The device shall validate the new key before retiring the current authentication path. It shall never discard its only valid trust path prematurely.

### 8.2 Certificate rotation

Certificates or attestation chains shall be rotated independently from the logical `EdgeInstallationId`. A certificate change does not create a new device identity.

The certificate policy shall define:

```text
issuer_trust_anchor
validity_period
renewal_window
rotation_trigger
revocation_check
offline_grace_policy
```

### 8.3 Revocation

Revocation may apply to:

```text
DeviceKey
certificate
Hardware Profile
Installation Profile
boot artifact
OS / Runtime / Player artifact
Update Manifest
Recovery artifact
trust anchor
```

Revocation shall be explicit, versioned and auditable. A revoked identity cannot be restored by replaying an older certificate or manifest.

### 8.4 Expiration

An expired key or certificate shall not silently become valid because the device is offline. The applicable security policy shall state whether a bounded historical verification period is allowed; otherwise the operation shall wait, reject or enter a safe incident state.

---

## 9. Secure Boot and Boot Trust

### 9.1 Hardware-dependent security state

Secure Boot and equivalent boot integrity shall be represented using explicit capability states:

```text
REQUIRED
SUPPORTED
NOT_SUPPORTED
UNKNOWN
```

These states describe the relationship between the security policy and the capability exposed by the bound Hardware Profile. They are not claims that every device has the same physical mechanism.

### 9.2 Required behavior

- `REQUIRED`: the Production path requires verified boot or an explicitly validated equivalent. Missing proof blocks activation.
- `SUPPORTED`: the Hardware Profile proves the mechanism and the Installation/OS contracts declare how it is used.
- `NOT_SUPPORTED`: the profile must declare the validated compensating integrity mechanism and the permitted lifecycle. The device shall not be treated as hardware-verified by inference.
- `UNKNOWN`: trust cannot be established; Production installation, automatic OTA and normal activation are blocked until resolved.

### 9.3 Chain of trust

The boot chain shall be explicit:

```text
root trust / hardware capability
        ↓
bootloader
        ↓
kernel / device tree
        ↓
root filesystem / Edge OS
        ↓
Edge Runtime
        ↓
Player / Web Engine
```

Each transition shall verify the identity, digest, signature and compatibility of the next artifact. A successful boot message alone is not proof that the declared chain was used.

### 9.4 Boot failure

If boot integrity, profile binding or identity verification fails, the device shall enter the applicable Recovery or security incident state. It shall not continue as healthy or silently select a different image.

---

## 10. Artifact Signing and Verification

### 10.1 Signed artifact classes

The following artifacts shall be signed according to their owning contract:

```text
Edge OS
bootloader / boot configuration
kernel / device tree
Edge Runtime
Player
Web Engine, when distributed as an artifact
Update Manifest
Recovery Plan and Recovery artifacts
Hardware Profile
Installation Profile
configuration migrations
security policy
```

### 10.2 Artifact trust record

Every artifact trust decision shall retain:

```text
artifact_id
artifact_version
artifact_type
digest
signature
signing_key_id
signature_algorithm_reference
producer_context
compatibility_scope
profile_references
revocation_reference
verification_time
verification_result
```

### 10.3 Verification order

The verifier shall perform the following checks before activation or execution:

```text
resolve exact artifact
        ↓
validate canonical representation
        ↓
validate digest
        ↓
validate signature chain
        ↓
validate key lifecycle and revocation
        ↓
validate Hardware Profile binding
        ↓
validate Installation Profile binding
        ↓
validate manifest and policy
        ↓
authorize operation
```

Any failed mandatory check blocks the operation. A valid signature does not override an incompatible profile, revoked key, expired policy or anti-downgrade decision.

### 10.4 Unknown artifacts

An unknown artifact type, schema or signing key shall be rejected or placed in a safe wait state according to the applicable contract. It shall never be executed as a generic binary.

---

## 11. Profile and Manifest Trust

### 11.1 Hardware Profile trust

The Edge shall trust a Hardware Profile only when:

- its canonical serialization and digest are valid;
- its signature and signing-key lifecycle are valid;
- its lifecycle is effective for the operation;
- its Discovery reference is sealed and reproducible;
- its known incompatibilities do not block the target;
- its identity matches the discovered device.

The Edge shall not derive a Hardware Profile from a commercial name, a human declaration or a partial Discovery record.

### 11.2 Installation Profile trust

The Edge shall trust an Installation Profile only when:

- its signature, digest and revision are valid;
- the exact Hardware Profile binding is valid;
- the Compatibility Evaluation Result is present and accepted;
- the profile lifecycle and effective scope authorize the operation;
- adapter, boot, storage, Recovery and artifact references are valid;
- data and identity policies are explicit.

An Installation Profile cannot broaden the Hardware Profile trust boundary.

### 11.3 Update Manifest trust

OTA shall trust an Update Manifest only after exact target resolution and validation of:

```text
device identity
Hardware Profile
Installation Profile
Edge OS / Runtime / Player contracts
boot and Recovery contracts
security policy
artifact set
anti-downgrade policy
key and revocation state
```

The manifest is authoritative for its artifact set but cannot override this security contract.

### 11.4 Recovery trust

Recovery shall use signed and profile-bound Recovery Plans and artifacts. Recovery shall not bypass signature, identity, profile, revocation or anti-downgrade controls merely because the normal OS is unavailable.

---

## 12. OTA Security

OTA security shall follow `EDGE_OTA.md` and add no alternate update path.

### 12.1 Update authorization

An update shall be authorized only when:

```text
DeviceKey authentication succeeds
target Hardware Profile is trusted
Installation Profile is trusted
Update Manifest is trusted
all artifacts are verified
anti-downgrade policy permits the transition
Recovery/rollback path is available
```

`UNKNOWN`, `UNSUPPORTED` and `BLOCKED` hardware or profiles shall not receive automatic OTA. `EXPERIMENTAL` targets require explicit controlled authorization. `PRODUCTION` targets still require every update gate.

### 12.2 Identity continuity

OTA shall preserve `EdgeInstallationId` and `DeviceKey`. Identity migration or reset is a distinct authorized operation and shall never be hidden inside an update package.

### 12.3 Local Content Store

System, Runtime, Player and content updates have separate security and integrity policies. An OTA package shall not erase, execute or rewrite Local Content Store data unless the manifest declares an explicit, signed and compatible content migration.

### 12.4 Anti-downgrade

Anti-downgrade is independent of signature verification. A signed older artifact is not automatically authorized. Rollback is allowed only when the OTA/Recovery policy and Last Known Good record explicitly authorize it.

---

## 13. Recovery Security

### 13.1 Recovery entry

Recovery may be entered after:

```text
boot trust failure
identity inconsistency
artifact verification failure
OTA rollback failure
journal corruption
tamper detection
repeated health failure
key compromise
```

The handoff shall preserve `EdgeInstallationId`, `DeviceKey` reference, Hardware Profile, Installation Profile, failed operation and journal references whenever they remain trustworthy.

### 13.2 Recovery decisions

Recovery shall use the declared Recovery Plan. It shall not:

- generate a new production identity without authorization;
- use a generic image;
- bypass revocation or anti-downgrade;
- copy private keys into logs or untrusted storage;
- classify a boot without identity validation as recovered.

### 13.3 Compromised identity

When the DeviceKey is compromised or cannot be trusted, normal authentication shall be disabled and Recovery shall require an explicit identity recovery, rotation or reset operation. The old identity remains a historical record and is not silently reused.

---

## 14. Runtime Security

### 14.1 Least privilege

Every Runtime service and module shall have a declared privilege set:

```text
service_id
service_version
filesystem_scopes[]
network_scopes[]
device_scopes[]
identity_access
secret_access
configuration_scopes[]
capability_requirements[]
```

A service receives no privilege that is not declared and authorized. Unknown modules or privilege requests are rejected by default.

### 14.2 Identity and key access

Only the authorized identity service or security boundary may perform DeviceKey operations. Runtime modules may receive scoped attestations or signatures, not private key material.

### 14.3 Process and service integrity

The OS shall verify Runtime artifacts and configuration before service activation. A service that is modified, unsigned, revoked or incompatible shall not start as healthy.

### 14.4 Resource isolation

Security-relevant services shall have bounded CPU, memory, storage and restart behavior as declared by the Edge OS and Hardware Profile. Resource exhaustion shall not grant additional privileges or disable audit controls.

### 14.5 Inter-module communication

Runtime modules shall communicate through authenticated, versioned interfaces. They shall not use shared secret files, unprotected local sockets or undocumented filesystem conventions to bypass authorization.

---

## 15. Player and Web Engine Isolation

### 15.1 Player trust level

Player and Web Engine code are untrusted relative to the OS, identity and Runtime control plane, even when their artifacts are signed.

### 15.2 Mandatory isolation

Player shall not have direct access to:

```text
DeviceKey private material
trust anchors
identity reset operations
OS/system partitions
boot or Recovery controls
OTA activation controls
raw network credentials
Runtime administrative interfaces
audit log mutation
```

Player may access only the content, display, telemetry and control interfaces explicitly granted by its contract.

### 15.3 Content and web isolation

Untrusted media, QR payloads, tags, scripts and web content shall be treated as hostile input. The Web Engine sandbox, origin policy, resource limits and network permissions shall be declared by the Player/OS contracts and enforced by the runtime boundary.

### 15.4 Player failure

A Player crash, content error or Web Engine failure shall not disable identity, trust verification, OTA, Recovery or audit protection. The Edge may restart or quarantine Player according to its health policy while preserving the rest of the security boundary.

---

## 16. Local Content Store Protection

### 16.1 Separation

Local Content Store data shall remain separate from:

```text
boot artifacts
system artifacts
Runtime binaries
identity and keys
update staging
Recovery artifacts
security policy
```

### 16.2 Integrity and authorization

Content records shall carry the authorization and integrity metadata required by the content contract. The store shall detect truncated, substituted, tampered or unknown content and report it without granting execution privilege.

### 16.3 Confidentiality

When the Hardware Profile and content policy require at-rest confidentiality, the store shall use the declared protected storage mechanism. The security contract shall expose whether confidentiality is hardware-backed, software-protected, unavailable or unknown.

### 16.4 Update and recovery behavior

System updates and Recovery preserve content by default. Migration or erasure requires an explicit signed policy and authorization. A failed content validation shall not be converted into a successful system update.

### 16.5 Content telemetry

Content errors may be reported through redacted references and digests. Raw secret, personal or protected content data shall not be emitted to logs or telemetry.

---

## 17. Secret and Configuration Protection

Secrets include:

```text
private keys
certificate private material
backend credentials
network credentials
provisioning tokens
refresh tokens
signing authorization
identity reset authorization
encryption keys
```

Secrets shall:

- be stored only in the declared secure target;
- be scoped to the smallest authorized consumer;
- never be placed in Local Content Store or Player storage;
- never appear in logs, telemetry, screenshots, diagnostics or UpdateResult;
- be rotated or revoked according to their lifecycle;
- be invalidated after compromise or unauthorized extraction.

Configuration files may contain opaque references to secrets, never raw secret material.

---

## 18. Cloud Communication and Device Authentication

### 18.1 Secure transport

Device-to-Cloud communication shall provide confidentiality, integrity and peer authentication through the secure transport contract. HTTPS/TLS or an explicitly validated equivalent may implement that contract; the concrete library and protocol profile remain implementation-specific.

Plain HTTP is not an authenticated production transport and shall not carry device credentials, commands, manifests, identity operations or protected telemetry.

### 18.2 Device authentication

The device shall authenticate using `DeviceKey` proof of possession through a challenge-response or certificate-bound protocol declared by the communication contract.

The following are insufficient alone:

```text
IP address
MAC address
device name
commercial serial
shared public token
```

### 18.3 Server authentication

The device shall validate the Cloud trust anchor and certificate policy before accepting commands, manifests, key rotation or identity operations. Certificate validation failure shall stop the protected operation and produce an explicit security result.

### 18.4 Authorization

Authentication proves identity; authorization determines permitted actions. Every command shall carry an explicit scope and authorization reference. Device identity alone does not authorize:

```text
identity reset
profile publication
OTA activation
Recovery erase
key export
content policy override
```

### 18.5 Session and token handling

Sessions and tokens shall be scoped, time-bounded, replay-protected and revocable. Tokens shall not be persisted in Player or content storage. Expired or revoked sessions shall fail closed.

---

## 19. Certificate and Trust Anchor Lifecycle

### 19.1 Trust anchor states

Trust anchors and certificates shall have explicit states:

```text
ACTIVE
ROTATED
REVOKED
EXPIRED
UNKNOWN
```

`ROTATED` material may remain valid for historical verification during the declared period but shall not authorize new operations outside its policy. `REVOKED`, `EXPIRED` and `UNKNOWN` material shall not authorize new production operations.

### 19.2 Rotation

Trust-anchor rotation shall be atomic within the applicable scope, signed by an existing trusted authority and validated before activation. The device shall retain a validated Recovery path if rotation fails.

### 19.3 Offline rotation

Offline certificate or trust-anchor rotation is permitted only when the complete signed rotation package, authorization, validation data, rollback path and revocation policy are locally available. Otherwise the device shall wait or reject safely.

### 19.4 Revocation distribution

Revocation data shall be versioned, integrity-protected and associated with the decision that consumed it. Lack of network access shall not silently convert an unavailable revocation check into an allow decision.

---

## 20. Offline Security

Offline operation may continue only with the last authorized and locally verifiable state.

### 20.1 Permitted offline behavior

When the Hardware Profile, Installation Profile, OS and Runtime contracts permit it, the Edge may:

```text
play already authorized local content
preserve identity and configuration
queue signed telemetry
run local health checks
continue a previously authorized idempotent operation
verify locally available artifacts and manifests
```

### 20.2 Prohibited offline behavior

Offline mode shall not:

- invent a new trust decision;
- accept an unsigned or unknown artifact;
- bypass revocation or anti-downgrade rules;
- reset or migrate identity implicitly;
- accept a new privileged command without locally verifiable authorization;
- report unavailable security validation as successful;
- expose queued secrets or raw protected telemetry.

### 20.3 Offline expiration

The applicable security policy shall define the validity window for offline credentials, certificates, manifests and queued operations. Once a required validity window expires, the operation shall pause, reject or enter the declared security incident state.

### 20.4 Reconnection

After reconnection, the Edge shall authenticate Cloud, validate certificate and revocation state, reconcile queued telemetry by idempotent identity and apply only commands whose authorization remains effective. Reconnection shall not retroactively authorize a previously rejected operation without a new decision.

---

## 21. Replay and Freshness Protection

Security-sensitive requests, manifests, rotations, reset operations, telemetry acknowledgements and Recovery commands shall be protected against replay.

Each applicable operation shall carry:

```text
operation_id
device_identity_reference
causation_reference
issued_at
expiration_or_validity_window
nonce_or_challenge_reference
monotonic_sequence_or_epoch, when supported
payload_digest
signature_or_authenticated_channel_reference
```

The receiver shall reject:

```text
duplicate non-idempotent operation
expired authorization
unknown nonce or challenge
stale epoch
sequence regression
payload digest mismatch
replayed certificate or reset authorization
```

An operation explicitly defined as idempotent may return its prior result for the same identity. It shall not execute a second side effect.

---

## 22. Tamper Detection

Tamper detection shall cover, where the Hardware Profile exposes the capability:

```text
boot chain
boot configuration
OS and Runtime artifacts
Player artifact
Hardware Profile and Installation Profile
identity storage
trust anchors and certificates
security policy
Local Content Store integrity metadata
OTA journal
Recovery journal
clock or freshness state
```

### 22.1 Tamper result

Tamper detection shall produce a structured result containing:

```text
tamper_event_id
device_identity_reference
affected_asset
expected_digest_or_state
observed_digest_or_state
source
confidence
timestamp
recommended_action
```

The result shall never contain the affected secret itself.

### 22.2 Response

Depending on the asset and policy, tamper shall cause:

```text
operation rejection
service quarantine
Player stop or restart
OTA block
Recovery handoff
device revocation
manual intervention
```

The Edge shall not clear a tamper result merely by restarting a process. Clearing requires the applicable security or Recovery contract.

---

## 23. Hardware and Profile Security States

Security decisions shall use the lifecycle and compatibility states already defined by the Edge contracts:

```text
UNKNOWN
UNSUPPORTED
BLOCKED
EXPERIMENTAL
PRODUCTION
```

### 23.1 UNKNOWN

Hardware or security capability is not sufficiently identified or trusted. Production installation, automatic OTA and privileged activation are blocked. Discovery or controlled diagnostics may continue.

### 23.2 UNSUPPORTED

The device does not satisfy the applicable Hardware Profile or security contract. It shall not receive an alternative profile by inference.

### 23.3 BLOCKED

An explicit security, integrity, compatibility or governance decision prohibits operation. A valid signature cannot override this state.

### 23.4 EXPERIMENTAL

The hardware or profile may run only under explicit controlled authorization. Experimental results shall be marked and shall not silently produce Production trust or commercial effects.

### 23.5 PRODUCTION

Production means that the exact Hardware Profile, Installation Profile and security contract passed the required gates. It does not eliminate runtime revalidation, revocation or incident handling.

---

## 24. Security Incident State Machine

Security shall use one normative incident state machine:

```text
SECURE
   |
   v
DEGRADED
   |
   v
SUSPICIOUS
   |
   v
QUARANTINED
   |
   +--> RECOVERY_REQUIRED
   |          |
   |          v
   |       RESTORING
   |          |
   |          v
   |       RESTORED
   |
   +--> COMPROMISED
              |
              v
           REVOKED
```

`BLOCKED` may be entered from any state when operation is prohibited by an explicit security decision. `SHUTDOWN` may be used as an operational result when the applicable Hardware Profile supports it, but it is not a substitute for recording the security incident state.

### 24.1 State meanings

- `SECURE`: mandatory trust checks pass for the current operation and scope.
- `DEGRADED`: an optional security capability is unavailable, but the profile explicitly permits limited operation.
- `SUSPICIOUS`: an anomaly requires investigation; privileged operations are restricted.
- `QUARANTINED`: affected modules or operations are isolated; only declared diagnostic, Recovery or revocation actions remain.
- `RECOVERY_REQUIRED`: normal operation cannot safely continue and Recovery must resolve the incident.
- `RESTORING`: an authorized Recovery or remediation plan is executing.
- `RESTORED`: remediation completed, but revalidation is required before returning to `SECURE`.
- `COMPROMISED`: evidence indicates loss of trust or unauthorized access.
- `REVOKED`: device, key, certificate or profile has been explicitly revoked from new trusted operation.
- `BLOCKED`: an explicit decision prohibits the operation.

### 24.2 Transition rules

- A state change shall be journaled before acknowledgement.
- `SUSPICIOUS` shall not be silently normalized to `SECURE`.
- `QUARANTINED` and `COMPROMISED` shall not activate new artifacts.
- `RESTORED` returns to `SECURE` only after identity, boot, profile, artifact, configuration and communication checks pass.
- `REVOKED` and `BLOCKED` require a new authorized decision; they do not self-clear.
- An incident result remains immutable even after remediation.

---

## 25. Compromise Response

### 25.1 Detection

Compromise may be indicated by:

```text
private-key exposure or failed proof of possession
boot or artifact tamper
profile or manifest substitution
unexpected privilege escalation
certificate or trust-anchor misuse
replayed privileged operation
identity mismatch
unauthorized content or Runtime execution
security journal corruption
```

### 25.2 Immediate containment

The Edge shall, according to the applicable policy:

1. stop the affected privileged operation;
2. isolate the affected module or device;
3. preserve the immutable incident record;
4. prevent new OTA, identity and Recovery actions until trusted;
5. notify Cloud when authenticated communication remains possible;
6. enter Quarantine, Recovery or Revoked state;
7. protect remaining secrets and keys from further use.

### 25.3 Revocation

Cloud may revoke a DeviceKey, certificate, device identity, Hardware Profile, Installation Profile or artifact. The Edge shall apply revocation only from an authenticated and integrity-verified security channel or from an authorized offline package.

Revocation shall be idempotent and shall preserve historical evidence. It shall not delete incident history or fabricate a new identity.

### 25.4 Recovery after compromise

Recovery after compromise requires:

```text
trusted Recovery Plan
verified artifacts
identity decision
key rotation or reset authorization
profile revalidation
boot and Runtime health
communication re-authentication
incident closure evidence
```

The device shall not return to Production solely because it boots or reconnects.

---

## 26. Logs, Evidence and Audit Security

### 26.1 Security event record

Security-relevant events shall contain, where applicable:

```text
security_event_id
device_identity_reference
Hardware Profile reference
Installation Profile reference
incident_state
event_code
operation_id
timestamp
source
result
evidence_reference
record_hash
```

### 26.2 Redaction

Logs, telemetry, diagnostics and audit records shall not contain:

```text
private keys
passwords
raw bearer tokens
certificate private material
encryption keys
network secrets
identity reset secrets
unredacted protected content
```

Opaque references, fingerprints, digests and verification outcomes may be recorded when authorized.

### 26.3 Immutability and queueing

Security records shall be append-only and integrity-protected. When Cloud is unavailable, records may be queued locally according to the Hardware Profile, but queued records shall retain ordering, identity, hashes and replay protection.

Tampered or unverifiable records shall be reported as invalid; they shall not be silently repaired or replaced.

### 26.4 Evidence boundary

Security telemetry records security facts. It does not create Playback Evidence or financial responsibility decisions. Playback remains the source of execution facts and Evidence Ledger remains the materializer of Evidence.

---

## 27. Security Configuration and Policy Versioning

Security policies, trust-anchor sets, privilege manifests, certificate policies and incident policies shall be versioned, signed and immutable.

Each security decision shall record:

```text
security_policy_id
security_policy_version
trust_anchor_set_reference
profile_references
artifact_references
decision_time
decision_result
```

A policy update is a new immutable revision. Configuration Service may distribute the revision but cannot author, weaken or reinterpret security policy.

The absence of a declared policy or compatibility entry is not permission to use a default. The operation shall reject or enter a safe wait state.

---

## 28. Security Result

Every security-sensitive operation shall produce an immutable `SecurityResult` containing at least:

```text
security_operation_id
device_identity_reference
device_key_reference
Hardware Profile reference
Installation Profile reference
security_policy_reference
trust_chain_result
identity_result
artifact_verification_result
authorization_result
revocation_result
anti_replay_result
tamper_result
incident_state
final_state
evidence_references[]
result_hash
```

The result shall distinguish:

```text
ALLOWED
REJECTED
QUARANTINED
RECOVERY_REQUIRED
REVOKED
BLOCKED
NOT_EVALUATED
```

`NOT_EVALUATED` is not a security approval. It means that a required input or trust service was unavailable; the protected operation is rejected or paused according to policy.

---

## 29. Security Error Catalog

The following error identities are normative:

```text
SEC_IDENTITY_MISSING
SEC_IDENTITY_MISMATCH
SEC_DEVICE_KEY_INVALID
SEC_DEVICE_KEY_REVOKED
SEC_DEVICE_KEY_COMPROMISED
SEC_DEVICE_KEY_EXPIRED
SEC_DEVICE_KEY_STORAGE_UNAVAILABLE
SEC_CERTIFICATE_INVALID
SEC_CERTIFICATE_REVOKED
SEC_CERTIFICATE_EXPIRED
SEC_TRUST_ANCHOR_UNKNOWN
SEC_TRUST_ANCHOR_REVOKED
SEC_SECURE_BOOT_REQUIRED
SEC_SECURE_BOOT_UNKNOWN
SEC_BOOT_CHAIN_INVALID
SEC_ARTIFACT_SIGNATURE_INVALID
SEC_ARTIFACT_DIGEST_MISMATCH
SEC_ARTIFACT_REVOKED
SEC_MANIFEST_INVALID
SEC_PROFILE_SIGNATURE_INVALID
SEC_PROFILE_REVOKED
SEC_PROFILE_MISMATCH
SEC_INSTALLATION_PROFILE_UNTRUSTED
SEC_RECOVERY_PLAN_UNTRUSTED
SEC_OTA_NOT_AUTHORIZED
SEC_ANTI_DOWNGRADE_REJECTED
SEC_PRIVILEGE_DENIED
SEC_PLAYER_ISOLATION_FAILED
SEC_SECRET_ACCESS_DENIED
SEC_CONTENT_INTEGRITY_FAILED
SEC_REPLAY_DETECTED
SEC_NONCE_INVALID
SEC_OPERATION_EXPIRED
SEC_CLOCK_UNTRUSTED
SEC_REVOCATION_UNAVAILABLE
SEC_POLICY_UNAVAILABLE
SEC_TAMPER_DETECTED
SEC_JOURNAL_INTEGRITY_FAILED
SEC_OFFLINE_AUTHORIZATION_EXPIRED
SEC_COMPROMISE_DETECTED
SEC_QUARANTINED
SEC_RECOVERY_REQUIRED
SEC_NOT_EVALUATED
```

Each error shall declare its phase, retryability, recoverability, required state transition, consumer-facing explanation and evidence references.

---

## 30. Normative Requirements

### SEC-001

Every Edge operation shall follow the trust chain defined by this specification.

### SEC-002

`EdgeInstallationId` shall be stable and shall not be replaced implicitly.

### SEC-003

`DeviceKey` private material shall never leave its declared protected boundary or appear in logs, telemetry, Player state or diagnostics.

### SEC-004

Device identity shall be created, rotated, revoked or reset only through an explicit authorized operation.

### SEC-005

Secure Boot capability shall be represented as `REQUIRED`, `SUPPORTED`, `NOT_SUPPORTED` or `UNKNOWN` according to the Hardware Profile.

### SEC-006

`UNKNOWN` Secure Boot state shall not be treated as verified Production boot trust.

### SEC-007

Boot, OS, Runtime, Player, OTA, Recovery, Hardware Profile and Installation Profile artifacts shall be verified before activation or execution.

### SEC-008

A valid artifact signature shall not override profile mismatch, revocation, expiration, authorization or anti-downgrade rejection.

### SEC-009

Hardware and Installation Profile trust shall be based on exact signed references, not commercial names or partial Discovery facts.

### SEC-010

OTA shall preserve identity and use the exact manifest and compatibility context defined by `EDGE_OTA.md`.

### SEC-011

Recovery shall use a trusted Recovery Plan and shall not bypass identity, signature, revocation or anti-downgrade controls.

### SEC-012

Edge Runtime privileges shall be explicitly declared and least-privilege by default.

### SEC-013

Player and Web Engine shall be isolated from private keys, trust anchors, identity controls, system artifacts, OTA controls and privileged Runtime interfaces.

### SEC-014

Local Content Store shall be separated from executable, boot, identity, staging and Recovery artifacts.

### SEC-015

Secret material shall be stored only in a declared protected target and shall never be emitted to logs, telemetry or audit records.

### SEC-016

Device-to-Cloud communication shall provide authenticated confidentiality and integrity; plain HTTP shall not carry protected production operations.

### SEC-017

Certificate and trust-anchor rotation shall be explicit, authenticated, versioned and recoverable.

### SEC-018

Offline operation shall not invent trust, bypass revocation, accept unsigned artifacts or authorize identity changes.

### SEC-019

Security-sensitive operations shall include replay protection, freshness and idempotent identity.

### SEC-020

Tamper detection shall produce immutable evidence and trigger the applicable rejection, quarantine, revocation or Recovery path.

### SEC-021

`UNKNOWN`, `UNSUPPORTED` and `BLOCKED` targets shall not receive automatic privileged operations or OTA.

### SEC-022

`EXPERIMENTAL` targets require explicit controlled authorization and shall not silently acquire Production trust.

### SEC-023

Security incident states shall be explicit and shall not be inferred from process health alone.

### SEC-024

Compromised or revoked identities shall not be silently reused or replaced by a newly generated identity.

### SEC-025

Every security-sensitive operation shall produce an immutable `SecurityResult` with trust, identity, authorization and incident outcomes.

### SEC-026

Security logs and evidence shall preserve auditability without exposing secret material.

### SEC-027

Security policy revisions, trust-anchor sets, privilege manifests and certificate policies shall be immutable and versioned.

### SEC-028

No security mechanism may claim physical support that is absent or unknown in the bound Hardware Profile.

---

## 31. Completion Criteria

The Security contract is implementable for a target only when its Hardware Profile and Installation Profile declare:

```text
device identity capability
DeviceKey storage capability
boot trust state
artifact and manifest trust references
profile and policy references
OTA and Recovery bindings
Runtime privilege model
Player isolation model
Local Content Store protection
secure transport and certificate policy
offline security policy
replay and freshness policy
tamper response
incident and Recovery states
```

An absent or unknown mandatory security input blocks the affected operation. It does not authorize a weaker implicit default.

---

## 32. Relationship to Other Specifications

```text
EDGE_HARDWARE_PROFILES.md
        |
        v
EDGE_INSTALLATION_PROFILES.md
        |
        +--> EDGE_PROVISIONING.md
        +--> EDGE_RECOVERY.md
        +--> EDGE_OS_SPECIFICATION.md
        +--> EDGE_OTA.md
        |
        v
EDGE_SECURITY.md
```

Security constrains these contracts without changing their ownership:

- Hardware Profile declares observed hardware security capabilities;
- Installation Profile binds the authorized installation security requirements;
- Provisioning executes the declared identity and trust setup;
- Recovery restores only through a trusted Recovery Plan;
- Edge OS enforces runtime and isolation boundaries;
- OTA verifies update trust and anti-downgrade;
- Security records and evaluates security facts and decisions.

---

## 33. Next Review

The next architectural review shall validate the complete chain:

```text
Hardware Discovery
    -> Hardware Profile
    -> Installation Profile
    -> Installer
    -> Provisioning
    -> Recovery
    -> Edge OS
    -> OTA
    -> Security
```

No future security implementation may introduce a universal Secure Boot, key-storage, bootloader, certificate or cryptographic mechanism without evidence that the bound Hardware Profile supports it and the affected contract authorizes it.
