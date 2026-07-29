BEGIN;

ALTER TABLE event_store_outbox
    ADD COLUMN IF NOT EXISTS publication_attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_error TEXT NULL,
    ADD COLUMN IF NOT EXISTS lease_token TEXT NULL,
    ADD COLUMN IF NOT EXISTS lease_owner TEXT NULL,
    ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ NULL;

ALTER TABLE event_store_outbox DROP CONSTRAINT IF EXISTS outbox_lease_complete;
ALTER TABLE event_store_outbox ADD CONSTRAINT outbox_lease_complete CHECK (
    (lease_token IS NULL AND lease_owner IS NULL AND lease_expires_at IS NULL)
    OR
    (lease_token IS NOT NULL AND lease_owner IS NOT NULL AND lease_expires_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS event_store_outbox_claims (
    lease_token TEXT PRIMARY KEY,
    lease_owner TEXT NOT NULL CHECK (lease_owner <> ''),
    created_at TIMESTAMPTZ NOT NULL
);

COMMIT;
