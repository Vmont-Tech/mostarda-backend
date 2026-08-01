# Consumer-Owned Contract Compatibility Design

**Status:** APPROVED BY FOUNDER — candidate for normative synchronization
**Date:** 2026-08-01
**Scope:** semantic version identity, consumer-owned compatibility evaluation, matrix lifecycle and auditable failure behavior

## 1. Purpose

This design separates four concepts that must never be collapsed:

1. identity of a published contract or producing component;
2. canonical representation chosen by the producer;
3. a consumer's ability to process that identity;
4. operational ability to perform the compatibility evaluation.

The producer is responsible for publishing valid canonical identities. Each consumer independently decides which published identities it can process. Failure to perform an evaluation is not a compatibility decision.

## 2. Constitutional principles

1. Compatibility states describe only a consumer's ability to process a published contract.
2. A compatibility evaluation never modifies, invalidates or reinterprets the producer's authoritative artifact.
3. Compatibility is closed by default. No support, fallback, inheritance, equivalence or ordering may be inferred.
4. The producer does not decide which consumers support its contracts.
5. Configuration Service distributes compatibility artifacts; it is never a compatibility authority.
6. Historical artifacts remain valid records even when a current consumer cannot process them.

## 3. Version categories

The platform recognizes distinct semantic roles rather than one universal `Version` concept.

| Category | Meaning | Authority |
| --- | --- | --- |
| `ContractSchemaVersion` | Identity of a published contract format | Producer of the contract |
| `CollectorVersion` | Provenance of the collector that produced an observation | Collector producer/Edge Runtime contract owner |
| `CapabilityVersion` | Identity of a capability contract | TV Network capability owner |
| `ProjectionVersion` | Identity of a projection contract | Projection owner |
| `PolicyVersion` | Identity of an immutable applied policy | Policy owner |
| `CompatibilityMatrixRevision` | Identity of an immutable consumer compatibility declaration | Consumer |

These identities are not interchangeable even when their textual values are equal.

## 4. Opaque VersionValue

`VersionValue` is an opaque identity, not a number and not an ordering primitive.

- The producer defines `VersionSyntax` and one canonical representation for each revision within a `VersionKind`.
- The platform preserves the exact canonical value supplied by the producer.
- Consumers perform exact identity comparison only.
- No normalization, coercion, ordering or semantic interpretation is permitted unless the producer contract explicitly defines it for that `VersionKind`.
- `v1`, `1`, `01` and `1.0.0` are distinct identities unless the producer contract explicitly declares otherwise.
- A syntax such as SemVer constrains the producer; it does not make the platform a SemVer interpreter.
- A producer may not silently reuse alternate representations for the same revision. Changing canonical representation requires a new producer contract revision.

Constructing or storing a canonical version identity does not assert that any consumer supports it.

## 5. Consumer ownership

Every consumer exclusively owns its CompatibilityMatrix. There is no global Mostarda compatibility matrix.

Examples include independent matrices owned by Pricing, Analytics, Marketplace and AI. One consumer cannot publish or alter another consumer's compatibility decision.

Configuration Service may distribute, cache, retain and serve immutable matrix revisions. It cannot author entries, infer compatibility, alter effective periods or choose a matrix on behalf of the consumer.

## 6. CompatibilityScopeId

Each consumer resolves exactly one opaque, canonical `CompatibilityScopeId` before matrix discovery.

The scope may internally represent environment, region, operational cell, tenant when explicitly authorized, or an isolated experiment. The compatibility architecture does not interpret these dimensions.

Rules:

- scope resolution precedes matrix discovery;
- one operation resolves exactly one scope;
- no scope inheritance exists;
- no fallback to global/default scope exists;
- matrices from multiple scopes are never composed;
- the consumer owns a versioned scope contract;
- the operational meaning of a `CompatibilityScopeId` remains stable for the full effective period of the matrix revision;
- changing its composition or meaning requires a new scope-contract revision and a new matrix revision;
- two textual representations may not identify the same scope within the same scope contract.

Failure to resolve the scope stops the pipeline before matrix discovery and produces `COMPATIBILITY_NOT_EVALUATED / COMPATIBILITY_SCOPE_NOT_RESOLVED`.

## 7. Matrix entry identity

Every compatibility entry is uniquely identified by:

```text
ConsumerId
CompatibilityScopeId
ProducerContext
ArtifactType
VersionKind
VersionValue
```

`ArtifactType` is unique within its `ProducerContext`. `VersionKind` is mandatory; `VersionValue` has no meaning without it.

A single effective matrix revision contains at most one entry for the same complete key. Duplicate or contradictory entries make that matrix revision invalid and prevent its publication/evaluation.

A future canonical `ContractId` may replace `ProducerContext + ArtifactType` only through an explicit, versioned architectural decision.

## 8. Compatibility states

The closed compatibility-state catalog is:

| State | Observable behavior |
| --- | --- |
| `SUPPORTED` | Consumer processes normally under the declared contract. |
| `DEPRECATED` | Consumer processes with identical functional semantics and emits only operational replacement observability. |
| `EXPERIMENTAL` | Consumer processes only with explicit experimental authorization; outputs are marked experimental and cannot replace official results without a consumer-specific normative authorization. |
| `UNSUPPORTED` | Consumer explicitly rejects the operation without changing the producer artifact. |

`DEPRECATED` never changes business behavior. `EXPERIMENTAL` is not official by default. Absence of an applicable entry is `UNSUPPORTED / ENTRY_NOT_FOUND`.

## 9. Evaluation result and cause

Compatibility state and evaluation availability are separate.

```text
CompatibilityEvaluationResult
├── DECISION_PRODUCED
│   └── CompatibilityDecision: one of the four matrix states
└── COMPATIBILITY_NOT_EVALUATED
    └── exactly one CompatibilityEvaluationCause
```

`COMPATIBILITY_NOT_EVALUATED` is never stored as a fifth matrix state.

The closed operational-cause catalog, in deterministic evaluation order, is:

1. `COMPATIBILITY_SCOPE_NOT_RESOLVED`
2. `MATRIX_NOT_FOUND`
3. `MATRIX_UNAVAILABLE`
4. `MATRIX_CORRUPTED`
5. `MATRIX_VERSION_UNRESOLVABLE`
6. `MATRIX_NOT_EFFECTIVE`

The evaluation stops at the first blocking condition and records exactly one cause. Later stages are not evaluated after a blocker.

## 10. Deterministic pipeline

```text
1. Resolve CompatibilityScopeId
2. Discover applicable consumer matrix
3. Retrieve the matrix revision
4. Validate identity, integrity and authenticity
5. Resolve explicitly requested historical revision when replaying
6. Validate effective period for the evaluation instant
7. Look up the exact entry key
8. Produce CompatibilityDecision
```

Failures map to the cause at their stage. An entry lookup miss occurs only after a valid effective matrix was loaded and produces the compatibility decision `UNSUPPORTED / ENTRY_NOT_FOUND`; it is not `COMPATIBILITY_NOT_EVALUATED`.

## 11. Lifecycle and temporal behavior

- Each consumer publishes immutable matrix revisions.
- Changing any entry, scope, effective interval or compatibility state requires a new revision.
- Exactly one matrix revision is effective for one `ConsumerId + CompatibilityScopeId` at any instant.
- Effective intervals cannot overlap within that scope.
- Activation is atomic at its effective instant: before `T`, the previous revision applies; at and after `T`, the successor applies.
- Percentage rollout between two effective matrices for the same scope is prohibited.
- Experiments require a distinct scope.
- Retiring or superseding a revision never deletes historical content.

## 12. Real-time processing and replay

- Real-time processing uses the matrix revision effective for the resolved scope and evaluation instant.
- Auditable replay explicitly identifies the matrix revision to use.
- Replay records the matrix revision, scope-contract revision, consumer, artifact key, operation identity, evaluation instant and resulting decision/cause.
- A historical matrix revision that cannot be recovered produces `COMPATIBILITY_NOT_EVALUATED / MATRIX_VERSION_UNRESOLVABLE`.
- Current compatibility never silently substitutes for a missing historical revision.

## 13. Rejection and retry

When compatibility is `UNSUPPORTED`, the operation is rejected as a completed compatibility decision. The authoritative producer artifact remains unchanged.

When compatibility is not evaluated, the operation is rejected without a compatibility decision. Retry is permitted only with the same operation identity. A retry does not create a new logical intent, change the recorded cause of the earlier attempt or mutate the producer artifact.

## 14. Audit record

Every evaluation records:

- operation identity;
- consumer identity;
- `CompatibilityScopeId` and scope-contract revision;
- producer context and artifact type;
- `VersionKind` and exact `VersionValue`;
- matrix revision;
- evaluation instant;
- result kind;
- compatibility state and decision reason when produced;
- exactly one operational cause when not evaluated;
- experimental authorization reference when applicable;
- correlation and causation identities.

The record is append-only. Retry with the same operation identity returns or extends the same logical evaluation history according to TBS idempotency; it never overwrites the original attempt.

## 15. Explicit prohibitions

- Producer declaring consumer compatibility.
- Global compatibility authority or global matrix.
- Configuration Service authoring compatibility.
- Implicit support for absent entries.
- Treating matrix unavailability as `UNSUPPORTED`.
- Storing `COMPATIBILITY_NOT_EVALUATED` inside a matrix.
- Normalizing or ordering opaque version identities implicitly.
- Mutating historical artifacts because a consumer no longer supports them.
- Scope inheritance, default fallback or matrix composition.
- Multiple effective entries for the same complete key.
- Overlapping matrix revisions for one consumer scope.
- Experimental output becoming official without explicit consumer authority.

## 16. Observable acceptance criteria

1. The same textual `VersionValue` under different `VersionKind` values identifies different version subjects.
2. A consumer may reject a version that another consumer supports without changing the producer artifact.
3. Missing entry produces `UNSUPPORTED / ENTRY_NOT_FOUND` only after a valid effective matrix was evaluated.
4. Missing matrix produces `COMPATIBILITY_NOT_EVALUATED / MATRIX_NOT_FOUND`.
5. Corrupted and out-of-effect matrices produce their own single earliest causes.
6. `DEPRECATED` produces the same functional result as `SUPPORTED` plus operational observability.
7. Unauthorized `EXPERIMENTAL` processing cannot replace official output.
8. A real-time evaluation uses the current effective revision; an auditable replay uses its explicitly identified historical revision.
9. Activation swaps the effective revision atomically with no overlap.
10. Failure to resolve scope never triggers global/default fallback.
11. Retry after non-evaluation preserves the same operation identity.
12. Configuration Service cannot publish or change a compatibility entry.

## 17. Deliberately deferred materialization

This design does not choose storage, serialization, broker, cache, API shape, deployment topology or programming-language representation. Those belong to CGS and implementation plans, provided they preserve the observable behavior above.
