BEGIN;

-- 007 is retained as the historical schema.  This corrective migration makes
-- the persisted financial slice conform to the canonical DECIMAL(18,4)
-- monetary contract without rewriting that historical migration.
ALTER TABLE settlement_cycles
  ALTER COLUMN gross_amount TYPE NUMERIC(18,4) USING gross_amount;
ALTER TABLE financial_rights
  ALTER COLUMN amount TYPE NUMERIC(18,4) USING amount;
ALTER TABLE journal_transactions
  ALTER COLUMN debit_total TYPE NUMERIC(18,4) USING debit_total,
  ALTER COLUMN credit_total TYPE NUMERIC(18,4) USING credit_total;
ALTER TABLE journal_lines
  ALTER COLUMN amount TYPE NUMERIC(18,4) USING amount;
ALTER TABLE partner_ledger_entries
  ALTER COLUMN amount TYPE NUMERIC(18,4) USING amount;

CREATE OR REPLACE FUNCTION validate_journal_transaction_lines()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    expected_debit NUMERIC(18,4);
    expected_credit NUMERIC(18,4);
    actual_debit NUMERIC(18,4);
    actual_credit NUMERIC(18,4);
BEGIN
    SELECT debit_total, credit_total
      INTO expected_debit, expected_credit
      FROM journal_transactions
     WHERE transaction_id = COALESCE(NEW.transaction_id, OLD.transaction_id);

    SELECT COALESCE(SUM(amount) FILTER (WHERE direction = 'DEBIT'), 0),
           COALESCE(SUM(amount) FILTER (WHERE direction = 'CREDIT'), 0)
      INTO actual_debit, actual_credit
      FROM journal_lines
     WHERE transaction_id = COALESCE(NEW.transaction_id, OLD.transaction_id);

    IF expected_debit IS DISTINCT FROM actual_debit
       OR expected_credit IS DISTINCT FROM actual_credit THEN
        RAISE EXCEPTION 'journal lines do not balance their transaction totals'
            USING ERRCODE = '23514';
    END IF;
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION validate_journal_transaction_consistency()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    cycle_evidence TEXT;
    cycle_gross NUMERIC(18,4);
BEGIN
    SELECT evidence_id, gross_amount
      INTO cycle_evidence, cycle_gross
      FROM settlement_cycles
     WHERE settlement_cycle_id = NEW.settlement_cycle_id;
    IF cycle_evidence IS NULL THEN
        RAISE EXCEPTION 'JournalTransaction references an unknown SettlementCycle'
            USING ERRCODE = '23503';
    END IF;
    IF NEW.evidence_id IS DISTINCT FROM cycle_evidence
       OR NEW.debit_total IS DISTINCT FROM cycle_gross
       OR NEW.credit_total IS DISTINCT FROM cycle_gross THEN
        RAISE EXCEPTION 'JournalTransaction gross totals and evidence must match SettlementCycle gross_amount'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validate_journal_line_consistency()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    transaction_cycle TEXT;
    right_cycle TEXT;
    right_amount NUMERIC(18,4);
BEGIN
    IF NEW.financial_right_id IS NULL THEN
        RETURN NEW;
    END IF;
    SELECT settlement_cycle_id
      INTO transaction_cycle
      FROM journal_transactions
     WHERE transaction_id = NEW.transaction_id;
    SELECT settlement_cycle_id, amount
      INTO right_cycle, right_amount
      FROM financial_rights
     WHERE financial_right_id = NEW.financial_right_id;
    IF transaction_cycle IS NULL OR right_cycle IS NULL THEN
        RAISE EXCEPTION 'JournalLine references an unknown transaction or FinancialRight'
            USING ERRCODE = '23503';
    END IF;
    IF transaction_cycle IS DISTINCT FROM right_cycle THEN
        RAISE EXCEPTION 'JournalLine FinancialRight belongs to a different SettlementCycle'
            USING ERRCODE = '23514';
    END IF;
    IF NEW.direction <> 'CREDIT' THEN
        RAISE EXCEPTION 'JournalLine FinancialRight is only valid on a CREDIT line'
            USING ERRCODE = '23514';
    END IF;
    IF NEW.amount IS DISTINCT FROM right_amount THEN
        RAISE EXCEPTION 'JournalLine amount must match FinancialRight amount'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validate_partner_ledger_consistency()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    right_cycle TEXT;
    right_evidence TEXT;
    right_destination TEXT;
    right_amount NUMERIC(18,4);
    right_split_share TEXT;
    journal_cycle TEXT;
    journal_evidence TEXT;
BEGIN
    SELECT settlement_cycle_id, evidence_id, destination_id, amount, split_share_id
      INTO right_cycle, right_evidence, right_destination, right_amount, right_split_share
      FROM financial_rights
     WHERE financial_right_id = NEW.financial_right_id;
    SELECT settlement_cycle_id, evidence_id
      INTO journal_cycle, journal_evidence
      FROM journal_transactions
     WHERE transaction_id = NEW.journal_transaction_id;
    IF right_cycle IS NULL OR journal_cycle IS NULL THEN
        RAISE EXCEPTION 'PartnerLedger references an unknown FinancialRight or JournalTransaction'
            USING ERRCODE = '23503';
    END IF;
    IF NEW.split_share_id IS DISTINCT FROM right_split_share
       OR NEW.settlement_cycle_id IS DISTINCT FROM right_cycle
       OR NEW.evidence_id IS DISTINCT FROM right_evidence
       OR NEW.destination_id IS DISTINCT FROM right_destination
       OR NEW.amount IS DISTINCT FROM right_amount
       OR NEW.settlement_cycle_id IS DISTINCT FROM journal_cycle
       OR NEW.evidence_id IS DISTINCT FROM journal_evidence THEN
        RAISE EXCEPTION 'PartnerLedger semantic identity does not match its FinancialRight and JournalTransaction'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validate_settlement_materialization_complete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    cycle_id TEXT;
    cycle_gross NUMERIC(18,4);
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

    -- Lock the cycle while validating the complete materialization.  This
    -- makes concurrent direct SQL attempts deterministic and prevents a
    -- last-write-wins interpretation of the same financial identity.
    PERFORM 1 FROM settlement_cycles WHERE settlement_cycle_id = cycle_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'SettlementCycle does not exist during materialization validation'
            USING ERRCODE = '23503';
    END IF;

    SELECT gross_amount
      INTO cycle_gross
      FROM settlement_cycles
     WHERE settlement_cycle_id = cycle_id;

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
    IF right_count <> 7 THEN
        RAISE EXCEPTION 'materialized SettlementCycle must have exactly seven FinancialRights'
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
      JOIN journal_transactions AS journal
        ON journal.transaction_id = line.transaction_id
     WHERE journal.settlement_cycle_id = cycle_id;
    IF credit_line_count <> right_count
       OR linked_credit_line_count <> right_count
       OR distinct_linked_right_count <> right_count
       OR unlinked_credit_line_count <> 0
       OR linked_debit_line_count <> 0 THEN
        RAISE EXCEPTION 'each FinancialRight must have exactly one CREDIT JournalLine and every CREDIT must reference a FinancialRight'
            USING ERRCODE = '23514';
    END IF;

    SELECT count(*), count(DISTINCT entry.financial_right_id), COALESCE(SUM(entry.amount), 0)
      INTO ledger_count, distinct_ledger_right_count, ledger_total
      FROM partner_ledger_entries AS entry
     WHERE entry.settlement_cycle_id = cycle_id;
    IF ledger_count <> right_count
       OR distinct_ledger_right_count <> right_count THEN
        RAISE EXCEPTION 'each FinancialRight must have exactly one PartnerLedgerEntry'
            USING ERRCODE = '23514';
    END IF;
    IF ledger_total IS DISTINCT FROM cycle_gross THEN
        RAISE EXCEPTION 'PartnerLedger entries must conserve SettlementCycle gross_amount'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS settlement_materialization_complete_cycle ON settlement_cycles;
CREATE CONSTRAINT TRIGGER settlement_materialization_complete_cycle
AFTER INSERT ON settlement_cycles
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_settlement_materialization_complete();

COMMIT;
