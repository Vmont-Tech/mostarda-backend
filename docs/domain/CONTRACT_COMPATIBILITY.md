# Contract Compatibility

This document defines the domain ownership and vocabulary for consumer-owned contract compatibility. It creates no Bounded Context, aggregate, command or event.

## Producer-owned version identity

`VersionValue` is an opaque identity. The producer of each `VersionKind` defines `VersionSyntax` and one canonical representation for every revision. The platform preserves the exact canonical value supplied by that producer. Consumers compare exact identities: no normalization, coercion, ordering or implicit semantic interpretation is permitted unless that producer contract explicitly defines it for the particular `VersionKind`.

`ContractSchemaVersion`, `CollectorVersion`, `CapabilityVersion`, `ProjectionVersion`, `PolicyVersion` and `CompatibilityMatrixRevision` identify different semantic subjects even when their text is equal. Constructing or retaining a version identity makes no compatibility claim.

## Consumer authority and scope

Every consumer exclusively owns its immutable `CompatibilityMatrix` revisions and its compatibility decisions. There is no global compatibility matrix and this model creates no new compatibility authority. Pricing, Analytics, Marketplace and AI may therefore reach different decisions for the same producer identity without changing the producer artifact. One consumer cannot publish or alter another consumer's declaration.

Configuration Service distributes, caches, retains and serves immutable revisions only. It cannot author entries, change effective periods, infer support or select a revision on behalf of a consumer.

Before discovery, the consumer resolves exactly one opaque canonical `CompatibilityScopeId` under its versioned scope contract. One operation uses one scope. Matrices from multiple scopes are never composed; there is no scope inheritance and no global or default fallback. The scope meaning remains stable throughout an effective period; changing it requires a new scope-contract revision and matrix revision.

Two textual representations cannot identify the same scope within the same scope contract.

## Entry identity and decisions

The complete six-field entry key is, in order:

1. `ConsumerId`
2. `CompatibilityScopeId`
3. `ProducerContext`
4. `ArtifactType`
5. `VersionKind`
6. `VersionValue`

`ArtifactType` is unique within its `ProducerContext`; `VersionValue` has no meaning without `VersionKind`. An effective revision contains at most one entry for the same complete six-field key. Duplicate or contradictory entries invalidate the revision and prevent publication or evaluation.

The closed compatibility-state catalog is `SUPPORTED`, `DEPRECATED`, `EXPERIMENTAL` and `UNSUPPORTED`. `DEPRECATED` preserves identical functional semantics and adds only replacement observability. `EXPERIMENTAL` requires explicit authorization, marks its output experimental and cannot replace official output without consumer-specific normative authority. Compatibility is closed by default: after a valid effective matrix is evaluated, an absent exact entry produces `UNSUPPORTED / ENTRY_NOT_FOUND`.

## Evaluation result vocabulary

Every evaluation has exactly one result kind: `DECISION_PRODUCED`, containing one of the four compatibility states and its reason, or `COMPATIBILITY_NOT_EVALUATED`, containing exactly one operational cause. `COMPATIBILITY_NOT_EVALUATED` is never a fifth compatibility state and never appears as a matrix entry.

The closed cause catalog, in deterministic first-blocker order, is:

1. `COMPATIBILITY_SCOPE_NOT_RESOLVED`
2. `MATRIX_NOT_FOUND`
3. `MATRIX_UNAVAILABLE`
4. `MATRIX_CORRUPTED`
5. `MATRIX_VERSION_UNRESOLVABLE`
6. `MATRIX_NOT_EFFECTIVE`

An unavailable evaluation never becomes an `UNSUPPORTED` decision. A produced `UNSUPPORTED` decision rejects the operation while leaving the authoritative producer artifact unchanged.

## Lifecycle, time and audit

Consumers publish immutable matrix revisions with non-overlapping effective intervals for each `ConsumerId + CompatibilityScopeId`. Exactly one revision is effective at an instant. Activation is atomic: before its effective instant the predecessor applies, and at or after that instant the successor applies. Percentage rollout within one scope is prohibited; experiments use a distinct scope.

Changing any entry, scope, effective interval or compatibility state requires a new immutable revision. Retiring or superseding a revision never deletes historical content.

Real-time evaluation uses the current effective revision for the resolved scope and evaluation instant. Auditable replay uses an explicitly identified historical revision; current compatibility cannot substitute for an unrecoverable historical revision.

Every attempt appends an audit record. Its common required fields are operation identity, consumer identity, evaluation instant, correlation identity, causation identity, evaluation stage and explicit `ResultKind`. A produced decision records state and reason; a non-evaluation records exactly one cause.

Stage-dependent fields are present only when established by completed stages. `CompatibilityScopeId`, scope-contract revision and the complete six-field entry key are recorded only after scope resolution. Matrix revision is recorded only after matrix discovery and retrieval. Experimental authorization is recorded only when applicable. For an early blocker such as `COMPATIBILITY_SCOPE_NOT_RESOLVED`, unresolved scope, scope-contract, complete-key and matrix fields are structurally absent. For `MATRIX_NOT_FOUND` or `MATRIX_UNAVAILABLE`, matrix revision is structurally absent. All unavailable fields are structurally absent with the reached stage and cause; no sentinel or default value may fabricate an unavailable identity.

Retry is allowed only with the same operation identity and never overwrites the earlier attempt or mutates the producer artifact.
