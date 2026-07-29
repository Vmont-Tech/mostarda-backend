BEGIN;

CREATE TABLE IF NOT EXISTS projection_invalidations (
    projection_name TEXT PRIMARY KEY,
    projection_version INTEGER NOT NULL,
    rebuild_id TEXT NOT NULL,
    invalidated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT projection_invalidations_rebuild_fk
        FOREIGN KEY (projection_name, projection_version, rebuild_id)
        REFERENCES projection_rebuilds (projection_name, projection_version, rebuild_id)
);

COMMIT;
