# MXQ Pro 4K 5G — Hardware Discovery Design

## Goal

Executar uma descoberta não invasiva do MXQ Pro 4K 5G original, preservando fatos, proveniência, confiança, lacunas e evidências sem instalar Armbian, alterar partições ou criar um Hardware Profile antes da validação.

## Scope

O primeiro slice é um adaptador de laboratório para Android original acessado por ADB. Ele produz uma entrada provisória com os dados já observados e um `HardwareDiscoveryRecord` somente quando a coleta, normalização e correlação forem concluídas. A avaliação de compatibilidade e a homologação permanecem fora deste slice.

## Data flow

```text
initial intake (human/system-reported)
        ↓
read-only Android/ADB collection
        ↓
FACT envelopes + evidence references
        ↓
normalization (preserve original value)
        ↓
correlation / missing requirements
        ↓
PARTIAL or COMPLETE
        ↓
SEALED HardwareDiscoveryRecord
```

The intake values for model, board, Android, kernel, build, Wi-Fi association and the displayed memory/storage values are retained as observations. The probable RK3228A/RK3229 SoC and ARM 32-bit architecture are retained as explicitly unverified observations, never as authoritative capabilities.

## Safety boundary

The collector can only execute read-only commands. It must reject any command outside the allow-list. It never installs APKs, writes boot/recovery/system/eMMC partitions, formats storage, changes boot mode, or selects Armbian. Private keys and secrets are excluded from records.

## Components

- `packages/edge-discovery/src/record.ts`: immutable fact and record types, lifecycle validation and deterministic hashing.
- `packages/edge-discovery/src/normalization.ts`: deterministic normalization for architecture, capacities, versions and structured command output.
- `packages/edge-discovery/src/android-adb-collector.ts`: dependency-injected ADB transport and read-only command allow-list.
- `packages/edge-discovery/src/intake.ts`: converts the supplied laboratory observations into low-trust facts with explicit missing evidence.
- `packages/edge-discovery/src/index.ts`: public package surface.
- `scripts/edge-discovery.ts`: CLI for a local ADB run; it emits JSON to stdout and never mutates the device.

## Record rules

Every fact preserves `value`, optional `normalized_value`, source/trust class, confidence, timestamps and evidence status. A record can be sealed with missing requirements for an experimental evaluation, but the missing requirements remain explicit and Compatibility must decide whether they are acceptable. Any mandatory identity conflict prevents production compatibility input.

The initial intake is `PARTIAL` and uses `DECLARED`/`SYSTEM_REPORTED` provenance with unverified evidence. A real ADB run adds `SYSTEM_REPORTED` observations and direct probes where available. No fact is promoted merely because the commercial name matches.

## Acceptance tests

1. Intake preserves the exact displayed values and flags 256 GB RAM / 1024 GB storage as unverified.
2. Probable SoC and architecture remain non-authoritative until ADB evidence corroborates them.
3. The ADB transport rejects writes and executes only the declared read-only commands.
4. Missing commands become typed missing observations, never fabricated capabilities.
5. Re-running the same input produces the same canonical record hash.
6. The record contains no CompatibilityResult or HardwareProfile classification.
7. Sealed records are immutable snapshots; retries create a new attempt/record.
