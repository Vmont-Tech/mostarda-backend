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
    line TEXT NOT NULL,
    destination_id TEXT NOT NULL CHECK (destination_id <> ''),
    amount NUMERIC(20,4) NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'),
    evidence_id TEXT NOT NULL CHECK (evidence_id <> ''),
    split_policy_version TEXT NOT NULL CHECK (split_policy_version <> ''),
    status TEXT NOT NULL CHECK (status = 'READY'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT financial_right_cycle_evidence_fk
      FOREIGN KEY (settlement_cycle_id) REFERENCES settlement_cycles(settlement_cycle_id),
    CONSTRAINT financial_right_line_normative_check
      CHECK (line IN (
        'TV_OWNER',
        'SPACE_OWNER',
        'SELLER',
        'SELLER_ACQUISITION_FUND',
        'INFLUENCER',
        'INFLUENCER_ACQUISITION_FUND',
        'MOSTARDA'
      ))
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conname = 'financial_right_line_normative_check'
           AND conrelid = 'financial_rights'::regclass
    ) THEN
        ALTER TABLE financial_rights
          ADD CONSTRAINT financial_right_line_normative_check
          CHECK (line IN (
            'TV_OWNER',
            'SPACE_OWNER',
            'SELLER',
            'SELLER_ACQUISITION_FUND',
            'INFLUENCER',
            'INFLUENCER_ACQUISITION_FUND',
            'MOSTARDA'
          ));
    END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS financial_right_cycle_line_unique
    ON financial_rights (settlement_cycle_id, line);

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

-- A SettlementCycle has exactly one materialized JournalTransaction.
CREATE UNIQUE INDEX IF NOT EXISTS journal_transaction_cycle_unique
    ON journal_transactions (settlement_cycle_id);

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

CREATE OR REPLACE FUNCTION validate_financial_right_consistency()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    cycle_evidence TEXT;
    cycle_policy TEXT;
BEGIN
    SELECT evidence_id, split_policy_version
      INTO cycle_evidence, cycle_policy
      FROM settlement_cycles
     WHERE settlement_cycle_id = NEW.settlement_cycle_id;
    IF cycle_evidence IS NULL THEN
        RAISE EXCEPTION 'financial right references an unknown SettlementCycle'
            USING ERRCODE = '23503';
    END IF;
    IF NEW.evidence_id IS DISTINCT FROM cycle_evidence
       OR NEW.split_policy_version IS DISTINCT FROM cycle_policy THEN
        RAISE EXCEPTION 'financial right semantic identity does not match SettlementCycle'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validate_journal_transaction_consistency()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    cycle_evidence TEXT;
    cycle_gross NUMERIC(20,4);
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
    right_amount NUMERIC(20,4);
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
    right_amount NUMERIC(20,4);
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
    journal_count BIGINT;
    right_count BIGINT;
    linked_line_count BIGINT;
    distinct_linked_right_count BIGINT;
    credit_linked_line_count BIGINT;
    ledger_count BIGINT;
    distinct_ledger_right_count BIGINT;
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

    SELECT count(*)
      INTO journal_count
      FROM journal_transactions
     WHERE settlement_cycle_id = cycle_id;
    IF journal_count = 0 THEN
        RETURN NEW;
    END IF;
    IF journal_count <> 1 THEN
        RAISE EXCEPTION 'SettlementCycle must have exactly one JournalTransaction'
            USING ERRCODE = '23514';
    END IF;

    SELECT count(*)
      INTO right_count
      FROM financial_rights
     WHERE settlement_cycle_id = cycle_id;
    IF right_count <> 7 THEN
        RAISE EXCEPTION 'materialized SettlementCycle must have exactly seven FinancialRights'
            USING ERRCODE = '23514';
    END IF;

    SELECT count(*), count(DISTINCT line.financial_right_id),
           count(*) FILTER (WHERE line.direction = 'CREDIT')
      INTO linked_line_count, distinct_linked_right_count, credit_linked_line_count
      FROM journal_lines AS line
      JOIN journal_transactions AS journal
        ON journal.transaction_id = line.transaction_id
     WHERE journal.settlement_cycle_id = cycle_id
       AND line.financial_right_id IS NOT NULL;
    IF linked_line_count <> right_count
       OR distinct_linked_right_count <> right_count
       OR credit_linked_line_count <> right_count THEN
        RAISE EXCEPTION 'each FinancialRight must have exactly one CREDIT JournalLine'
            USING ERRCODE = '23514';
    END IF;

    SELECT count(*), count(DISTINCT entry.financial_right_id)
      INTO ledger_count, distinct_ledger_right_count
      FROM partner_ledger_entries AS entry
     WHERE entry.settlement_cycle_id = cycle_id;
    IF ledger_count <> right_count
       OR distinct_ledger_right_count <> right_count THEN
        RAISE EXCEPTION 'each FinancialRight must have exactly one PartnerLedgerEntry'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS journal_transaction_lines_balanced ON journal_lines;
CREATE CONSTRAINT TRIGGER journal_transaction_lines_balanced
AFTER INSERT OR UPDATE OR DELETE ON journal_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_journal_transaction_lines();

DROP TRIGGER IF EXISTS financial_right_semantic_identity ON financial_rights;
CREATE TRIGGER financial_right_semantic_identity
BEFORE INSERT OR UPDATE ON financial_rights
FOR EACH ROW EXECUTE FUNCTION validate_financial_right_consistency();

DROP TRIGGER IF EXISTS journal_transaction_semantic_identity ON journal_transactions;
CREATE TRIGGER journal_transaction_semantic_identity
BEFORE INSERT OR UPDATE ON journal_transactions
FOR EACH ROW EXECUTE FUNCTION validate_journal_transaction_consistency();

DROP TRIGGER IF EXISTS journal_line_semantic_identity ON journal_lines;
CREATE TRIGGER journal_line_semantic_identity
BEFORE INSERT OR UPDATE ON journal_lines
FOR EACH ROW EXECUTE FUNCTION validate_journal_line_consistency();

DROP TRIGGER IF EXISTS partner_ledger_semantic_identity ON partner_ledger_entries;
CREATE TRIGGER partner_ledger_semantic_identity
BEFORE INSERT OR UPDATE ON partner_ledger_entries
FOR EACH ROW EXECUTE FUNCTION validate_partner_ledger_consistency();

DROP TRIGGER IF EXISTS settlement_materialization_complete_journal ON journal_transactions;
CREATE CONSTRAINT TRIGGER settlement_materialization_complete_journal
AFTER INSERT ON journal_transactions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_settlement_materialization_complete();

DROP TRIGGER IF EXISTS settlement_materialization_complete_right ON financial_rights;
CREATE CONSTRAINT TRIGGER settlement_materialization_complete_right
AFTER INSERT ON financial_rights
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_settlement_materialization_complete();

DROP TRIGGER IF EXISTS settlement_materialization_complete_line ON journal_lines;
CREATE CONSTRAINT TRIGGER settlement_materialization_complete_line
AFTER INSERT ON journal_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_settlement_materialization_complete();

DROP TRIGGER IF EXISTS settlement_materialization_complete_ledger ON partner_ledger_entries;
CREATE CONSTRAINT TRIGGER settlement_materialization_complete_ledger
AFTER INSERT ON partner_ledger_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_settlement_materialization_complete();

DROP TRIGGER IF EXISTS settlement_cycles_append_only ON settlement_cycles;
CREATE TRIGGER settlement_cycles_append_only
BEFORE UPDATE OR DELETE ON settlement_cycles
FOR EACH ROW EXECUTE FUNCTION prevent_settlement_mutation();

DROP TRIGGER IF EXISTS settlement_cycles_append_only_truncate ON settlement_cycles;
CREATE TRIGGER settlement_cycles_append_only_truncate
BEFORE TRUNCATE ON settlement_cycles
FOR EACH STATEMENT EXECUTE FUNCTION prevent_settlement_mutation();

DROP TRIGGER IF EXISTS financial_rights_append_only ON financial_rights;
CREATE TRIGGER financial_rights_append_only
BEFORE UPDATE OR DELETE ON financial_rights
FOR EACH ROW EXECUTE FUNCTION prevent_settlement_mutation();

DROP TRIGGER IF EXISTS financial_rights_append_only_truncate ON financial_rights;
CREATE TRIGGER financial_rights_append_only_truncate
BEFORE TRUNCATE ON financial_rights
FOR EACH STATEMENT EXECUTE FUNCTION prevent_settlement_mutation();

DROP TRIGGER IF EXISTS journal_transactions_append_only ON journal_transactions;
CREATE TRIGGER journal_transactions_append_only
BEFORE UPDATE OR DELETE ON journal_transactions
FOR EACH ROW EXECUTE FUNCTION prevent_settlement_mutation();

DROP TRIGGER IF EXISTS journal_transactions_append_only_truncate ON journal_transactions;
CREATE TRIGGER journal_transactions_append_only_truncate
BEFORE TRUNCATE ON journal_transactions
FOR EACH STATEMENT EXECUTE FUNCTION prevent_settlement_mutation();

DROP TRIGGER IF EXISTS journal_lines_append_only ON journal_lines;
CREATE TRIGGER journal_lines_append_only
BEFORE UPDATE OR DELETE ON journal_lines
FOR EACH ROW EXECUTE FUNCTION prevent_settlement_mutation();

DROP TRIGGER IF EXISTS journal_lines_append_only_truncate ON journal_lines;
CREATE TRIGGER journal_lines_append_only_truncate
BEFORE TRUNCATE ON journal_lines
FOR EACH STATEMENT EXECUTE FUNCTION prevent_settlement_mutation();

DROP TRIGGER IF EXISTS partner_ledger_entries_append_only ON partner_ledger_entries;
CREATE TRIGGER partner_ledger_entries_append_only
BEFORE UPDATE OR DELETE ON partner_ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_settlement_mutation();

DROP TRIGGER IF EXISTS partner_ledger_entries_append_only_truncate ON partner_ledger_entries;
CREATE TRIGGER partner_ledger_entries_append_only_truncate
BEFORE TRUNCATE ON partner_ledger_entries
FOR EACH STATEMENT EXECUTE FUNCTION prevent_settlement_mutation();

COMMIT;
