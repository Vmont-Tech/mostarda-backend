BEGIN;

CREATE TABLE IF NOT EXISTS projection_rebuilds (
    projection_name TEXT NOT NULL CHECK (projection_name <> ''),
    projection_version INTEGER NOT NULL CHECK (projection_version > 0),
    rebuild_id TEXT NOT NULL CHECK (rebuild_id <> ''),
    state JSONB NOT NULL,
    checkpoint BIGINT NOT NULL CHECK (checkpoint >= -1),
    as_of TIMESTAMPTZ NULL,
    staleness JSONB NOT NULL,
    rebuild_status TEXT NOT NULL
        CHECK (rebuild_status = 'COMPLETED_AWAITING_PROMOTION'),
    staged_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (projection_name, projection_version, rebuild_id)
);

CREATE TABLE IF NOT EXISTS projection_heads (
    projection_name TEXT PRIMARY KEY,
    projection_version INTEGER NOT NULL,
    rebuild_id TEXT NOT NULL,
    promoted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT projection_heads_rebuild_fk
        FOREIGN KEY (projection_name, projection_version, rebuild_id)
        REFERENCES projection_rebuilds (projection_name, projection_version, rebuild_id)
);

CREATE OR REPLACE FUNCTION prevent_projection_rebuild_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'projection rebuild candidates are append-only'
        USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS projection_rebuilds_append_only ON projection_rebuilds;
CREATE TRIGGER projection_rebuilds_append_only
BEFORE UPDATE OR DELETE ON projection_rebuilds
FOR EACH ROW EXECUTE FUNCTION prevent_projection_rebuild_mutation();

COMMIT;
