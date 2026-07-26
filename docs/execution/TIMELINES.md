# Timelines — Execution Model

## Compra até pagamento

```text
Advertiser → Campaign(Create/Publish) → Pricing(Quote) → Slot(Reserve)
→ Edge(queue) → Player(PlaybackEvent) → Cloud(EvidenceRecord VALID)
→ Quantum(CanonicalEvidencePackage hash/anchor) → Settlement(SplitShare)
→ Asaas(payment) → Settlement(reconciliation)
```

## Provisionamento de TV

```text
Operator → TV(Register) → Security(credentials) → Edge(install)
→ TVCapability(declare/activate) → Health/ObservedState → TV(activate)
```

## Recuperação offline

```text
Player → Playback Collector(local durable queue) → connectivity restored
→ Cloud(deduplicate/validate) → Evidence Ledger → Quantum Anchor
```

## Seguro

```text
Claimant → InsuranceClaim(filed) → Coverage(review) → Reserve
→ Repair or Replacement authorization → InsuranceSettlement → Insurance Ledger
```

## Atualização remota e reconciliação

```text
Cloud(DesiredState) → Reconciler(diff Current/Observed) → Edge(command)
→ Update/Health Gate → CurrentState report → Cloud(ObservedState) → converged
```

## Emergência

```text
Authorized operator → Emergency command → Canvas priority layer → Player preemption
→ Edge confirmation → expiry/clear → restore compatible composition
```
