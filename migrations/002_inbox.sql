BEGIN;

CREATE TABLE IF NOT EXISTS event_store_inbox (
    consumer_name TEXT NOT NULL CHECK (consumer_name <> ''),
    event_id TEXT NOT NULL CHECK (event_id <> ''),
    payload_digest TEXT NOT NULL CHECK (payload_digest <> ''),
    effect_result JSONB NOT NULL,
    consumed_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (consumer_name, event_id)
);

COMMIT;
