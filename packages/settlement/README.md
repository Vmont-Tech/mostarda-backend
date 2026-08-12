# Settlement financial walking skeleton

This package currently contains two deliberately separate pieces:

- `index.ts` — the authoritative `SPLIT-PERFORMANCE-RESIDUAL-V1` policy supplied by PR #9;
- `financial-slice.ts` — an in-memory Settlement walking skeleton that materializes rights,
  a balanced journal transaction, and temporary PartnerLedger entries for tests.

`SettlementMemoryStore`, the destination `accountId` values, and the emitted ledger records
are adapters/representations for this slice only. They are not the production PartnerLedger,
financial persistence, Wallet, Withdrawal, payout or Asaas integration. The slice consumes the
policy; it does not redefine or modify it.
