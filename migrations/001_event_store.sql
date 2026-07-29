BEGIN;

CREATE TABLE IF NOT EXISTS event_store_events (
    global_position BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id UUID NOT NULL,
    stream_id TEXT NOT NULL,
    aggregate_revision BIGINT NOT NULL CHECK (aggregate_revision >= 0),
    event_type TEXT NOT NULL CHECK (event_type <> ''),
    schema_version INTEGER NOT NULL CHECK (schema_version > 0),
    occurred_at TIMESTAMPTZ NOT NULL,
    stored_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    producer TEXT NOT NULL CHECK (producer <> ''),
    correlation_id TEXT NOT NULL CHECK (correlation_id <> ''),
    causation_id TEXT NOT NULL CHECK (causation_id <> ''),
    payload JSONB NOT NULL,
    event_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT events_event_id_unique UNIQUE (event_id),
    CONSTRAINT events_stream_revision_unique UNIQUE (stream_id, aggregate_revision)
);

CREATE TABLE IF NOT EXISTS event_store_outbox (
    outbox_id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES event_store_events(event_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    published_at TIMESTAMPTZ NULL,
    publication_attempts INTEGER NOT NULL DEFAULT 0 CHECK (publication_attempts >= 0),
    last_error TEXT NULL
);

CREATE INDEX IF NOT EXISTS event_store_events_stream_order
    ON event_store_events (stream_id, aggregate_revision);

CREATE INDEX IF NOT EXISTS event_store_outbox_pending
    ON event_store_outbox (created_at, outbox_id)
    WHERE published_at IS NULL;

CREATE OR REPLACE FUNCTION prevent_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'event store is append-only'
        USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS event_store_events_append_only ON event_store_events;
CREATE TRIGGER event_store_events_append_only
BEFORE UPDATE OR DELETE ON event_store_events
FOR EACH ROW EXECUTE FUNCTION prevent_event_mutation();

COMMIT;
