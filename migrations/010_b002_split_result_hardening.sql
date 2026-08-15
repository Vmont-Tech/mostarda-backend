BEGIN;

-- B-002 hardening: every SplitShare is part of the semantic identity of its
-- SettlementCycle.  The cycle remains the authority for evidence and policy;
-- this trigger prevents a direct SQL writer from introducing a divergent
-- zero-valued result that would otherwise survive deferred materialization.
CREATE OR REPLACE FUNCTION validate_split_result_consistency()
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
        RAISE EXCEPTION 'SplitShare references an unknown SettlementCycle'
            USING ERRCODE = '23503';
    END IF;
    IF NEW.evidence_id IS DISTINCT FROM cycle_evidence
       OR NEW.split_policy_version IS DISTINCT FROM cycle_policy THEN
        RAISE EXCEPTION 'SplitShare identity does not match its SettlementCycle evidence or split policy'
            USING ERRCODE = '23514';
    END IF;
    IF NEW.basis_points = 0 AND NEW.amount <> 0.0000 THEN
        RAISE EXCEPTION 'SplitShare with zero basis points must have zero amount'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS settlement_split_result_semantic_identity ON settlement_split_results;
CREATE TRIGGER settlement_split_result_semantic_identity
BEFORE INSERT OR UPDATE ON settlement_split_results
FOR EACH ROW EXECUTE FUNCTION validate_split_result_consistency();

-- A FinancialRight is allowed only for a strictly positive SplitShare result.
-- In particular, a zero-basis-point result can remain a SplitShare, but cannot
-- become a financial posting through direct SQL.
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
    result_basis_points INTEGER;
BEGIN
    SELECT settlement_cycle_id, line, destination_id, amount, evidence_id,
           split_policy_version, basis_points
      INTO result_cycle, result_line, result_destination, result_amount,
           result_evidence, result_policy, result_basis_points
      FROM settlement_split_results
     WHERE split_share_id = NEW.split_share_id;

    IF result_cycle IS NULL THEN
        RAISE EXCEPTION 'FinancialRight must reference a SplitShare result'
            USING ERRCODE = '23503';
    END IF;
    IF result_basis_points = 0 THEN
        RAISE EXCEPTION 'FinancialRight cannot reference a zero-basis-point SplitShare'
            USING ERRCODE = '23514';
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

COMMIT;
