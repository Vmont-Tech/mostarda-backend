import assert from "node:assert/strict";
import test from "node:test";

import type { SettlementInput } from "../../packages/settlement/src/financial-slice.ts";

const databaseUrl = process.env.DATABASE_URL;

const input = (): SettlementInput => ({
  campaignId: "C001",
  grossAmount: "100.0000",
  evidence: {
    evidenceId: "E001",
    campaignId: "C001",
    status: "VALID",
    anchorStatus: "CONFIRMED",
    reverted: false,
  },
  seller: { acquisition: true, activationPayment: false, renewal: false, volume: false },
  influencer: { entry: true, activation: false, performanceEngagement: false, recurrenceResult: false },
  destinations: {
    tvOwnerId: "TV_OWNER_001",
    spaceOwnerId: "SPACE_OWNER_001",
    sellerId: "SELLER_001",
    sellerAcquisitionFundId: "SELLER_ACQUISITION_FUND",
    influencerId: "INFLUENCER_001",
    influencerAcquisitionFundId: "INFLUENCER_ACQUISITION_FUND",
    mostardaId: "MOSTARDA",
  },
});

test(
  "PostgreSQL persists and replays the complete Settlement financial slice",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async () => {
    const { Pool } = await import("pg");
    const { applySqlMigration, PostgresSettlementStore } = await import(
      "../../packages/persistence-postgres/src/index.ts"
    );
    const { settleEvidencePersisted } = await import(
      "../../packages/settlement/src/persistent-settlement.ts"
    );
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      await applySqlMigration(
        pool,
        new URL("../../migrations/007_settlement_financial_slice.sql", import.meta.url),
      );
      await pool.query(
        "TRUNCATE partner_ledger_entries, journal_lines, journal_transactions, financial_rights, settlement_cycles",
      );
      const store = new PostgresSettlementStore(pool);
      const first = await settleEvidencePersisted(input(), store);
      const replay = await settleEvidencePersisted(input(), store);
      const restartedStore = new PostgresSettlementStore(pool);
      const restartedReplay = await settleEvidencePersisted(input(), restartedStore);

      assert.equal(first.rights.length, 7);
      assert.equal(first.journalTransaction.debitTotal, "100.0000");
      assert.equal(first.journalTransaction.creditTotal, "100.0000");
      assert.equal(replay.settlementCycle.settlementCycleId, first.settlementCycle.settlementCycleId);
      assert.equal(restartedReplay.settlementCycle.settlementCycleId, first.settlementCycle.settlementCycleId);
      assert.equal((await pool.query("SELECT count(*)::int AS count FROM settlement_cycles")).rows[0].count, 1);
      assert.equal((await pool.query("SELECT count(*)::int AS count FROM partner_ledger_entries")).rows[0].count, 7);
    } finally {
      await pool.end();
    }
  },
);

test(
  "PostgreSQL serializes concurrent Settlement materialization by Evidence identity",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async () => {
    const { Pool } = await import("pg");
    const { applySqlMigration, PostgresSettlementStore } = await import(
      "../../packages/persistence-postgres/src/index.ts"
    );
    const { settleEvidencePersisted } = await import(
      "../../packages/settlement/src/persistent-settlement.ts"
    );
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      await applySqlMigration(
        pool,
        new URL("../../migrations/007_settlement_financial_slice.sql", import.meta.url),
      );
      await pool.query(
        "TRUNCATE partner_ledger_entries, journal_lines, journal_transactions, financial_rights, settlement_cycles",
      );
      const results = await Promise.all([
        settleEvidencePersisted(input(), new PostgresSettlementStore(pool)),
        settleEvidencePersisted(input(), new PostgresSettlementStore(pool)),
      ]);

      assert.equal(results[0].settlementCycle.settlementCycleId, results[1].settlementCycle.settlementCycleId);
      assert.equal((await pool.query("SELECT count(*)::int AS count FROM settlement_cycles")).rows[0].count, 1);
      assert.equal((await pool.query("SELECT count(*)::int AS count FROM partner_ledger_entries")).rows[0].count, 7);
    } finally {
      await pool.end();
    }
  },
);
