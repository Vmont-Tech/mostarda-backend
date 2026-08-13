import assert from "node:assert/strict";
import test from "node:test";

import {
  SettlementMemoryStore,
  settleEvidence,
  type SettlementInput,
  type SettlementResult,
} from "../../packages/settlement/src/financial-slice.ts";

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
      const store = new PostgresSettlementStore<SettlementResult>(pool);
      const first = await settleEvidencePersisted(input(), store);
      const replay = await settleEvidencePersisted(input(), store);
      const restartedStore = new PostgresSettlementStore<SettlementResult>(pool);
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
        settleEvidencePersisted(input(), new PostgresSettlementStore<SettlementResult>(pool)),
        settleEvidencePersisted(input(), new PostgresSettlementStore<SettlementResult>(pool)),
      ]);

      assert.equal(results[0].settlementCycle.settlementCycleId, results[1].settlementCycle.settlementCycleId);
      assert.equal((await pool.query("SELECT count(*)::int AS count FROM settlement_cycles")).rows[0].count, 1);
      assert.equal((await pool.query("SELECT count(*)::int AS count FROM partner_ledger_entries")).rows[0].count, 7);
    } finally {
      await pool.end();
    }
  },
);

async function resetSettlementStore(pool: { query: (sql: string) => Promise<unknown> }): Promise<void> {
  await pool.query(
    "TRUNCATE partner_ledger_entries, journal_lines, journal_transactions, financial_rights, settlement_cycles",
  );
}

test(
  "PostgreSQL rejects replay with divergent gross, policy, rights, or destinations",
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
      const store = new PostgresSettlementStore<SettlementResult>(pool);

      await resetSettlementStore(pool);
      await settleEvidencePersisted(input(), store);
      await assert.rejects(
        () => settleEvidencePersisted({ ...input(), grossAmount: "101.0000" }, store),
        /grossAmount/,
      );

      await resetSettlementStore(pool);
      const policyFixture = settleEvidence(input(), new SettlementMemoryStore());
      const policyTampered = structuredClone(policyFixture) as SettlementResult;
      (policyTampered.settlementCycle as { splitPolicyVersion: string }).splitPolicyVersion = "OTHER-POLICY";
      await resetSettlementStore(pool);
      await store.save(policyTampered);
      await assert.rejects(
        () => settleEvidencePersisted(input(), store),
        /splitPolicyVersion/,
      );

      await resetSettlementStore(pool);
      const destinationTampered = structuredClone(policyFixture) as SettlementResult;
      (destinationTampered.rights[2] as { destinationId: string }).destinationId = "OTHER_DESTINATION";
      await store.save(destinationTampered);
      await assert.rejects(
        () => settleEvidencePersisted(input(), store),
        /destinationId/,
      );

      await resetSettlementStore(pool);
      const rightsTampered = structuredClone(policyFixture) as SettlementResult;
      (rightsTampered.rights[2] as { amount: string }).amount = "4.0000";
      await store.save(rightsTampered);
      await assert.rejects(
        () => settleEvidencePersisted({
          ...input(),
          seller: { ...input().seller, acquisition: false },
        }, store),
        /amount|rights/,
      );
    } finally {
      await pool.end();
    }
  },
);

test(
  "PostgreSQL rejects a concurrent divergent replay without duplicating the Settlement",
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
      await resetSettlementStore(pool);
      const divergent = {
        ...input(),
        destinations: { ...input().destinations, mostardaId: "OTHER_MOSTARDA" },
      };
      const results = await Promise.allSettled([
        settleEvidencePersisted(input(), new PostgresSettlementStore<SettlementResult>(pool)),
        settleEvidencePersisted(divergent, new PostgresSettlementStore<SettlementResult>(pool)),
      ]);
      assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
      assert.equal(results.filter((result) => result.status === "rejected").length, 1);
      const rejected = results.find((result) => result.status === "rejected");
      assert.match(String((rejected as PromiseRejectedResult).reason), /destinationId|replay conflict/);
      assert.equal((await pool.query("SELECT count(*)::int AS count FROM settlement_cycles")).rows[0].count, 1);
      assert.equal((await pool.query("SELECT count(*)::int AS count FROM partner_ledger_entries")).rows[0].count, 7);
    } finally {
      await pool.end();
    }
  },
);

test(
  "migration 007 enforces rollback, foreign keys, append-only rows, uniqueness, and journal balance",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async () => {
    const { Pool } = await import("pg");
    const { applySqlMigration } = await import(
      "../../packages/persistence-postgres/src/index.ts"
    );
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      await applySqlMigration(
        pool,
        new URL("../../migrations/007_settlement_financial_slice.sql", import.meta.url),
      );
      await resetSettlementStore(pool);

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `INSERT INTO settlement_cycles (
             settlement_cycle_id, campaign_id, evidence_id, gross_amount,
             split_policy_version, status
           ) VALUES ('rollback-cycle', 'ROLLBACK', 'EVIDENCE', 1.0000, 'POLICY', 'CLOSED')`,
        );
        await client.query("ROLLBACK");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
      assert.equal(
        (await pool.query("SELECT count(*)::int AS count FROM settlement_cycles WHERE settlement_cycle_id = 'rollback-cycle'")).rows[0].count,
        0,
      );

      await assert.rejects(
        () => pool.query(
          `INSERT INTO financial_rights (
             financial_right_id, split_share_id, settlement_cycle_id, line,
             destination_id, amount, evidence_id, split_policy_version, status
           ) VALUES ('orphan-right', 'orphan-share', 'missing-cycle', 'SELLER', 'SELLER', 1.0000, 'EVIDENCE', 'POLICY', 'READY')`,
        ),
        /foreign key|violates/i,
      );

      await pool.query(
        `INSERT INTO settlement_cycles (
           settlement_cycle_id, campaign_id, evidence_id, gross_amount,
           split_policy_version, status
         ) VALUES ('append-cycle', 'APPEND', 'EVIDENCE', 1.0000, 'POLICY', 'CLOSED')`,
      );
      await assert.rejects(
        () => pool.query("UPDATE settlement_cycles SET gross_amount = 2.0000 WHERE settlement_cycle_id = 'append-cycle'"),
        /append-only/i,
      );
      await assert.rejects(
        () => pool.query("DELETE FROM settlement_cycles WHERE settlement_cycle_id = 'append-cycle'"),
        /append-only/i,
      );
      await pool.query("DELETE FROM settlement_cycles WHERE settlement_cycle_id = 'append-cycle' /* cleanup is blocked by contract */").catch(() => undefined);

      await assert.rejects(
        () => pool.query(
          `INSERT INTO journal_transactions (
             transaction_id, settlement_cycle_id, evidence_id, debit_total,
             credit_total
           ) VALUES ('unbalanced', 'append-cycle', 'EVIDENCE', 1.0000, 2.0000)`,
        ),
        /check constraint|violates/i,
      );
    } finally {
      await pool.end();
    }
  },
);
