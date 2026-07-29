BEGIN;

ALTER TABLE projection_invalidations
    DROP CONSTRAINT IF EXISTS projection_invalidations_pkey;

ALTER TABLE projection_invalidations
    ADD CONSTRAINT projection_invalidations_pkey
    PRIMARY KEY (projection_name, projection_version, rebuild_id);

COMMIT;
