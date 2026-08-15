# Settlement financial walking skeleton

This package currently contains two deliberately separate pieces:

- `index.ts` — the authoritative `SPLIT-PERFORMANCE-RESIDUAL-V1` policy supplied by PR #9;
- `financial-slice.ts` — an in-memory Settlement walking skeleton that materializes rights,
  a balanced journal transaction, and temporary PartnerLedger entries for tests.

`SettlementMemoryStore`, the destination `accountId` values, and the emitted ledger records
are adapters/representations for this slice only. They are not the production PartnerLedger,
financial persistence, Wallet, Withdrawal, payout or Asaas integration. The slice consumes the
policy; it does not redefine or modify it.

`persistent-settlement.ts` defines the persistence port for this materialization boundary.
`PostgresSettlementStore` implements that port in `@mostarda/persistence-postgres` using
migration `007_settlement_financial_slice.sql`. It persists SettlementCycle, FinancialRights,
JournalTransaction/JournalLines and PartnerLedger entries with append-only and idempotency
constraints. PostgreSQL integration tests run only when `DATABASE_URL` is available; otherwise
the conditional tests remain explicitly skipped.

## Integrity boundary of this slice

The persistent adapter performs a complete structural replay comparison inside
the adapter; `save` has no optional validation hook or callback. PostgreSQL enforces
one JournalTransaction per SettlementCycle, semantic identity between parent
and child rows, transactional rollback, and append-only behavior including
`TRUNCATE` through database triggers.

The current walking skeleton materializes the normative fields already present
in its Settlement contracts: Evidence identity, SettlementCycle identity,
gross amount, BRL currency at the schema boundary, SplitPolicy version and
the seven FinancialRights. CausationId, CorrelationId, an authoritative
business instant and the complete production account model are intentionally
deferred to the next Financial Platform milestone; this slice has no approved
command/event source from which to derive them and does not fabricate values.
