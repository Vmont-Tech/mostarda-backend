BEGIN;

CREATE TABLE IF NOT EXISTS settlement_cycles (
    settlement_cycle_id TEXT PRIMARY KEY CHECK (settlement_cycle_id <> ''),
    campaign_id TEXT NOT NULL CHECK (campaign_id <> ''),
    evidence_id TEXT NOT NULL CHECK (evidence_id <> ''),
    gross_amount NUMERIC(20,4) NOT NULL CHECK (gross_amount >= 0),
    currency TEXT NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'),
    split_policy_version TEXT NOT NULL CHECK (split_policy_version <> ''),
    status TEXT NOT NULL CHECK (status = 'CLOSED'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT settlement_cycle_evidence_unique UNIQUE (campaign_id, evidence_id)
);

CREATE TABLE IF NOT EXISTS financial_rights (
    financial_right_id TEXT PRIMARY KEY CHECK (financial_right_id <> ''),
    split_share_id TEXT NOT NULL UNIQUE CHECK (split_share_id <> ''),
    settlement_cycle_id TEXT NOT NULL REFERENCES settlement_cycles(settlement_cycle_id),
    line TEXT NOT NULL CHECK (line <> ''),
    destination_id TEXT NOT NULL CHECK (destination_id <> ''),
    amount NUMERIC(20,4) NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'),
    evidence_id TEXT NOT NULL CHECK (evidence_id <> ''),
    split_policy_version TEXT NOT NULL CHECK (split_policy_version <> ''),
    status TEXT NOT NULL CHECK (status = 'READY'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT financial_right_cycle_evidence_fk
      FOREIGN KEY (settlement_cycle_id) REFERENCES settlement_cycles(settlement_cycle_id)
);

CREATE TABLE IF NOT EXISTS journal_transactions (
    transaction_id TEXT PRIMARY KEY CHECK (transaction_id <> ''),
    settlement_cycle_id TEXT NOT NULL REFERENCES settlement_cycles(settlement_cycle_id),
    evidence_id TEXT NOT NULL CHECK (evidence_id <> ''),
    cause TEXT NOT NULL DEFAULT 'SETTLEMENT_MATERIALIZATION' CHECK (cause <> ''),
    currency TEXT NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'),
    debit_total NUMERIC(20,4) NOT NULL CHECK (debit_total >= 0),
    credit_total NUMERIC(20,4) NOT NULL CHECK (credit_total >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT journal_transaction_balanced CHECK (debit_total = credit_total)
);

CREATE TABLE IF NOT EXISTS journal_lines (
    journal_line_id TEXT PRIMARY KEY CHECK (journal_line_id <> ''),
    transaction_id TEXT NOT NULL REFERENCES journal_transactions(transaction_id),
    line_order INTEGER NOT NULL CHECK (line_order >= 0),
    account_id TEXT NOT NULL CHECK (account_id <> ''),
    direction TEXT NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),
    amount NUMERIC(20,4) NOT NULL CHECK (amount >= 0),
    financial_right_id TEXT NULL REFERENCES financial_rights(financial_right_id),
    CONSTRAINT journal_line_order_unique UNIQUE (transaction_id, line_order)
);

CREATE TABLE IF NOT EXISTS partner_ledger_entries (
    ledger_entry_id TEXT PRIMARY KEY CHECK (ledger_entry_id <> ''),
    financial_right_id TEXT NOT NULL UNIQUE REFERENCES financial_rights(financial_right_id),
    split_share_id TEXT NOT NULL UNIQUE CHECK (split_share_id <> ''),
    settlement_cycle_id TEXT NOT NULL REFERENCES settlement_cycles(settlement_cycle_id),
    evidence_id TEXT NOT NULL CHECK (evidence_id <> ''),
    destination_id TEXT NOT NULL CHECK (destination_id <> ''),
    amount NUMERIC(20,4) NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'),
    journal_transaction_id TEXT NOT NULL REFERENCES journal_transactions(transaction_id),
    status TEXT NOT NULL CHECK (status = 'PENDING'),
    cause TEXT NOT NULL DEFAULT 'SETTLEMENT_MATERIALIZATION' CHECK (cause <> ''),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE OR REPLACE FUNCTION prevent_settlement_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'settlement financial slice is append-only'
        USING ERRCODE = '55000';
END;
$$;

CREATE OR REPLACE FUNCTION validate_journal_transaction_lines()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    expected_debit NUMERIC(20,4);
    expected_credit NUMERIC(20,4);
    actual_debit NUMERIC(20,4);
    actual_credit NUMERIC(20,4);
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

DROP TRIGGER IF EXISTS journal_transaction_lines_balanced ON journal_lines;
CREATE CONSTRAINT TRIGGER journal_transaction_lines_balanced
AFTER INSERT OR UPDATE OR DELETE ON journal_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_journal_transaction_lines();

DROP TRIGGER IF EXISTS settlement_cycles_append_only ON settlement_cycles;
CREATE TRIGGER settlement_cycles_append_only
BEFORE UPDATE OR DELETE ON settlement_cycles
FOR EACH ROW EXECUTE FUNCTION prevent_settlement_mutation();

DROP TRIGGER IF EXISTS financial_rights_append_only ON financial_rights;
CREATE TRIGGER financial_rights_append_only
BEFORE UPDATE OR DELETE ON financial_rights
FOR EACH ROW EXECUTE FUNCTION prevent_settlement_mutation();

DROP TRIGGER IF EXISTS journal_transactions_append_only ON journal_transactions;
CREATE TRIGGER journal_transactions_append_only
BEFORE UPDATE OR DELETE ON journal_transactions
FOR EACH ROW EXECUTE FUNCTION prevent_settlement_mutation();

DROP TRIGGER IF EXISTS journal_lines_append_only ON journal_lines;
CREATE TRIGGER journal_lines_append_only
BEFORE UPDATE OR DELETE ON journal_lines
FOR EACH ROW EXECUTE FUNCTION prevent_settlement_mutation();

DROP TRIGGER IF EXISTS partner_ledger_entries_append_only ON partner_ledger_entries;
CREATE TRIGGER partner_ledger_entries_append_only
BEFORE UPDATE OR DELETE ON partner_ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_settlement_mutation();

COMMIT;
