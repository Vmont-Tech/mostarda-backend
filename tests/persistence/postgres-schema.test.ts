import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../../migrations/001_event_store.sql", import.meta.url);
const inboxMigrationUrl = new URL("../../migrations/002_inbox.sql", import.meta.url);
const projectionMigrationUrl = new URL(
  "../../migrations/004_projection_store.sql",
  import.meta.url,
);
const projectionInvalidationMigrationUrl = new URL(
  "../../migrations/005_projection_invalidation.sql",
  import.meta.url,
);
const projectionInvalidationHistoryMigrationUrl = new URL(
  "../../migrations/006_projection_invalidation_history.sql",
  import.meta.url,
);
const settlementMigrationUrl = new URL(
  "../../migrations/007_settlement_financial_slice.sql",
  import.meta.url,
);
const settlementHardeningMigrationUrl = new URL(
  "../../migrations/008_settlement_integrity_hardening.sql",
  import.meta.url,
);
const settlementSplitResultsMigrationUrl = new URL(
  "../../migrations/009_settlement_split_results.sql",
  import.meta.url,
);
const settlementB002HardeningMigrationUrl = new URL(
  "../../migrations/010_b002_split_result_hardening.sql",
  import.meta.url,
);

test("settlement migration defines append-only materialization and idempotency constraints", async () => {
  const sql = await readFile(settlementMigrationUrl, "utf8");

  assert.match(sql, /CREATE TABLE IF NOT EXISTS settlement_cycles/);
  assert.match(sql, /UNIQUE \(campaign_id, evidence_id\)/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS financial_rights/);
  assert.match(sql, /split_share_id TEXT NOT NULL UNIQUE/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS journal_transactions/);
  assert.match(sql, /journal_transaction_cycle_unique/);
  assert.match(sql, /debit_total NUMERIC\(20,4\) NOT NULL/);
  assert.match(sql, /credit_total NUMERIC\(20,4\) NOT NULL/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS partner_ledger_entries/);
  assert.match(sql, /financial_right_id TEXT NOT NULL UNIQUE/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION prevent_settlement_mutation/);
  assert.match(sql, /BEFORE UPDATE OR DELETE ON settlement_cycles/);
  assert.match(sql, /CHECK \(gross_amount >= 0\)/);
  assert.match(sql, /DEFERRABLE INITIALLY DEFERRED/);
  assert.match(sql, /CREATE TRIGGER partner_ledger_entries_append_only/);
  assert.match(sql, /BEFORE TRUNCATE ON settlement_cycles/);
  assert.match(sql, /BEFORE TRUNCATE ON financial_rights/);
  assert.match(sql, /BEFORE TRUNCATE ON journal_transactions/);
  assert.match(sql, /BEFORE TRUNCATE ON journal_lines/);
  assert.match(sql, /BEFORE TRUNCATE ON partner_ledger_entries/);
  assert.match(sql, /validate_financial_right_consistency/);
  assert.match(sql, /validate_journal_transaction_consistency/);
  assert.match(sql, /validate_journal_line_consistency/);
  assert.match(sql, /validate_partner_ledger_consistency/);
});

test("settlement hardening migration fixes monetary scale and materialization invariants", async () => {
  const sql = await readFile(settlementHardeningMigrationUrl, "utf8");

  assert.match(sql, /NUMERIC\(18,4\)/);
  assert.match(sql, /SUM\(amount\)/);
  assert.match(sql, /FinancialRights must conserve SettlementCycle gross_amount/);
  assert.match(sql, /unlinked.*credit|credit.*unlinked/i);
  assert.match(sql, /settlement_cycles/);
  assert.match(sql, /DEFERRABLE INITIALLY DEFERRED/);
  assert.match(sql, /settlement_materialization_complete_cycle/);
});

test("B-002 migration separates seven SplitShare results from positive financial rights", async () => {
  const sql = await readFile(settlementSplitResultsMigrationUrl, "utf8");

  assert.match(sql, /CREATE TABLE IF NOT EXISTS settlement_split_results/);
  assert.match(sql, /split_result_cycle_line_unique/);
  assert.match(sql, /basis_points INTEGER/);
  assert.match(sql, /settlement_cycle_gross_positive/);
  assert.match(sql, /financial_right_positive_amount/);
  assert.match(sql, /journal_line_positive_amount/);
  assert.match(sql, /partner_ledger_positive_amount/);
  assert.match(sql, /FinancialRight must reference a SplitShare result/);
  assert.match(sql, /FinancialRights must match strictly positive SplitShare results/);
  assert.match(sql, /exactly seven SplitShare results/);
  assert.match(sql, /settlement_split_results_append_only/);
});

test("B-002 hardening binds SplitShare identity and rejects zero-basis-point rights", async () => {
  const sql = await readFile(settlementB002HardeningMigrationUrl, "utf8");

  assert.match(sql, /validate_split_result_consistency/);
  assert.match(sql, /settlement_split_result_semantic_identity/);
  assert.match(sql, /evidence_id.*split_policy_version/);
  assert.match(sql, /basis_points = 0 AND NEW\.amount <> 0/);
  assert.match(sql, /FinancialRight cannot reference a zero-basis-point SplitShare/);
});

test("event store migration enforces append-only identity and revision constraints", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /CONSTRAINT events_event_id_unique UNIQUE \(event_id\)/);
  assert.match(
    sql,
    /CONSTRAINT events_stream_revision_unique UNIQUE \(stream_id, aggregate_revision\)/,
  );
  assert.match(sql, /CREATE OR REPLACE FUNCTION prevent_event_mutation/);
  assert.match(sql, /BEFORE UPDATE OR DELETE ON event_store_events/);
});

test("inbox has one immutable logical receipt per consumer and EventId", async () => {
  const sql = await readFile(inboxMigrationUrl, "utf8");

  assert.match(sql, /PRIMARY KEY \(consumer_name, event_id\)/);
  assert.match(sql, /payload_digest TEXT NOT NULL/);
  assert.match(sql, /effect_result JSONB NOT NULL/);
});

test("PostgreSQL adapters preserve BIGINT revisions without Number coercion", async () => {
  const sources = await Promise.all([
    readFile(
      new URL(
        "../../packages/persistence-postgres/src/postgres-event-store.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../../packages/persistence-postgres/src/postgres-delivery-log.ts",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  for (const source of sources) {
    assert.doesNotMatch(source, /Number\([^)]*(?:revision|aggregate_revision)/i);
    assert.match(source, /BigInt\(row\.aggregate_revision\)/);
  }
});

test("outbox references the authoritative Event and preserves pending delivery", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /event_id UUID NOT NULL REFERENCES event_store_events\(event_id\)/);
  assert.match(sql, /published_at TIMESTAMPTZ NULL/);
  assert.match(sql, /WHERE published_at IS NULL/);
  assert.match(sql, /lease_token TEXT NULL/);
  assert.match(sql, /lease_expires_at TIMESTAMPTZ NULL/);
});

test("lease evolution is an ordered upgrade-safe migration", async () => {
  const sql = await readFile(
    new URL("../../migrations/003_outbox_leases.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /ALTER TABLE event_store_outbox/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS lease_token/);
  assert.match(sql, /event_store_outbox_claims/);
  assert.match(sql, /lease_token TEXT PRIMARY KEY/);
});

test("projection candidates are complete immutable records with a composite identity", async () => {
  const sql = await readFile(projectionMigrationUrl, "utf8");

  assert.match(sql, /CREATE TABLE IF NOT EXISTS projection_rebuilds/);
  assert.match(
    sql,
    /PRIMARY KEY \(projection_name, projection_version, rebuild_id\)/,
  );
  assert.match(sql, /state JSONB NOT NULL/);
  assert.match(sql, /checkpoint BIGINT NOT NULL/);
  assert.match(sql, /as_of TIMESTAMPTZ NULL/);
  assert.match(sql, /staleness JSONB NOT NULL/);
  assert.match(sql, /rebuild_status TEXT NOT NULL/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION prevent_projection_rebuild_mutation/);
  assert.match(sql, /BEFORE UPDATE OR DELETE ON projection_rebuilds/);
});

test("projection heads have one current candidate per projection", async () => {
  const sql = await readFile(projectionMigrationUrl, "utf8");

  assert.match(sql, /CREATE TABLE IF NOT EXISTS projection_heads/);
  assert.match(sql, /projection_name TEXT PRIMARY KEY/);
  assert.match(
    sql,
    /FOREIGN KEY \(projection_name, projection_version, rebuild_id\)\s+REFERENCES projection_rebuilds \(projection_name, projection_version, rebuild_id\)/,
  );
});

test("projection promotion uses a transaction, row locks, and bigint conversion", async () => {
  const source = await readFile(
    new URL(
      "../../packages/persistence-postgres/src/postgres-projection-store.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(source, /client\.query\("BEGIN"\)/);
  assert.match(source, /FOR UPDATE/);
  assert.match(source, /client\.query\("COMMIT"\)/);
  assert.match(source, /client\.query\("ROLLBACK"\)/);
  assert.match(source, /BigInt\(row\.checkpoint\)/);
  assert.doesNotMatch(source, /Number\([^)]*checkpoint/i);
});

test("projection invalidation is an upgrade-safe tombstone linked to its candidate", async () => {
  const sql = await readFile(projectionInvalidationMigrationUrl, "utf8");

  assert.match(sql, /CREATE TABLE IF NOT EXISTS projection_invalidations/);
  assert.match(sql, /projection_name TEXT PRIMARY KEY/);
  assert.match(
    sql,
    /FOREIGN KEY \(projection_name, projection_version, rebuild_id\)\s+REFERENCES projection_rebuilds \(projection_name, projection_version, rebuild_id\)/,
  );
});

test("PostgreSQL invalidation is transactional and locked", async () => {
  const source = await readFile(
    new URL(
      "../../packages/persistence-postgres/src/postgres-projection-store.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(source, /async invalidate\(/);
  assert.match(source, /projection_invalidations/);
  assert.match(source, /FOR UPDATE/);
});

test("projection invalidation history retains every composite generation identity", async () => {
  const sql = await readFile(projectionInvalidationHistoryMigrationUrl, "utf8");

  assert.match(sql, /DROP CONSTRAINT IF EXISTS projection_invalidations_pkey/);
  assert.match(
    sql,
    /PRIMARY KEY \(projection_name, projection_version, rebuild_id\)/,
  );
});
