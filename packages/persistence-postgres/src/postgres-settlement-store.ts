import type { Pool, PoolClient } from "pg";

interface SettlementRow {
  settlement_cycle_id: string;
  campaign_id: string;
  evidence_id: string;
  gross_amount: string;
  split_policy_version: string;
  status: "CLOSED";
}

interface RightRow {
  financial_right_id: string;
  split_share_id: string;
  line: string;
  destination_id: string;
  amount: string;
  evidence_id: string;
  settlement_cycle_id: string;
  split_policy_version: string;
  status: "READY";
}

interface JournalRow {
  transaction_id: string;
  settlement_cycle_id: string;
  evidence_id: string;
  debit_total: string;
  credit_total: string;
}

interface JournalLineRow {
  journal_line_id: string;
  account_id: string;
  direction: "DEBIT" | "CREDIT";
  amount: string;
  financial_right_id: string | null;
  line_order: number;
}

interface LedgerRow {
  ledger_entry_id: string;
  financial_right_id: string;
  split_share_id: string;
  evidence_id: string;
  settlement_cycle_id: string;
  destination_id: string;
  amount: string;
  journal_transaction_id: string;
  status: "PENDING";
}

/**
 * PostgreSQL adapter for the Settlement materialization port. The generic
 * keeps this infrastructure package independent from the Settlement domain
 * package; the caller supplies the domain result shape at compile time.
 */
export class PostgresSettlementStore<TSettlement extends object> {
  readonly #pool: Pool;
  public constructor(pool: Pool) {
    this.#pool = pool;
  }

  public async findByEvidence(
    campaignId: string,
    evidenceId: string,
  ): Promise<TSettlement | undefined> {
    const result = await this.#pool.query<SettlementRow>(
      `SELECT settlement_cycle_id, campaign_id, evidence_id,
              gross_amount::text, split_policy_version, status
         FROM settlement_cycles
        WHERE campaign_id = $1 AND evidence_id = $2`,
      [campaignId, evidenceId],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : this.#loadResult(this.#pool, row);
  }

  public async save(
    result: TSettlement,
  ): Promise<TSettlement> {
    const value = result as any;
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query(
        `INSERT INTO settlement_cycles (
           settlement_cycle_id, campaign_id, evidence_id, gross_amount,
           split_policy_version, status
         ) VALUES ($1, $2, $3, $4::numeric, $5, $6)
         ON CONFLICT (campaign_id, evidence_id) DO NOTHING
         RETURNING settlement_cycle_id`,
        [
          value.settlementCycle.settlementCycleId,
          value.settlementCycle.campaignId,
          value.settlementCycle.evidenceId,
          value.settlementCycle.grossAmount,
          value.settlementCycle.splitPolicyVersion,
          value.settlementCycle.status,
        ],
      );

      if (inserted.rowCount === 0) {
        const existing = await client.query<SettlementRow>(
          `SELECT settlement_cycle_id, campaign_id, evidence_id,
                  gross_amount::text, split_policy_version, status
             FROM settlement_cycles
            WHERE campaign_id = $1 AND evidence_id = $2
            FOR SHARE`,
          [value.settlementCycle.campaignId, value.settlementCycle.evidenceId],
        );
        const row = existing.rows[0];
        if (row === undefined) throw new Error("Persisted Settlement disappeared after conflict.");
        const replay = await this.#loadResult(client, row);
        assertPersistedReplayEquivalent(replay, result);
        await client.query("COMMIT");
        return replay;
      }

      for (const right of value.rights) {
        await client.query(
          `INSERT INTO financial_rights (
             financial_right_id, split_share_id, settlement_cycle_id, line,
             destination_id, amount, evidence_id, split_policy_version, status
           ) VALUES ($1, $2, $3, $4, $5, $6::numeric, $7, $8, $9)`,
          [right.financialRightId, right.splitShareId, right.settlementCycleId, right.line,
            right.destinationId, right.amount, right.evidenceId, right.splitPolicyVersion, right.status],
        );
      }

      const journal = value.journalTransaction;
      await client.query(
        `INSERT INTO journal_transactions (
           transaction_id, settlement_cycle_id, evidence_id, debit_total,
           credit_total
         ) VALUES ($1, $2, $3, $4::numeric, $5::numeric)`,
        [journal.transactionId, journal.settlementCycleId, journal.evidenceId,
          journal.debitTotal, journal.creditTotal],
      );
      for (const [lineOrder, line] of journal.lines.entries()) {
        await client.query(
          `INSERT INTO journal_lines (
             journal_line_id, transaction_id, line_order, account_id,
             direction, amount, financial_right_id
           ) VALUES ($1, $2, $3, $4, $5, $6::numeric, $7)`,
          [line.journalLineId, journal.transactionId, lineOrder, line.accountId,
            line.direction, line.amount, line.financialRightId ?? null],
        );
      }
      for (const entry of value.ledgerEntries) {
        await client.query(
          `INSERT INTO partner_ledger_entries (
             ledger_entry_id, financial_right_id, split_share_id,
             settlement_cycle_id, evidence_id, destination_id, amount,
             journal_transaction_id, status
           ) VALUES ($1, $2, $3, $4, $5, $6, $7::numeric, $8, $9)`,
          [entry.ledgerEntryId, entry.financialRightId, entry.splitShareId,
            entry.settlementCycleId, entry.evidenceId, entry.destinationId,
            entry.amount, entry.journalTransactionId, entry.status],
        );
      }
      await client.query("COMMIT");
      return value;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async #loadResult(client: Pool | PoolClient, cycle: SettlementRow): Promise<TSettlement> {
    const rights = await client.query<RightRow>(
      `SELECT financial_right_id, split_share_id, line, destination_id,
              amount::text, evidence_id, settlement_cycle_id,
              split_policy_version, status
         FROM financial_rights
        WHERE settlement_cycle_id = $1
        ORDER BY CASE line
          WHEN 'TV_OWNER' THEN 0
          WHEN 'SPACE_OWNER' THEN 1
          WHEN 'SELLER' THEN 2
          WHEN 'SELLER_ACQUISITION_FUND' THEN 3
          WHEN 'INFLUENCER' THEN 4
          WHEN 'INFLUENCER_ACQUISITION_FUND' THEN 5
          WHEN 'MOSTARDA' THEN 6
          ELSE 7
        END, split_share_id`,
      [cycle.settlement_cycle_id],
    );
    const journal = await client.query<JournalRow>(
      `SELECT transaction_id, settlement_cycle_id, evidence_id,
              debit_total::text, credit_total::text
         FROM journal_transactions
        WHERE settlement_cycle_id = $1`,
      [cycle.settlement_cycle_id],
    );
    if (journal.rows.length !== 1) {
      throw new Error(
        journal.rows.length === 0
          ? "Persisted Settlement is missing JournalTransaction."
          : "Persisted Settlement has multiple JournalTransactions.",
      );
    }
    const journalRow = journal.rows[0]!;
    const lines = await client.query<JournalLineRow>(
      `SELECT journal_line_id, account_id, direction, amount::text,
              financial_right_id, line_order
         FROM journal_lines
        WHERE transaction_id = $1
        ORDER BY line_order`,
      [journalRow.transaction_id],
    );
    const ledger = await client.query<LedgerRow>(
      `SELECT entry.ledger_entry_id, entry.financial_right_id, entry.split_share_id,
              entry.evidence_id, entry.settlement_cycle_id, entry.destination_id,
              entry.amount::text, entry.journal_transaction_id, entry.status
         FROM partner_ledger_entries AS entry
         JOIN financial_rights AS fr ON fr.financial_right_id = entry.financial_right_id
        WHERE entry.settlement_cycle_id = $1
        ORDER BY CASE fr.line
          WHEN 'TV_OWNER' THEN 0
          WHEN 'SPACE_OWNER' THEN 1
          WHEN 'SELLER' THEN 2
          WHEN 'SELLER_ACQUISITION_FUND' THEN 3
          WHEN 'INFLUENCER' THEN 4
          WHEN 'INFLUENCER_ACQUISITION_FUND' THEN 5
          WHEN 'MOSTARDA' THEN 6
          ELSE 7
        END, entry.split_share_id`,
      [cycle.settlement_cycle_id],
    );
    return Object.freeze({
      settlementCycle: Object.freeze({
        settlementCycleId: cycle.settlement_cycle_id,
        campaignId: cycle.campaign_id,
        evidenceId: cycle.evidence_id,
        grossAmount: cycle.gross_amount,
        splitPolicyVersion: cycle.split_policy_version,
        status: cycle.status,
      }),
      rights: Object.freeze(rights.rows.map((right) => Object.freeze({
        financialRightId: right.financial_right_id,
        splitShareId: right.split_share_id,
        line: right.line,
        destinationId: right.destination_id,
        amount: right.amount,
        evidenceId: right.evidence_id,
        settlementCycleId: right.settlement_cycle_id,
        splitPolicyVersion: right.split_policy_version,
        status: right.status,
      }))),
      journalTransaction: Object.freeze({
        transactionId: journalRow.transaction_id,
        settlementCycleId: journalRow.settlement_cycle_id,
        evidenceId: journalRow.evidence_id,
        lines: Object.freeze(lines.rows.map((line) => Object.freeze({
          journalLineId: line.journal_line_id,
          accountId: line.account_id,
          direction: line.direction,
          amount: line.amount,
          ...(line.financial_right_id === null ? {} : { financialRightId: line.financial_right_id }),
        }))),
        debitTotal: journalRow.debit_total,
        creditTotal: journalRow.credit_total,
      }),
      ledgerEntries: Object.freeze(ledger.rows.map((entry) => Object.freeze({
        ledgerEntryId: entry.ledger_entry_id,
        financialRightId: entry.financial_right_id,
        splitShareId: entry.split_share_id,
        evidenceId: entry.evidence_id,
        settlementCycleId: entry.settlement_cycle_id,
        destinationId: entry.destination_id,
        amount: entry.amount,
        journalTransactionId: entry.journal_transaction_id,
        status: entry.status,
      }))),
    }) as TSettlement;
  }
}

/**
 * The adapter always compares the complete persisted materialization. It is
 * intentionally structural and domain-neutral, so no caller can bypass replay
 * validation by omitting a per-call callback.
 */
function assertPersistedReplayEquivalent<TSettlement extends object>(
  existing: TSettlement,
  candidate: TSettlement,
): void {
  if (JSON.stringify(canonicalize(existing)) !== JSON.stringify(canonicalize(candidate))) {
    throw new Error("Settlement replay conflict: persisted materialization is divergent.");
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}
