BEGIN;

CREATE TABLE IF NOT EXISTS e2e_campaigns (
    campaign_id TEXT PRIMARY KEY CHECK (campaign_id <> ''),
    name TEXT NOT NULL CHECK (name <> ''),
    status TEXT NOT NULL CHECK (status = 'ACTIVE'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS e2e_slots (
    slot_id TEXT PRIMARY KEY CHECK (slot_id <> ''),
    campaign_id TEXT NOT NULL REFERENCES e2e_campaigns(campaign_id),
    duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
    status TEXT NOT NULL CHECK (status = 'ACTIVE'),
    CONSTRAINT e2e_slots_identity UNIQUE (slot_id, campaign_id)
);

CREATE TABLE IF NOT EXISTS e2e_creatives (
    creative_id TEXT PRIMARY KEY CHECK (creative_id <> ''),
    media_type TEXT NOT NULL CHECK (media_type = 'text/html'),
    content TEXT NOT NULL,
    digest TEXT NOT NULL CHECK (digest <> ''),
    status TEXT NOT NULL CHECK (status = 'PUBLISHED'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS e2e_slot_creatives (
    slot_id TEXT PRIMARY KEY REFERENCES e2e_slots(slot_id),
    campaign_id TEXT NOT NULL,
    creative_id TEXT NOT NULL REFERENCES e2e_creatives(creative_id),
    manifest_version TEXT NOT NULL CHECK (manifest_version <> ''),
    published_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT e2e_slot_creatives_slot_campaign_fk
        FOREIGN KEY (slot_id, campaign_id)
        REFERENCES e2e_slots(slot_id, campaign_id),
    CONSTRAINT e2e_slot_creatives_identity
        UNIQUE (slot_id, campaign_id, creative_id, manifest_version)
);

CREATE TABLE IF NOT EXISTS e2e_playback_events (
    playback_event_id TEXT PRIMARY KEY CHECK (playback_event_id <> ''),
    campaign_id TEXT NOT NULL,
    slot_id TEXT NOT NULL,
    creative_id TEXT NOT NULL,
    edge_id TEXT NOT NULL CHECK (edge_id <> ''),
    session_id TEXT NOT NULL CHECK (session_id <> ''),
    playback_id TEXT NOT NULL UNIQUE CHECK (playback_id <> ''),
    manifest_version TEXT NOT NULL CHECK (manifest_version <> ''),
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    duration_seconds NUMERIC(12,4) NOT NULL CHECK (duration_seconds > 0),
    status TEXT NOT NULL CHECK (status = 'COMPLETED'),
    received_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT e2e_playback_events_time_order CHECK (completed_at >= started_at),
    CONSTRAINT e2e_playback_events_slot_fk
        FOREIGN KEY (slot_id, campaign_id)
        REFERENCES e2e_slots(slot_id, campaign_id),
    CONSTRAINT e2e_playback_events_assignment_fk
        FOREIGN KEY (slot_id, campaign_id, creative_id, manifest_version)
        REFERENCES e2e_slot_creatives(slot_id, campaign_id, creative_id, manifest_version)
);

CREATE TABLE IF NOT EXISTS e2e_telemetry_events (
    event_id TEXT PRIMARY KEY CHECK (event_id <> ''),
    event_type TEXT NOT NULL CHECK (event_type <> ''),
    edge_id TEXT NOT NULL CHECK (edge_id <> ''),
    occurred_at TIMESTAMPTZ NOT NULL,
    payload JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE OR REPLACE FUNCTION prevent_e2e_playback_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'E2E PlaybackEvent is append-only'
        USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS e2e_playback_events_append_only ON e2e_playback_events;
CREATE TRIGGER e2e_playback_events_append_only
BEFORE UPDATE OR DELETE ON e2e_playback_events
FOR EACH ROW EXECUTE FUNCTION prevent_e2e_playback_event_mutation();

DROP TRIGGER IF EXISTS e2e_playback_events_truncate_append_only ON e2e_playback_events;
CREATE TRIGGER e2e_playback_events_truncate_append_only
BEFORE TRUNCATE ON e2e_playback_events
FOR EACH STATEMENT EXECUTE FUNCTION prevent_e2e_playback_event_mutation();

COMMIT;
