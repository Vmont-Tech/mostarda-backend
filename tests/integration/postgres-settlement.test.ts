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
  await applySqlMigration(pool, new URL("../../migrations/008_settlement_integrity_hardening.sql", import.meta.url));
  await applySqlMigration(pool, new URL("../../migrations/009_settlement_split_results.sql", import.meta.url));
  await applySqlMigration(pool, new URL("../../migrations/010_b002_split_result_hardening.sql", import.meta.url));
  return settlementModules();
}

function storeOf(modules: any, pool: any): any {
  return new modules.PostgresSettlementStore(pool);
}

const directRightAmounts = ["20.0000", "20.0000", "5.0000", "15.0000", "3.0000", "7.0000", "30.0000"] as const;
const directRightLines = [
  "TV_OWNER",
  "SPACE_OWNER",
  "SELLER",
  "SELLER_ACQUISITION_FUND",
  "INFLUENCER",
  "INFLUENCER_ACQUISITION_FUND",
  "MOSTARDA",
] as const;
const directRightBps = [2000, 2000, 500, 1500, 300, 700, 3000] as const;

type DirectMaterializationOptions = {
  readonly rightIndexes?: readonly number[];
  readonly lineIndexes?: readonly number[];
  readonly ledgerIndexes?: readonly number[];
  readonly rightAmountOverrides?: Readonly<Record<number, string>>;
};

async function insertDirectMaterialization(
  client: any,
  label: string,
  options: DirectMaterializationOptions = {},
): Promise<void> {
  const rights = options.rightIndexes ?? [0, 1, 2, 3, 4, 5, 6];
  const lines = options.lineIndexes ?? rights;
  const ledgers = options.ledgerIndexes ?? rights;
  const amountFor = (index: number) => options.rightAmountOverrides?.[index] ?? directRightAmounts[index]!;
  const cycleId = `structural-cycle-${runId}-${label}`;
  const evidenceId = `structural-evidence-${runId}-${label}`;
  const campaignId = `structural-campaign-${runId}-${label}`;
  const journalId = `structural-journal-${runId}-${label}`;

  await client.query(
    `INSERT INTO settlement_cycles (settlement_cycle_id, campaign_id, evidence_id, gross_amount, split_policy_version, status)
     VALUES ($1, $2, $3, 100.0000, 'SPLIT-PERFORMANCE-RESIDUAL-V1', 'CLOSED')`,
    [cycleId, campaignId, evidenceId],
  );
  for (const index of [0, 1, 2, 3, 4, 5, 6]) {
    await client.query(
      `INSERT INTO settlement_split_results (
         split_share_id, settlement_cycle_id, line, destination_id,
         basis_points, amount, evidence_id, split_policy_version
       ) VALUES ($1, $2, $3, $4, $5, $6::numeric, $7, 'SPLIT-PERFORMANCE-RESIDUAL-V1')`,
      [`structural-share-${runId}-${label}-${index}`, cycleId, directRightLines[index],
        `DESTINATION_${index}`, directRightBps[index], amountFor(index), evidenceId],
    );
  }
  for (const index of rights) {
    await client.query(
      `INSERT INTO financial_rights (financial_right_id, split_share_id, settlement_cycle_id, line, destination_id, amount, evidence_id, split_policy_version, status)
       VALUES ($1, $2, $3, $4, $5, $6::numeric, $7, 'SPLIT-PERFORMANCE-RESIDUAL-V1', 'READY')`,
      [`structural-right-${runId}-${label}-${index}`, `structural-share-${runId}-${label}-${index}`, cycleId,
        directRightLines[index], `DESTINATION_${index}`, amountFor(index), evidenceId],
    );
  }
  await client.query(
    `INSERT INTO journal_transactions (transaction_id, settlement_cycle_id, evidence_id, debit_total, credit_total)
     VALUES ($1, $2, $3, 100.0000, 100.0000)`,
    [journalId, cycleId, evidenceId],
  );

  const linkedCredit = lines.reduce((total, index) => total + Number(amountFor(index)), 0);
  const values: string[] = ["($1, $2, 0, 'CAMPAIGN', 'DEBIT', 100.0000, NULL)"];
  const params: unknown[] = [`structural-debit-${runId}-${label}`, journalId];
  for (const [lineOrder, index] of lines.entries()) {
    const base = params.length + 1;
    values.push(`($${base}, $2, ${lineOrder + 1}, $${base + 1}, 'CREDIT', $${base + 2}::numeric, $${base + 3})`);
    params.push(
      `structural-line-${runId}-${label}-${lineOrder}`,
      `DESTINATION_${index}`,
      amountFor(index),
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
        amountFor(index), journalId],
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
    await assert.rejects(() => client.query("COMMIT"), /JournalLine|FinancialRight|Ledger|SplitShare|seven|complete|materializ|right|journal/i);
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
  "PostgreSQL rejects a materialized Settlement missing a positive FinancialRight",
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
  "PostgreSQL rejects a duplicate normative SplitShare line in one SettlementCycle",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async () => {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: databaseUrl });
    const client = await pool.connect();
    try {
      await prepare(pool);
      await client.query("BEGIN");
      const cycleId = `duplicate-line-cycle-${runId}`;
      const evidenceId = `duplicate-line-evidence-${runId}`;
      await client.query(
        `INSERT INTO settlement_cycles (settlement_cycle_id, campaign_id, evidence_id, gross_amount, split_policy_version, status)
         VALUES ($1, $2, $3, 100.0000, 'SPLIT-PERFORMANCE-RESIDUAL-V1', 'CLOSED')`,
        [cycleId, `duplicate-line-campaign-${runId}`, evidenceId],
      );
      await client.query(
        `INSERT INTO settlement_split_results (
           split_share_id, settlement_cycle_id, line, destination_id,
           basis_points, amount, evidence_id, split_policy_version
         ) VALUES ($1, $2, 'TV_OWNER', 'TV_OWNER_A', 2000, 20.0000, $3, 'SPLIT-PERFORMANCE-RESIDUAL-V1')`,
        [`duplicate-line-share-a-${runId}`, cycleId, evidenceId],
      );
      await client.query(
        `INSERT INTO financial_rights (financial_right_id, split_share_id, settlement_cycle_id, line, destination_id, amount, evidence_id, split_policy_version, status)
         VALUES ($1, $2, $3, 'TV_OWNER', 'TV_OWNER_A', 20.0000, $4, 'SPLIT-PERFORMANCE-RESIDUAL-V1', 'READY')`,
        [`duplicate-line-right-a-${runId}`, `duplicate-line-share-a-${runId}`, cycleId, evidenceId],
      );
      await assert.rejects(
        () => client.query(
          `INSERT INTO settlement_split_results (
             split_share_id, settlement_cycle_id, line, destination_id,
             basis_points, amount, evidence_id, split_policy_version
           ) VALUES ($1, $2, 'TV_OWNER', 'OTHER_TV', 2000, 20.0000, $3, 'SPLIT-PERFORMANCE-RESIDUAL-V1')`,
          [`duplicate-line-share-b-${runId}`, cycleId, evidenceId],
        ),
        /unique|duplicate|line|violates/i,
      );
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
      await pool.end();
    }
  },
);

test(
  "PostgreSQL rejects a substituted non-normative SplitShare line",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async () => {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: databaseUrl });
    const client = await pool.connect();
    try {
      await prepare(pool);
      await client.query("BEGIN");
      const cycleId = `substituted-line-cycle-${runId}`;
      const evidenceId = `substituted-line-evidence-${runId}`;
      await client.query(
        `INSERT INTO settlement_cycles (settlement_cycle_id, campaign_id, evidence_id, gross_amount, split_policy_version, status)
         VALUES ($1, $2, $3, 100.0000, 'SPLIT-PERFORMANCE-RESIDUAL-V1', 'CLOSED')`,
        [cycleId, `substituted-line-campaign-${runId}`, evidenceId],
      );
      await assert.rejects(
        () => client.query(
          `INSERT INTO settlement_split_results (
             split_share_id, settlement_cycle_id, line, destination_id,
             basis_points, amount, evidence_id, split_policy_version
           ) VALUES ($1, $2, 'UNAUTHORIZED_LINE', 'OTHER', 100, 1.0000, $3, 'SPLIT-PERFORMANCE-RESIDUAL-V1')`,
          [`substituted-line-share-${runId}`, cycleId, evidenceId],
        ),
        /check|normative|line|violates/i,
      );
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
      await pool.end();
    }
  },
);

test(
  "PostgreSQL persists exactly the seven normative FinancialRight lines once each",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async () => {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      const modules = await prepare(pool);
      const fixture = await modules.settleEvidencePersisted(input("exact-normative-lines"), storeOf(modules, pool));
      const rows = await pool.query<{ line: string; count: number }>(
        `SELECT line, count(*)::int AS count
           FROM financial_rights
          WHERE settlement_cycle_id = $1
          GROUP BY line
          ORDER BY line`,
        [fixture.settlementCycle.settlementCycleId],
      );
      assert.deepEqual(rows.rows, directRightLines.slice().sort().map((line) => ({ line, count: 1 })));
      assert.equal(rows.rows.length, 7);
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
      assert.equal(first.splitShares.length, 7);
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
  "PostgreSQL persists seven SplitShare results but only positive financial materialization",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async () => {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      const modules = await prepare(pool);
      const tiny = await modules.settleEvidencePersisted(
        { ...input("b002-quantized"), grossAmount: "0.0001" },
        storeOf(modules, pool),
      );
      assert.equal(tiny.splitShares.length, 7);
      assert.ok(tiny.splitShares.some((share: any) => share.amount === "0.0000"));
      assert.ok(tiny.rights.length < tiny.splitShares.length);
      assert.equal(tiny.journalTransaction.lines.some((line: any) => line.amount === "0.0000"), false);
      assert.equal(tiny.ledgerEntries.some((entry: any) => entry.amount === "0.0000"), false);
      assert.equal((await pool.query(
        "SELECT count(*)::int AS count FROM settlement_split_results WHERE settlement_cycle_id = $1",
        [tiny.settlementCycle.settlementCycleId],
      )).rows[0].count, 7);
      assert.equal((await pool.query(
        "SELECT count(*)::int AS count FROM financial_rights WHERE settlement_cycle_id = $1",
        [tiny.settlementCycle.settlementCycleId],
      )).rows[0].count, tiny.rights.length);
      assert.equal((await pool.query(
        "SELECT count(*)::int AS count FROM journal_lines WHERE transaction_id = $1 AND amount = 0",
        [tiny.journalTransaction.transactionId],
      )).rows[0].count, 0);
    } finally {
      await pool.end();
    }
  },
);

test(
  "PostgreSQL rejects gross zero before any Settlement materialization",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async () => {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      const modules = await prepare(pool);
      await assert.rejects(
        () => modules.settleEvidencePersisted(
          { ...input("b002-gross-zero"), grossAmount: "0.0000" },
          storeOf(modules, pool),
        ),
        /greater than zero/,
      );
      assert.equal((await pool.query(
        "SELECT count(*)::int AS count FROM settlement_cycles WHERE campaign_id = $1",
        [`C-${runId}-b002-gross-zero`],
      )).rows[0].count, 0);
    } finally {
      await pool.end();
    }
  },
);

test(
  "PostgreSQL rejects zero FinancialRight, JournalLine, and PartnerLedgerEntry amounts",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async () => {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      const modules = await prepare(pool);
      const fixture = await modules.settleEvidencePersisted(
        { ...input("b002-zero-sql"), grossAmount: "0.0001" },
        storeOf(modules, pool),
      );
      const zeroShare = fixture.splitShares.find((share: any) => share.amount === "0.0000");
      assert.ok(zeroShare);
      await assert.rejects(() => pool.query(
        `INSERT INTO financial_rights (
           financial_right_id, split_share_id, settlement_cycle_id, line,
           destination_id, amount, evidence_id, split_policy_version, status
         ) VALUES ($1, $2, $3, $4, $5, 0.0000, $6, $7, 'READY')`,
        [`b002-zero-right-${runId}`, zeroShare!.splitShareId, fixture.settlementCycle.settlementCycleId,
          zeroShare!.line, zeroShare!.destinationId, fixture.settlementCycle.evidenceId,
          fixture.settlementCycle.splitPolicyVersion],
      ), /positive|check|violates|amount must match/i);
      await assert.rejects(() => pool.query(
        `INSERT INTO journal_lines (
           journal_line_id, transaction_id, line_order, account_id,
           direction, amount, financial_right_id
         ) VALUES ($1, $2, 99, 'ZERO', 'CREDIT', 0.0000, $3)`,
        [`b002-zero-line-${runId}`, fixture.journalTransaction.transactionId, fixture.rights[0]!.financialRightId],
      ), /positive|check|violates|amount must match/i);
      await assert.rejects(() => pool.query(
        `INSERT INTO partner_ledger_entries (
           ledger_entry_id, financial_right_id, split_share_id,
           settlement_cycle_id, evidence_id, destination_id, amount,
           journal_transaction_id, status
         ) VALUES ($1, $2, $3, $4, $5, $6, 0.0000, $7, 'PENDING')`,
        [`b002-zero-ledger-${runId}`, fixture.rights[0]!.financialRightId, fixture.rights[0]!.splitShareId,
          fixture.settlementCycle.settlementCycleId, fixture.settlementCycle.evidenceId,
          fixture.rights[0]!.destinationId, fixture.journalTransaction.transactionId],
      ), /positive|check|violates|semantic|identity/i);
    } finally {
      await pool.end();
    }
  },
);

test(
  "PostgreSQL rejects zero-basis-point financial materialization while preserving zero results",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async () => {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: databaseUrl });
    const client = await pool.connect();
    try {
      await prepare(pool);
      const cycleId = `b002-zero-bps-cycle-${runId}`;
      const evidenceId = `b002-zero-bps-evidence-${runId}`;
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO settlement_cycles (settlement_cycle_id, campaign_id, evidence_id, gross_amount, split_policy_version, status)
         VALUES ($1, $2, $3, 100.0000, 'SPLIT-PERFORMANCE-RESIDUAL-V1', 'CLOSED')`,
        [cycleId, `b002-zero-bps-campaign-${runId}`, evidenceId],
      );

      const zeroResult = `b002-zero-bps-zero-${runId}`;
      await client.query(
        `INSERT INTO settlement_split_results (
           split_share_id, settlement_cycle_id, line, destination_id,
           basis_points, amount, evidence_id, split_policy_version
         ) VALUES ($1, $2, 'TV_OWNER', 'TV_OWNER', 0, 0.0000, $3, 'SPLIT-PERFORMANCE-RESIDUAL-V1')`,
        [zeroResult, cycleId, evidenceId],
      );

      await client.query("SAVEPOINT zero_bps_right");
      await assert.rejects(
        () => client.query(
          `INSERT INTO financial_rights (
             financial_right_id, split_share_id, settlement_cycle_id, line,
             destination_id, amount, evidence_id, split_policy_version, status
           ) VALUES ($1, $2, $3, 'TV_OWNER', 'TV_OWNER', 20.0000, $4, 'SPLIT-PERFORMANCE-RESIDUAL-V1', 'READY')`,
          [`b002-zero-bps-right-${runId}`, zeroResult, cycleId, evidenceId],
        ),
        /basis|zero|positive|match|violates/i,
      );
      await client.query("ROLLBACK TO SAVEPOINT zero_bps_right");

      await client.query("SAVEPOINT zero_bps_positive_split");
      await assert.rejects(
        () => client.query(
          `INSERT INTO settlement_split_results (
             split_share_id, settlement_cycle_id, line, destination_id,
             basis_points, amount, evidence_id, split_policy_version
           ) VALUES ($1, $2, 'SPACE_OWNER', 'SPACE_OWNER', 0, 20.0000, $3, 'SPLIT-PERFORMANCE-RESIDUAL-V1')`,
          [`b002-zero-bps-positive-${runId}`, cycleId, evidenceId],
        ),
        /basis|zero|amount|positive|violates/i,
      );
      await client.query("ROLLBACK TO SAVEPOINT zero_bps_positive_split");

      const quantizedResult = `b002-positive-bps-zero-${runId}`;
      await client.query(
        `INSERT INTO settlement_split_results (
           split_share_id, settlement_cycle_id, line, destination_id,
           basis_points, amount, evidence_id, split_policy_version
         ) VALUES ($1, $2, 'SELLER', 'SELLER', 500, 0.0000, $3, 'SPLIT-PERFORMANCE-RESIDUAL-V1')`,
        [quantizedResult, cycleId, evidenceId],
      );
      await client.query("SAVEPOINT positive_bps_zero_right");
      await assert.rejects(
        () => client.query(
          `INSERT INTO financial_rights (
             financial_right_id, split_share_id, settlement_cycle_id, line,
             destination_id, amount, evidence_id, split_policy_version, status
           ) VALUES ($1, $2, $3, 'SELLER', 'SELLER', 0.0001, $4, 'SPLIT-PERFORMANCE-RESIDUAL-V1', 'READY')`,
          [`b002-positive-bps-zero-right-${runId}`, quantizedResult, cycleId, evidenceId],
        ),
        /amount|match|positive|violates/i,
      );
      await client.query("ROLLBACK TO SAVEPOINT positive_bps_zero_right");
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
      await pool.end();
    }
  },
);

test(
  "PostgreSQL rejects SplitShare identity divergent from its SettlementCycle",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async () => {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: databaseUrl });
    const client = await pool.connect();
    try {
      await prepare(pool);
      for (const [label, evidenceId, policyVersion] of [
        ["evidence", `WRONG-EVIDENCE-${runId}`, "SPLIT-PERFORMANCE-RESIDUAL-V1"],
        ["policy", `b002-identity-evidence-${runId}`, "WRONG-POLICY"],
        ["both", `WRONG-EVIDENCE-BOTH-${runId}`, "WRONG-POLICY-BOTH"],
      ] as const) {
        const cycleId = `b002-identity-cycle-${runId}-${label}`;
        const cycleEvidence = `b002-identity-evidence-${runId}-${label}`;
        await client.query("BEGIN");
        await client.query(
          `INSERT INTO settlement_cycles (settlement_cycle_id, campaign_id, evidence_id, gross_amount, split_policy_version, status)
           VALUES ($1, $2, $3, 100.0000, 'SPLIT-PERFORMANCE-RESIDUAL-V1', 'CLOSED')`,
          [cycleId, `b002-identity-campaign-${runId}-${label}`, cycleEvidence],
        );
        await assert.rejects(
          () => client.query(
            `INSERT INTO settlement_split_results (
               split_share_id, settlement_cycle_id, line, destination_id,
               basis_points, amount, evidence_id, split_policy_version
             ) VALUES ($1, $2, 'TV_OWNER', 'TV_OWNER', 0, 0.0000, $3, $4)`,
            [`b002-identity-share-${runId}-${label}`, cycleId, evidenceId, policyVersion],
          ),
          /identity|evidence|policy|cycle|semantic|match|violates/i,
        );
        await client.query("ROLLBACK");
      }
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
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
        ["settlement_split_results", "SELECT count(*)::int AS count FROM settlement_split_results WHERE settlement_cycle_id = $1"],
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
      await assert.rejects(() => pool.query("TRUNCATE settlement_cycles, settlement_split_results, financial_rights, journal_transactions, journal_lines, partner_ledger_entries CASCADE"), /append-only/i);
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
      const invalidClient = await pool.connect();
      try {
        await invalidClient.query("BEGIN");
        await invalidClient.query(
          `INSERT INTO settlement_cycles (settlement_cycle_id, campaign_id, evidence_id, gross_amount, split_policy_version, status)
           VALUES ($1, $2, $3, 1.0000, 'POLICY', 'CLOSED')`,
          [`unbalanced-cycle-${runId}`, `UNBALANCED-${runId}`, `UNBALANCED-EVIDENCE-${runId}`],
        );
        await assert.rejects(() => invalidClient.query(
          `INSERT INTO journal_transactions (transaction_id, settlement_cycle_id, evidence_id, debit_total, credit_total)
           VALUES ($1, $2, $3, 1.0000, 2.0000)`,
          [`unbalanced-journal-${runId}`, `unbalanced-cycle-${runId}`, `UNBALANCED-EVIDENCE-${runId}`],
        ), /check constraint|semantic|gross|violates/i);
        await invalidClient.query("ROLLBACK");
      } finally {
        invalidClient.release();
      }
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
      const grossClient = await pool.connect();
      try {
        await grossClient.query("BEGIN");
        await grossClient.query(
          `INSERT INTO settlement_cycles (settlement_cycle_id, campaign_id, evidence_id, gross_amount, split_policy_version, status)
           VALUES ($1, $2, $3, 100.0000, 'SPLIT-PERFORMANCE-RESIDUAL-V1', 'CLOSED')`,
          [`gross-cycle-${runId}`, grossCycle.campaignId, grossCycle.evidence.evidenceId],
        );
        await assert.rejects(() => grossClient.query(
          `INSERT INTO journal_transactions (transaction_id, settlement_cycle_id, evidence_id, debit_total, credit_total)
           VALUES ($1, $2, $3, 1.0000, 1.0000)`,
          [`gross-balanced-wrong-${runId}`, `gross-cycle-${runId}`, grossCycle.evidence.evidenceId],
        ), /gross|SettlementCycle|semantic|violates/i);
        await grossClient.query("ROLLBACK");
      } finally {
        grossClient.release();
      }

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

test(
  "PostgreSQL rejects direct SQL when FinancialRights do not conserve gross",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async () => {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      await prepare(pool);
      await assertDirectMaterializationRejected(pool, "direct-conservation-mismatch", {
        rightAmountOverrides: { 0: "19.0000" },
      });
    } finally {
      await pool.end();
    }
  },
);

test(
  "PostgreSQL rejects a CLOSED cycle that is not fully materialized",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async () => {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      await prepare(pool);
      await assert.rejects(
        () => pool.query(
          `INSERT INTO settlement_cycles (settlement_cycle_id, campaign_id, evidence_id, gross_amount, split_policy_version, status)
           VALUES ($1, $2, $3, 100.0000, 'SPLIT-PERFORMANCE-RESIDUAL-V1', 'CLOSED')`,
          [`bare-closed-${runId}`, `bare-campaign-${runId}`, `bare-evidence-${runId}`],
        ),
        /materializ|Journal|seven|complete/i,
      );
    } finally {
      await pool.end();
    }
  },
);

test(
  "PostgreSQL rejects a balanced journal whose rights do not conserve the cycle gross",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async () => {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      const modules = await prepare(pool);
      const fixture = settleEvidence(input("conservation-source"), new SettlementMemoryStore());
      const tampered = structuredClone(fixture) as SettlementResult;
      (tampered.rights[0] as any).amount = "19.0000";
      (tampered.journalTransaction.lines[1] as any).amount = "19.0000";
      (tampered.ledgerEntries[0] as any).amount = "19.0000";
      (tampered.journalTransaction.lines[2] as any).financialRightId = undefined;
      (tampered.journalTransaction.lines[2] as any).accountId = "UNLINKED";
      (tampered.journalTransaction.lines[2] as any).amount = "21.0000";
      await assert.rejects(() => storeOf(modules, pool).save(tampered), /gross|conserv|replay|materializ|JournalLine|SplitShare|semantic|credit/i);
    } finally {
      await pool.end();
    }
  },
);

test(
  "PostgreSQL rejects an unlinked CREDIT even when the Journal remains balanced",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async () => {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      const modules = await prepare(pool);
      const fixture = settleEvidence(input("unlinked-credit"), new SettlementMemoryStore());
      const tampered = structuredClone(fixture) as SettlementResult;
      (tampered.journalTransaction.lines[1] as any).financialRightId = undefined;
      (tampered.journalTransaction.lines[1] as any).accountId = "UNLINKED";
      await assert.rejects(() => storeOf(modules, pool).save(tampered), /credit|FinancialRight|materializ|linked/i);
    } finally {
      await pool.end();
    }
  },
);

test(
  "PostgreSQL uses DECIMAL(18,4) for the Settlement monetary columns",
  { skip: databaseUrl === undefined ? "DATABASE_URL is not available" : false },
  async () => {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      const modules = await prepare(pool);
      const columns = await pool.query<{ table_name: string; column_name: string; numeric_precision: number; numeric_scale: number }>(
        `SELECT table_name, column_name, numeric_precision, numeric_scale
           FROM information_schema.columns
          WHERE table_schema = 'public'
            AND (table_name, column_name) IN (
              ('settlement_cycles', 'gross_amount'),
              ('financial_rights', 'amount'),
              ('journal_transactions', 'debit_total'),
              ('journal_transactions', 'credit_total'),
              ('journal_lines', 'amount'),
              ('partner_ledger_entries', 'amount')
            )
          ORDER BY table_name, column_name`,
      );
      assert.equal(columns.rows.length, 6);
      for (const column of columns.rows) {
        assert.equal(column.numeric_precision, 18, `${column.table_name}.${column.column_name}`);
        assert.equal(column.numeric_scale, 4, `${column.table_name}.${column.column_name}`);
      }

      const maxInput = { ...input("decimal-max"), grossAmount: "99999999999999.9999" };
      const maxResult = await modules.settleEvidencePersisted(maxInput, storeOf(modules, pool));
      assert.equal(maxResult.settlementCycle.grossAmount, "99999999999999.9999");
      await assert.rejects(
        () => modules.settleEvidencePersisted(
          { ...input("decimal-overflow"), grossAmount: "100000000000000.0000" },
          storeOf(modules, pool),
        ),
        /DECIMAL\(18,4\)|numeric field overflow|Gross settlement amount/,
      );
    } finally {
      await pool.end();
    }
  },
);
