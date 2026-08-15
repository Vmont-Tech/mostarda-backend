import assert from "node:assert/strict";
import test from "node:test";

import {
  SettlementMemoryStore,
  settleEvidence,
  type SettlementInput,
  type SettlementResult,
} from "../../packages/settlement/src/financial-slice.ts";

const databaseUrl = process.env.DATABASE_URL;
const runId = process.env.SETTLEMENT_TEST_RUN_ID ?? `run-${process.pid}-${Date.now()}`;
type TestInput = SettlementInput & {
  readonly evidence: SettlementInput["evidence"] & { readonly disputed: boolean };
};

const input = (label: string): TestInput => ({
  campaignId: `C-${runId}-${label}`,
  grossAmount: "100.0000",
  evidence: {
    evidenceId: `E-${runId}-${label}`,
    campaignId: `C-${runId}-${label}`,
    status: "VALID",
    anchorStatus: "CONFIRMED",
    reverted: false,
    disputed: false,
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

async function settlementModules(): Promise<any> {
  const [{ PostgresSettlementStore }, { settleEvidencePersisted }] = await Promise.all([
    import("../../packages/persistence-postgres/src/index.ts"),
    import("../../packages/settlement/src/persistent-settlement.ts"),
  ]);
  return { PostgresSettlementStore, settleEvidencePersisted };
}

async function prepare(pool: any): Promise<any> {
  const { applySqlMigration } = await import("../../packages/persistence-postgres/src/index.ts");
  await applySqlMigration(pool, new URL("../../migrations/007_settlement_financial_slice.sql", import.meta.url));
  return settlementModules();
}

function storeOf(modules: any, pool: any): any {
  return new modules.PostgresSettlementStore(pool);
}

const directRightAmounts = ["20.0000", "20.0000", "5.0000", "15.0000", "3.0000", "7.0000", "30.0000"] as const;

type DirectMaterializationOptions = {
  readonly rightIndexes?: readonly number[];
  readonly lineIndexes?: readonly number[];
  readonly ledgerIndexes?: readonly number[];
};

async function insertDirectMaterialization(
  client: any,
  label: string,
  options: DirectMaterializationOptions = {},
): Promise<void> {
  const rights = options.rightIndexes ?? [0, 1, 2, 3, 4, 5, 6];
  const lines = options.lineIndexes ?? rights;
  const ledgers = options.ledgerIndexes ?? rights;
  const cycleId = `structural-cycle-${runId}-${label}`;
  const evidenceId = `structural-evidence-${runId}-${label}`;
  const campaignId = `structural-campaign-${runId}-${label}`;
  const journalId = `structural-journal-${runId}-${label}`;

  await client.query(
    `INSERT INTO settlement_cycles (settlement_cycle_id, campaign_id, evidence_id, gross_amount, split_policy_version, status)
     VALUES ($1, $2, $3, 100.0000, 'SPLIT-PERFORMANCE-RESIDUAL-V1', 'CLOSED')`,
    [cycleId, campaignId, evidenceId],
  );
  for (const index of rights) {
    await client.query(
      `INSERT INTO financial_rights (financial_right_id, split_share_id, settlement_cycle_id, line, destination_id, amount, evidence_id, split_policy_version, status)
       VALUES ($1, $2, $3, $4, $5, $6::numeric, $7, 'SPLIT-PERFORMANCE-RESIDUAL-V1', 'READY')`,
      [`structural-right-${runId}-${label}-${index}`, `structural-share-${runId}-${label}-${index}`, cycleId,
        `RIGHT_${index}`, `DESTINATION_${index}`, directRightAmounts[index], evidenceId],
    );
  }
  await client.query(
    `INSERT INTO journal_transactions (transaction_id, settlement_cycle_id, evidence_id, debit_total, credit_total)
     VALUES ($1, $2, $3, 100.0000, 100.0000)`,
    [journalId, cycleId, evidenceId],
  );

  const linkedCredit = lines.reduce((total, index) => total + Number(directRightAmounts[index]), 0);
  const values: string[] = ["($1, $2, 0, 'CAMPAIGN', 'DEBIT', 100.0000, NULL)"];
  const params: unknown[] = [`structural-debit-${runId}-${label}`, journalId];
  for (const [lineOrder, index] of lines.entries()) {
    const base = params.length + 1;
    values.push(`($${base}, $2, ${lineOrder + 1}, $${base + 1}, 'CREDIT', $${base + 2}::numeric, $${base + 3})`);
    params.push(
      `structural-line-${runId}-${label}-${lineOrder}`,
      `DESTINATION_${index}`,
      directRightAmounts[index],
      `structural-right-${runId}-${label}-${index}`,
    );
  }
  const remainder = (100 - linkedCredit).toFixed(4);
  if (remainder !== "0.0000") {
    const base = params.length + 1;
    values.push(`($${base}, $2, ${lines.length + 1}, 'UNLINKED', 'CREDIT', $${base + 1}::numeric, NULL)`);
    params.push(`structural-unlinked-${runId}-${label}`, remainder);
  }
  await client.query(
    `INSERT INTO journal_lines (journal_line_id, transaction_id, line_order, account_id, direction, amount, financial_right_id)
     VALUES ${values.join(",\n")}`,
    params,
  );

  for (const index of ledgers) {
    await client.query(
      `INSERT INTO partner_ledger_entries (ledger_entry_id, financial_right_id, split_share_id, settlement_cycle_id, evidence_id, destination_id, amount, journal_transaction_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7::numeric, $8, 'PENDING')`,
      [`structural-ledger-${runId}-${label}-${index}`, `structural-right-${runId}-${label}-${index}`,
        `structural-share-${runId}-${label}-${index}`, cycleId, evidenceId, `DESTINATION_${index}`,
        directRightAmounts[index], journalId],
    );
  }
}

async function assertDirectMaterializationRejected(
  pool: any,
  label: string,
  options: DirectMaterializationOptions,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await insertDirectMaterialization(client, label, options);
    await assert.rejects(() => client.query("COMMIT"), /JournalLine|FinancialRight|Ledger|seven|complete|materializ|right|journal/i);
  } finally {
    await client.query("ROLLBACK").catch(() => undefined);
    client.release();
  }
}

test(
  "PostgreSQL rejects a JournalTransaction without JournalLines",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async () => {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      await prepare(pool);
      await assertDirectMaterializationRejected(pool, "journal-without-lines", { lineIndexes: [], ledgerIndexes: [] });
    } finally {
      await pool.end();
    }
  },
);

test(
  "PostgreSQL rejects a materialized Settlement with fewer than seven FinancialRights",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async () => {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      await prepare(pool);
      await assertDirectMaterializationRejected(pool, "six-rights", {
        rightIndexes: [0, 1, 2, 3, 4, 5],
        lineIndexes: [0, 1, 2, 3, 4, 5],
        ledgerIndexes: [0, 1, 2, 3, 4, 5],
      });
    } finally {
      await pool.end();
    }
  },
);

test(
  "PostgreSQL rejects a FinancialRight without exactly one credit JournalLine",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async () => {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      await prepare(pool);
      await assertDirectMaterializationRejected(pool, "missing-right-line", {
        lineIndexes: [0, 1, 2, 3, 4, 5],
      });
    } finally {
      await pool.end();
    }
  },
);

test(
  "PostgreSQL rejects a FinancialRight duplicated across JournalLines",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async () => {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      await prepare(pool);
      await assertDirectMaterializationRejected(pool, "duplicate-right-line", {
        lineIndexes: [0, 0, 2, 3, 4, 5, 6],
      });
    } finally {
      await pool.end();
    }
  },
);

test(
  "PostgreSQL rejects a FinancialRight without exactly one PartnerLedgerEntry",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async () => {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      await prepare(pool);
      await assertDirectMaterializationRejected(pool, "missing-ledger", { ledgerIndexes: [0, 1, 2, 3, 4, 5] });
    } finally {
      await pool.end();
    }
  },
);

test(
  "PostgreSQL persists and replays the complete Settlement financial slice",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async () => {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      const modules = await prepare(pool);
      const store = storeOf(modules, pool);
      const first = await modules.settleEvidencePersisted(input("persist"), store);
      const replay = await modules.settleEvidencePersisted(input("persist"), store);
      const restartedReplay = await modules.settleEvidencePersisted(input("persist"), storeOf(modules, pool));
      assert.equal(first.rights.length, 7);
      assert.equal(first.journalTransaction.debitTotal, "100.0000");
      assert.equal(first.journalTransaction.creditTotal, "100.0000");
      assert.strictEqual(replay.settlementCycle.settlementCycleId, first.settlementCycle.settlementCycleId);
      assert.strictEqual(restartedReplay.settlementCycle.settlementCycleId, first.settlementCycle.settlementCycleId);
      assert.equal((await pool.query("SELECT count(*)::int AS count FROM settlement_cycles WHERE campaign_id = $1", [first.settlementCycle.campaignId])).rows[0].count, 1);
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
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      const modules = await prepare(pool);
      const results = await Promise.all([
        modules.settleEvidencePersisted(input("concurrent"), storeOf(modules, pool)),
        modules.settleEvidencePersisted(input("concurrent"), storeOf(modules, pool)),
      ]);
      assert.equal(results[0].settlementCycle.settlementCycleId, results[1].settlementCycle.settlementCycleId);
      assert.equal((await pool.query("SELECT count(*)::int AS count FROM settlement_cycles WHERE campaign_id = $1", [results[0].settlementCycle.campaignId])).rows[0].count, 1);
    } finally {
      await pool.end();
    }
  },
);

test(
  "PostgreSQL adapter rejects every semantically divergent replay without a per-call validator",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async () => {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      const modules = await prepare(pool);
      const store = storeOf(modules, pool);
      const fixture = settleEvidence(input("direct"), new SettlementMemoryStore());
      await store.save(fixture);
      for (const [name, mutate] of [
        ["grossAmount", (value: SettlementResult) => (value.settlementCycle as any).grossAmount = "101.0000"],
        ["splitPolicyVersion", (value: SettlementResult) => (value.settlementCycle as any).splitPolicyVersion = "OTHER-POLICY"],
        ["destinationId", (value: SettlementResult) => (value.rights[2] as any).destinationId = "OTHER_DESTINATION"],
        ["amount", (value: SettlementResult) => (value.rights[2] as any).amount = "4.0000"],
      ] as const) {
        const divergent = structuredClone(fixture) as SettlementResult;
        mutate(divergent);
        await assert.rejects(() => store.save(divergent), /replay conflict|divergent/);
      }
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
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      const modules = await prepare(pool);
      const base = input("concurrent-divergent");
      const divergent = { ...base, destinations: { ...base.destinations, mostardaId: "OTHER_MOSTARDA" } };
      const results = await Promise.allSettled([
        modules.settleEvidencePersisted(base, storeOf(modules, pool)),
        modules.settleEvidencePersisted(divergent, storeOf(modules, pool)),
      ]);
      assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
      assert.equal(results.filter((result) => result.status === "rejected").length, 1);
      const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
      assert.match(String(rejected.reason), /destinationId|replay conflict/);
    } finally {
      await pool.end();
    }
  },
);

test(
  "PostgreSQL rolls back all materialization tables after a failure late in the transaction",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async () => {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      const modules = await prepare(pool);
      const fixture = settleEvidence(input("rollback"), new SettlementMemoryStore());
      const tampered = structuredClone(fixture) as SettlementResult;
      (tampered.ledgerEntries.at(-1) as any).destinationId = "";
      await assert.rejects(() => storeOf(modules, pool).save(tampered));
      const counts = [
        ["settlement_cycles", "SELECT count(*)::int AS count FROM settlement_cycles WHERE settlement_cycle_id = $1"],
        ["financial_rights", "SELECT count(*)::int AS count FROM financial_rights WHERE settlement_cycle_id = $1"],
        ["journal_transactions", "SELECT count(*)::int AS count FROM journal_transactions WHERE settlement_cycle_id = $1"],
        ["journal_lines", "SELECT count(*)::int AS count FROM journal_lines WHERE transaction_id = $1"],
        ["partner_ledger_entries", "SELECT count(*)::int AS count FROM partner_ledger_entries WHERE settlement_cycle_id = $1"],
      ] as const;
      for (const [table, query] of counts) {
        const id = table === "journal_lines" ? fixture.journalTransaction.transactionId : fixture.settlementCycle.settlementCycleId;
        assert.equal((await pool.query(query, [id])).rows[0].count, 0, table);
      }
    } finally {
      await pool.end();
    }
  },
);

test(
  "PostgreSQL protects one JournalTransaction per SettlementCycle and semantic child identity",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async () => {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      const modules = await prepare(pool);
      const fixture = await modules.settleEvidencePersisted(input("constraints"), storeOf(modules, pool));
      const cycle = fixture.settlementCycle;
      await assert.rejects(() => pool.query(
        `INSERT INTO journal_transactions (transaction_id, settlement_cycle_id, evidence_id, debit_total, credit_total)
         VALUES ($1, $2, $3, 100.0000, 100.0000)`,
        [`duplicate-journal-${runId}`, cycle.settlementCycleId, cycle.evidenceId],
      ), /unique|duplicate/i);
      await assert.rejects(() => pool.query(
        `INSERT INTO financial_rights (financial_right_id, split_share_id, settlement_cycle_id, line, destination_id, amount, evidence_id, split_policy_version, status)
         VALUES ($1, $2, $3, 'SELLER', 'SELLER', 1.0000, $4, $5, 'READY')`,
        [`bad-right-${runId}`, `bad-share-${runId}`, cycle.settlementCycleId, "WRONG-EVIDENCE", cycle.splitPolicyVersion],
      ), /semantic|evidence|violates/i);
      await assert.rejects(() => pool.query(
        `INSERT INTO journal_transactions (transaction_id, settlement_cycle_id, evidence_id, debit_total, credit_total)
         VALUES ($1, $2, 'WRONG-EVIDENCE', 100.0000, 100.0000)`,
        [`bad-journal-${runId}`, cycle.settlementCycleId],
      ), /semantic|evidence|violates/i);
      const other = await modules.settleEvidencePersisted(input("constraints-other"), storeOf(modules, pool));
      await assert.rejects(() => pool.query(
        `INSERT INTO journal_lines (journal_line_id, transaction_id, line_order, account_id, direction, amount, financial_right_id)
         VALUES ($1, $2, 99, 'MISMATCH', 'CREDIT', 1.0000, $3)`,
        [`bad-line-${runId}`, fixture.journalTransaction.transactionId, other.rights[0]!.financialRightId],
      ), /different SettlementCycle|unknown|semantic|violates/i);
      await assert.rejects(() => pool.query(
        `INSERT INTO partner_ledger_entries (ledger_entry_id, financial_right_id, split_share_id, settlement_cycle_id, evidence_id, destination_id, amount, journal_transaction_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')`,
        [`bad-ledger-${runId}`, fixture.rights[0]!.financialRightId, fixture.rights[0]!.splitShareId,
          cycle.settlementCycleId, cycle.evidenceId, fixture.rights[0]!.destinationId, "99.0000", fixture.journalTransaction.transactionId],
      ), /semantic|amount|violates/i);
      await assert.rejects(
        () => pool.query("UPDATE settlement_cycles SET gross_amount = 101.0000 WHERE settlement_cycle_id = $1", [cycle.settlementCycleId]),
        /append-only/i,
      );
      await assert.rejects(
        () => pool.query("DELETE FROM settlement_cycles WHERE settlement_cycle_id = $1", [cycle.settlementCycleId]),
        /append-only/i,
      );
      await assert.rejects(() => pool.query("TRUNCATE settlement_cycles, financial_rights, journal_transactions, journal_lines, partner_ledger_entries CASCADE"), /append-only/i);
    } finally {
      await pool.end();
    }
  },
);

test(
  "migration 007 rejects unbalanced journals, orphan rows and preserves transaction rollback",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async () => {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      await prepare(pool);
      const cycleId = `migration-cycle-${runId}`;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `INSERT INTO settlement_cycles (settlement_cycle_id, campaign_id, evidence_id, gross_amount, split_policy_version, status)
           VALUES ($1, $2, $3, 1.0000, 'POLICY', 'CLOSED')`,
          [cycleId, `CAMPAIGN-${runId}`, `EVIDENCE-${runId}`],
        );
        await client.query("ROLLBACK");
      } finally {
        client.release();
      }
      assert.equal((await pool.query("SELECT count(*)::int AS count FROM settlement_cycles WHERE settlement_cycle_id = $1", [cycleId])).rows[0].count, 0);
      await assert.rejects(() => pool.query(
        `INSERT INTO financial_rights (financial_right_id, split_share_id, settlement_cycle_id, line, destination_id, amount, evidence_id, split_policy_version, status)
         VALUES ($1, $2, 'missing-cycle', 'SELLER', 'SELLER', 1.0000, 'EVIDENCE', 'POLICY', 'READY')`,
        [`orphan-right-${runId}`, `orphan-share-${runId}`],
      ), /foreign key|semantic|unknown|violates/i);
      await pool.query(
        `INSERT INTO settlement_cycles (settlement_cycle_id, campaign_id, evidence_id, gross_amount, split_policy_version, status)
         VALUES ($1, $2, $3, 1.0000, 'POLICY', 'CLOSED')`,
        [`unbalanced-cycle-${runId}`, `UNBALANCED-${runId}`, `UNBALANCED-EVIDENCE-${runId}`],
      );
      await assert.rejects(() => pool.query(
        `INSERT INTO journal_transactions (transaction_id, settlement_cycle_id, evidence_id, debit_total, credit_total)
         VALUES ($1, $2, $3, 1.0000, 2.0000)`,
        [`unbalanced-journal-${runId}`, `unbalanced-cycle-${runId}`, `UNBALANCED-EVIDENCE-${runId}`],
      ), /check constraint|semantic|gross|violates/i);
    } finally {
      await pool.end();
    }
  },
);

test(
  "PostgreSQL enforces Journal gross equality and FinancialRight line amounts",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async () => {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      const modules = await prepare(pool);

      const grossCycle = input("gross-invariant");
      await pool.query(
        `INSERT INTO settlement_cycles (settlement_cycle_id, campaign_id, evidence_id, gross_amount, split_policy_version, status)
         VALUES ($1, $2, $3, 100.0000, 'SPLIT-PERFORMANCE-RESIDUAL-V1', 'CLOSED')`,
        [`gross-cycle-${runId}`, grossCycle.campaignId, grossCycle.evidence.evidenceId],
      );
      await assert.rejects(() => pool.query(
        `INSERT INTO journal_transactions (transaction_id, settlement_cycle_id, evidence_id, debit_total, credit_total)
         VALUES ($1, $2, $3, 1.0000, 1.0000)`,
        [`gross-balanced-wrong-${runId}`, `gross-cycle-${runId}`, grossCycle.evidence.evidenceId],
      ), /gross|SettlementCycle|semantic|violates/i);
      await assert.rejects(() => pool.query(
        `INSERT INTO journal_transactions (transaction_id, settlement_cycle_id, evidence_id, debit_total, credit_total)
         VALUES ($1, $2, $3, 1.0000, 2.0000)`,
        [`gross-unbalanced-wrong-${runId}`, `gross-cycle-${runId}`, grossCycle.evidence.evidenceId],
      ), /gross|balance|check|violates|semantic/i);

      const mismatch = await modules.settleEvidencePersisted(
        input("line-invariant"),
        storeOf(modules, pool),
      );
      const mismatchJournal = mismatch.journalTransaction.transactionId;
      const mismatchRight = mismatch.rights[0]!.financialRightId;
      const debitWithRightClient = await pool.connect();
      try {
        await debitWithRightClient.query("BEGIN");
        await assert.rejects(
          () => debitWithRightClient.query(
            `INSERT INTO journal_lines (journal_line_id, transaction_id, line_order, account_id, direction, amount, financial_right_id)
             VALUES ($1, $2, 0, 'CAMPAIGN', 'DEBIT', 20.0000, $3)`,
            [`line-debit-linked-${runId}`, mismatchJournal, mismatchRight],
          ),
          /CREDIT|FinancialRight|semantic|violates/i,
        );
        await debitWithRightClient.query("ROLLBACK");
      } finally {
        debitWithRightClient.release();
      }
      const mismatchClient = await pool.connect();
      try {
        await mismatchClient.query("BEGIN");
        await assert.rejects(
          () => mismatchClient.query(
            `INSERT INTO journal_lines (journal_line_id, transaction_id, line_order, account_id, direction, amount, financial_right_id)
             VALUES ($1, $2, 0, 'CAMPAIGN', 'DEBIT', 100.0000, NULL),
                    ($3, $2, 1, 'SELLER', 'CREDIT', 19.0000, $4),
                    ($5, $2, 2, 'OTHER', 'CREDIT', 81.0000, NULL)`,
            [`line-debit-${runId}`, mismatchJournal, `line-credit-wrong-${runId}`, mismatchRight, `line-credit-extra-${runId}`],
          ),
          /amount|FinancialRight|semantic|violates/i,
        );
        await mismatchClient.query("ROLLBACK");
      } finally {
        mismatchClient.release();
      }

      const accepted = await modules.settleEvidencePersisted(
        input("line-invariant-accepted"),
        storeOf(modules, pool),
      );
      const acceptedLines = await pool.query(
        `SELECT count(*)::int AS count
           FROM journal_lines
          WHERE transaction_id = $1
            AND financial_right_id IS NOT NULL
            AND direction = 'CREDIT'`,
        [accepted.journalTransaction.transactionId],
      );
      assert.equal(acceptedLines.rows[0].count, 7);
    } finally {
      await pool.end();
    }
  },
);
