BEGIN;

-- B-002: the seven policy positions are persisted as SplitShare results.
-- Only strictly positive results may become FinancialRights and ledger entries.
CREATE TABLE IF NOT EXISTS settlement_split_results (
    split_share_id TEXT PRIMARY KEY CHECK (split_share_id <> ''),
    settlement_cycle_id TEXT NOT NULL REFERENCES settlement_cycles(settlement_cycle_id),
    line TEXT NOT NULL CHECK (line IN (
        'TV_OWNER',
        'SPACE_OWNER',
        'SELLER',
        'SELLER_ACQUISITION_FUND',
        'INFLUENCER',
        'INFLUENCER_ACQUISITION_FUND',
        'MOSTARDA'
    )),
    destination_id TEXT NOT NULL CHECK (destination_id <> ''),
    basis_points INTEGER NOT NULL CHECK (basis_points >= 0 AND basis_points <= 10000),
    amount NUMERIC(18,4) NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'),
    evidence_id TEXT NOT NULL CHECK (evidence_id <> ''),
    split_policy_version TEXT NOT NULL CHECK (split_policy_version <> ''),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT split_result_cycle_line_unique UNIQUE (settlement_cycle_id, line)
);

-- Accepted SettlementCycles cannot represent a zero financial settlement.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conname = 'settlement_cycle_gross_positive'
           AND conrelid = 'settlement_cycles'::regclass
    ) THEN
        ALTER TABLE settlement_cycles
          ADD CONSTRAINT settlement_cycle_gross_positive CHECK (gross_amount > 0);
    END IF;
END;
$$;

-- Zero is a valid SplitShare result but never a financial posting.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'financial_right_positive_amount'
           AND conrelid = 'financial_rights'::regclass
    ) THEN
        ALTER TABLE financial_rights
          ADD CONSTRAINT financial_right_positive_amount CHECK (amount > 0);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'journal_line_positive_amount'
           AND conrelid = 'journal_lines'::regclass
    ) THEN
        ALTER TABLE journal_lines
          ADD CONSTRAINT journal_line_positive_amount CHECK (amount > 0);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'partner_ledger_positive_amount'
           AND conrelid = 'partner_ledger_entries'::regclass
    ) THEN
        ALTER TABLE partner_ledger_entries
          ADD CONSTRAINT partner_ledger_positive_amount CHECK (amount > 0);
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'financial_right_split_result_fk'
           AND conrelid = 'financial_rights'::regclass
    ) THEN
        ALTER TABLE financial_rights
          ADD CONSTRAINT financial_right_split_result_fk
          FOREIGN KEY (split_share_id) REFERENCES settlement_split_results(split_share_id);
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION validate_financial_right_split_result()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    result_cycle TEXT;
    result_line TEXT;
    result_destination TEXT;
    result_amount NUMERIC(18,4);
    result_evidence TEXT;
    result_policy TEXT;
BEGIN
    SELECT settlement_cycle_id, line, destination_id, amount, evidence_id,
           split_policy_version
      INTO result_cycle, result_line, result_destination, result_amount,
           result_evidence, result_policy
      FROM settlement_split_results
     WHERE split_share_id = NEW.split_share_id;

    IF result_cycle IS NULL THEN
        RAISE EXCEPTION 'FinancialRight must reference a SplitShare result'
            USING ERRCODE = '23503';
    END IF;
    IF NEW.settlement_cycle_id IS DISTINCT FROM result_cycle
       OR NEW.line IS DISTINCT FROM result_line
       OR NEW.destination_id IS DISTINCT FROM result_destination
       OR NEW.amount IS DISTINCT FROM result_amount
       OR NEW.evidence_id IS DISTINCT FROM result_evidence
       OR NEW.split_policy_version IS DISTINCT FROM result_policy THEN
        RAISE EXCEPTION 'FinancialRight does not match its SplitShare result'
            USING ERRCODE = '23514';
    END IF;
    IF NEW.amount <= 0 THEN
        RAISE EXCEPTION 'FinancialRight amount must be positive'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS financial_right_split_result_consistency ON financial_rights;
CREATE TRIGGER financial_right_split_result_consistency
BEFORE INSERT OR UPDATE ON financial_rights
FOR EACH ROW EXECUTE FUNCTION validate_financial_right_split_result();

CREATE OR REPLACE FUNCTION validate_settlement_materialization_complete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    cycle_id TEXT;
    cycle_gross NUMERIC(18,4);
    split_count BIGINT;
    split_total NUMERIC(18,4);
    positive_split_count BIGINT;
    journal_count BIGINT;
    right_count BIGINT;
    right_total NUMERIC(18,4);
    credit_line_count BIGINT;
    linked_credit_line_count BIGINT;
    distinct_linked_right_count BIGINT;
    unlinked_credit_line_count BIGINT;
    linked_debit_line_count BIGINT;
    ledger_count BIGINT;
    distinct_ledger_right_count BIGINT;
    ledger_total NUMERIC(18,4);
BEGIN
    IF TG_TABLE_NAME = 'journal_lines' THEN
        SELECT settlement_cycle_id
          INTO cycle_id
          FROM journal_transactions
         WHERE transaction_id = COALESCE(NEW.transaction_id, OLD.transaction_id);
    ELSE
        cycle_id := COALESCE(NEW.settlement_cycle_id, OLD.settlement_cycle_id);
    END IF;
    IF cycle_id IS NULL THEN
        RETURN NEW;
    END IF;

    PERFORM 1 FROM settlement_cycles WHERE settlement_cycle_id = cycle_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'SettlementCycle does not exist during materialization validation'
            USING ERRCODE = '23503';
    END IF;

    SELECT gross_amount INTO cycle_gross
      FROM settlement_cycles
     WHERE settlement_cycle_id = cycle_id;
    IF cycle_gross <= 0 THEN
        RAISE EXCEPTION 'SettlementCycle gross_amount must be positive'
            USING ERRCODE = '23514';
    END IF;

    SELECT count(*), COALESCE(SUM(amount), 0), count(*) FILTER (WHERE amount > 0)
      INTO split_count, split_total, positive_split_count
      FROM settlement_split_results
     WHERE settlement_cycle_id = cycle_id;
    IF split_count <> 7 THEN
        RAISE EXCEPTION 'SettlementCycle must preserve exactly seven SplitShare results'
            USING ERRCODE = '23514';
    END IF;
    IF split_total IS DISTINCT FROM cycle_gross THEN
        RAISE EXCEPTION 'SplitShare results must conserve SettlementCycle gross_amount'
            USING ERRCODE = '23514';
    END IF;

    SELECT count(*) INTO journal_count
      FROM journal_transactions
     WHERE settlement_cycle_id = cycle_id;
    IF journal_count <> 1 THEN
        RAISE EXCEPTION 'SettlementCycle must have exactly one JournalTransaction'
            USING ERRCODE = '23514';
    END IF;

    SELECT count(*), COALESCE(SUM(amount), 0)
      INTO right_count, right_total
      FROM financial_rights
     WHERE settlement_cycle_id = cycle_id;
    IF right_count <> positive_split_count THEN
        RAISE EXCEPTION 'FinancialRights must match strictly positive SplitShare results'
            USING ERRCODE = '23514';
    END IF;
    IF right_total IS DISTINCT FROM cycle_gross THEN
        RAISE EXCEPTION 'FinancialRights must conserve SettlementCycle gross_amount'
            USING ERRCODE = '23514';
    END IF;

    SELECT count(*) FILTER (WHERE line.direction = 'CREDIT'),
           count(*) FILTER (WHERE line.direction = 'CREDIT' AND line.financial_right_id IS NOT NULL),
           count(DISTINCT line.financial_right_id) FILTER (WHERE line.direction = 'CREDIT' AND line.financial_right_id IS NOT NULL),
           count(*) FILTER (WHERE line.direction = 'CREDIT' AND line.financial_right_id IS NULL),
           count(*) FILTER (WHERE line.direction = 'DEBIT' AND line.financial_right_id IS NOT NULL)
      INTO credit_line_count, linked_credit_line_count,
           distinct_linked_right_count, unlinked_credit_line_count,
           linked_debit_line_count
      FROM journal_lines AS line
      JOIN journal_transactions AS journal ON journal.transaction_id = line.transaction_id
     WHERE journal.settlement_cycle_id = cycle_id;
    IF credit_line_count <> right_count
       OR linked_credit_line_count <> right_count
       OR distinct_linked_right_count <> right_count
       OR unlinked_credit_line_count <> 0
       OR linked_debit_line_count <> 0 THEN
        RAISE EXCEPTION 'each positive FinancialRight must have exactly one CREDIT JournalLine and every CREDIT must reference a FinancialRight'
            USING ERRCODE = '23514';
    END IF;

    SELECT count(*), count(DISTINCT entry.financial_right_id), COALESCE(SUM(entry.amount), 0)
      INTO ledger_count, distinct_ledger_right_count, ledger_total
      FROM partner_ledger_entries AS entry
     WHERE entry.settlement_cycle_id = cycle_id;
    IF ledger_count <> right_count OR distinct_ledger_right_count <> right_count THEN
        RAISE EXCEPTION 'each positive FinancialRight must have exactly one PartnerLedgerEntry'
            USING ERRCODE = '23514';
    END IF;
    IF ledger_total IS DISTINCT FROM cycle_gross THEN
        RAISE EXCEPTION 'PartnerLedger entries must conserve SettlementCycle gross_amount'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS settlement_materialization_complete_split_result ON settlement_split_results;
CREATE CONSTRAINT TRIGGER settlement_materialization_complete_split_result
AFTER INSERT ON settlement_split_results
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_settlement_materialization_complete();

DROP TRIGGER IF EXISTS settlement_split_results_append_only ON settlement_split_results;
CREATE TRIGGER settlement_split_results_append_only
BEFORE UPDATE OR DELETE ON settlement_split_results
FOR EACH ROW EXECUTE FUNCTION prevent_settlement_mutation();

DROP TRIGGER IF EXISTS settlement_split_results_append_only_truncate ON settlement_split_results;
CREATE TRIGGER settlement_split_results_append_only_truncate
BEFORE TRUNCATE ON settlement_split_results
FOR EACH STATEMENT EXECUTE FUNCTION prevent_settlement_mutation();

COMMIT;
