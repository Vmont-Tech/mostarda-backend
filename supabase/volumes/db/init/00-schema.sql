-- MOSTARDA — Schema (21 tabelas)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TYPE actor_role AS ENUM ('tv_owner','space_owner','affiliate_seller','influencer','advertiser','admin');
CREATE TYPE tv_status AS ENUM ('active','inactive','maintenance','offline');
CREATE TYPE slot_status AS ENUM ('available','booked','running','completed','cancelled');
CREATE TYPE campaign_status AS ENUM ('draft','active','paused','completed','cancelled');
CREATE TYPE heartbeat_type AS ENUM ('start','midpoint','end','anomaly');
CREATE TYPE anomaly_severity AS ENUM ('low','medium','high','critical');
CREATE TYPE election_status AS ENUM ('pending','active','closed','cancelled');
CREATE TYPE blockchain_network AS ENUM ('stellar','solana','quantum_cert');
CREATE TYPE transaction_status AS ENUM ('pending','confirmed','failed');
CREATE TYPE notification_type AS ENUM ('anomaly','election','campaign','payment','system');
CREATE TYPE transaction_type AS ENUM ('deposit','withdrawal','payment','refund','revenue_split');

CREATE OR REPLACE FUNCTION now_utc() RETURNS bigint LANGUAGE SQL IMMUTABLE AS $$ SELECT CAST(EXTRACT(EPOCH FROM now()) * 1000 AS bigint) $$;

CREATE TABLE public.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, image text, email text UNIQUE, email_verified_at bigint, is_anonymous boolean DEFAULT false, role text DEFAULT 'user', document_id text UNIQUE, phone text, wallet_address_stellar text, wallet_address_solana text, total_earned bigint DEFAULT 0, reputation_score integer DEFAULT 0, bio text, city text, state text, push_token text, created_at bigint NOT NULL DEFAULT now_utc(), updated_at bigint NOT NULL DEFAULT now_utc());
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_document ON public.users(document_id);
CREATE INDEX idx_users_city_state ON public.users(city, state);

CREATE TABLE public.actor_assignments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, role actor_role NOT NULL, tv_id uuid REFERENCES public.tvs(id) ON DELETE CASCADE, location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE, is_active boolean DEFAULT true, assigned_at bigint NOT NULL DEFAULT now_utc(), expires_at bigint, metadata jsonb);
CREATE INDEX idx_actor_assignments_user ON public.actor_assignments(user_id);
CREATE INDEX idx_actor_assignments_role ON public.actor_assignments(role);
CREATE INDEX idx_actor_assignments_tv ON public.actor_assignments(tv_id);
CREATE INDEX idx_actor_assignments_location ON public.actor_assignments(location_id);

CREATE TABLE public.locations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, slug text NOT NULL UNIQUE, address text NOT NULL, city text NOT NULL, state text NOT NULL, zip_code text, latitude double precision NOT NULL, longitude double precision NOT NULL, category text NOT NULL, space_owner_id uuid NOT NULL REFERENCES public.users(id), operating_start text NOT NULL DEFAULT '08:00', operating_end text NOT NULL DEFAULT '22:00', timezone text NOT NULL DEFAULT 'America/Sao_Paulo', average_foot_traffic integer, is_active boolean DEFAULT true, metadata jsonb, created_at bigint NOT NULL DEFAULT now_utc(), updated_at bigint NOT NULL DEFAULT now_utc());
CREATE INDEX idx_locations_slug ON public.locations(slug);
CREATE INDEX idx_locations_space_owner ON public.locations(space_owner_id);
CREATE INDEX idx_locations_city ON public.locations(city, state);
CREATE INDEX idx_locations_coords ON public.locations(latitude, longitude);

CREATE TABLE public.tvs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, identifier text NOT NULL UNIQUE, location_id uuid NOT NULL REFERENCES public.locations(id), owner_id uuid NOT NULL REFERENCES public.users(id), screen_size integer, resolution text, status tv_status DEFAULT 'active', is_online boolean DEFAULT false, last_heartbeat bigint, ip_address text, mac_address text, device_agent_version text, wifi_interface text, wifi_channel integer, operating_start text, operating_end text, slot_duration integer NOT NULL DEFAULT 30, max_slots_per_cycle integer NOT NULL DEFAULT 1680, base_price bigint NOT NULL DEFAULT 100, metadata jsonb, created_at bigint NOT NULL DEFAULT now_utc(), updated_at bigint NOT NULL DEFAULT now_utc());
CREATE INDEX idx_tvs_identifier ON public.tvs(identifier);
CREATE INDEX idx_tvs_location ON public.tvs(location_id);
CREATE INDEX idx_tvs_owner ON public.tvs(owner_id);
CREATE INDEX idx_tvs_status ON public.tvs(status);

CREATE TABLE public.tv_slots (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tv_id uuid NOT NULL REFERENCES public.tvs(id) ON DELETE CASCADE, date date NOT NULL, start_time time NOT NULL, end_time time NOT NULL, duration integer NOT NULL DEFAULT 30, sequence_number integer NOT NULL, status slot_status DEFAULT 'available', current_price bigint NOT NULL DEFAULT 100, base_price bigint NOT NULL DEFAULT 100, campaign_id uuid REFERENCES public.campaigns(id), campaign_slot_id uuid REFERENCES public.campaign_slots(id), blockchain_tx_id text, blockchain_network blockchain_network, proof_of_play_id uuid REFERENCES public.proof_of_plays(id), has_proof_of_play boolean DEFAULT false, estimated_audience integer, actual_audience integer, created_at bigint NOT NULL DEFAULT now_utc(), updated_at bigint NOT NULL DEFAULT now_utc());
CREATE INDEX idx_tv_slots_tv_date ON public.tv_slots(tv_id, date);
CREATE INDEX idx_tv_slots_tv_sequence ON public.tv_slots(tv_id, date, sequence_number);
CREATE INDEX idx_tv_slots_status ON public.tv_slots(status);
CREATE INDEX idx_tv_slots_campaign ON public.tv_slots(campaign_id);
CREATE INDEX idx_tv_slots_availability ON public.tv_slots(tv_id, date, status);

CREATE TABLE public.campaigns (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), advertiser_id uuid NOT NULL REFERENCES public.users(id), name text NOT NULL, description text, brand_name text NOT NULL, brand_website text, budget bigint NOT NULL, remaining_budget bigint NOT NULL, min_budget bigint NOT NULL DEFAULT 2000, status campaign_status DEFAULT 'draft', start_date date, end_date date, target_audience jsonb, preferred_categories text[], preferred_cities text[], preferred_states text[], day_parts text[], auto_optimize boolean DEFAULT false, affiliate_seller_id uuid REFERENCES public.users(id), influencer_id uuid REFERENCES public.users(id), total_slots_booked integer DEFAULT 0, total_impressions bigint DEFAULT 0, total_spent bigint DEFAULT 0, metadata jsonb, created_at bigint NOT NULL DEFAULT now_utc(), updated_at bigint NOT NULL DEFAULT now_utc());
CREATE INDEX idx_campaigns_advertiser ON public.campaigns(advertiser_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaigns_affiliate ON public.campaigns(affiliate_seller_id);
CREATE INDEX idx_campaigns_influencer ON public.campaigns(influencer_id);

CREATE TABLE public.campaign_slots (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE, slot_id uuid NOT NULL REFERENCES public.tv_slots(id) ON DELETE CASCADE, tv_id uuid NOT NULL REFERENCES public.tvs(id) ON DELETE CASCADE, price_paid bigint NOT NULL, is_confirmed boolean DEFAULT false, is_played boolean DEFAULT false, proof_of_play_id uuid REFERENCES public.proof_of_plays(id), blockchain_tx_id text, revenue_distributed boolean DEFAULT false, booked_at bigint NOT NULL DEFAULT now_utc(), played_at bigint);
CREATE INDEX idx_campaign_slots_campaign ON public.campaign_slots(campaign_id);
CREATE INDEX idx_campaign_slots_slot ON public.campaign_slots(slot_id);
CREATE INDEX idx_campaign_slots_tv ON public.campaign_slots(tv_id);
CREATE INDEX idx_campaign_slots_played ON public.campaign_slots(is_played);

CREATE TABLE public.ad_creatives (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE, advertiser_id uuid NOT NULL REFERENCES public.users(id), type text NOT NULL, url text NOT NULL, duration integer NOT NULL, file_size bigint, thumbnail_url text, is_approved boolean DEFAULT false, approved_by uuid REFERENCES public.users(id), metadata jsonb, created_at bigint NOT NULL DEFAULT now_utc());
CREATE INDEX idx_ad_creatives_campaign ON public.ad_creatives(campaign_id);
CREATE INDEX idx_ad_creatives_advertiser ON public.ad_creatives(advertiser_id);

CREATE TABLE public.proof_of_plays (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slot_id uuid NOT NULL REFERENCES public.tv_slots(id) ON DELETE CASCADE, tv_id uuid NOT NULL REFERENCES public.tvs(id) ON DELETE CASCADE, campaign_slot_id uuid NOT NULL REFERENCES public.campaign_slots(id) ON DELETE CASCADE, played_at bigint NOT NULL, duration integer NOT NULL, screenshot_hash text, wifi_audience_count integer, wifi_audience_data jsonb, blockchain_tx_id text, blockchain_network blockchain_network, blockchain_receipt jsonb, is_verified boolean DEFAULT false, verified_at bigint, metadata jsonb, created_at bigint NOT NULL DEFAULT now_utc());
CREATE INDEX idx_proof_of_plays_slot ON public.proof_of_plays(slot_id);
CREATE INDEX idx_proof_of_plays_tv ON public.proof_of_plays(tv_id);
CREATE INDEX idx_proof_of_plays_campaign_slot ON public.proof_of_plays(campaign_slot_id);
CREATE INDEX idx_proof_of_plays_verified ON public.proof_of_plays(is_verified);

CREATE TABLE public.device_heartbeats (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tv_id uuid NOT NULL REFERENCES public.tvs(id) ON DELETE CASCADE, heartbeat_type heartbeat_type NOT NULL, timestamp bigint NOT NULL, is_online boolean DEFAULT true, current_slot_index integer, uptime bigint, cpu_usage double precision, memory_usage double precision, storage_usage double precision, wifi_clients integer, app_version text, metadata jsonb);
CREATE INDEX idx_device_heartbeats_tv ON public.device_heartbeats(tv_id);
CREATE INDEX idx_device_heartbeats_tv_time ON public.device_heartbeats(tv_id, timestamp);
CREATE INDEX idx_device_heartbeats_type ON public.device_heartbeats(heartbeat_type);

CREATE TABLE public.anomalies (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tv_id uuid NOT NULL REFERENCES public.tvs(id) ON DELETE CASCADE, location_id uuid REFERENCES public.locations(id), type text NOT NULL, severity anomaly_severity NOT NULL, description text NOT NULL, details jsonb, is_resolved boolean DEFAULT false, resolved_at bigint, resolved_by uuid REFERENCES public.users(id), resolution_notes text, notification_sent boolean DEFAULT false, notification_sent_at bigint, created_at bigint NOT NULL DEFAULT now_utc());
CREATE INDEX idx_anomalies_tv ON public.anomalies(tv_id);
CREATE INDEX idx_anomalies_location ON public.anomalies(location_id);
CREATE INDEX idx_anomalies_severity ON public.anomalies(severity);
CREATE INDEX idx_anomalies_resolved ON public.anomalies(is_resolved);
CREATE INDEX idx_anomalies_tv_time ON public.anomalies(tv_id, created_at);

CREATE TABLE public.audience_metrics (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tv_id uuid NOT NULL REFERENCES public.tvs(id) ON DELETE CASCADE, location_id uuid NOT NULL REFERENCES public.locations(id), slot_id uuid REFERENCES public.tv_slots(id), timestamp bigint NOT NULL, device_count integer NOT NULL, probe_requests integer, signal_strength_avg double precision, dwell_time_avg double precision, raw_data jsonb, metadata jsonb);
CREATE INDEX idx_audience_metrics_tv ON public.audience_metrics(tv_id);
CREATE INDEX idx_audience_metrics_location ON public.audience_metrics(location_id);
CREATE INDEX idx_audience_metrics_slot ON public.audience_metrics(slot_id);
CREATE INDEX idx_audience_metrics_tv_time ON public.audience_metrics(tv_id, timestamp);

CREATE TABLE public.pricing_history (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tv_id uuid NOT NULL REFERENCES public.tvs(id) ON DELETE CASCADE, slot_id uuid NOT NULL REFERENCES public.tv_slots(id) ON DELETE CASCADE, date date NOT NULL, time_of_day time NOT NULL, base_price bigint NOT NULL, calculated_price bigint NOT NULL, factors jsonb NOT NULL, location_score double precision, audience_score double precision, demand_score double precision, time_score double precision, seasonality_score double precision, historical_fill_rate double precision, calculated_at bigint NOT NULL DEFAULT now_utc());
CREATE INDEX idx_pricing_history_tv ON public.pricing_history(tv_id);
CREATE INDEX idx_pricing_history_slot ON public.pricing_history(slot_id);
CREATE INDEX idx_pricing_history_date ON public.pricing_history(date);
CREATE INDEX idx_pricing_history_tv_date ON public.pricing_history(tv_id, date);

CREATE TABLE public.blockchain_transactions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), type text NOT NULL, network blockchain_network NOT NULL, status transaction_status DEFAULT 'pending', reference_id text NOT NULL, reference_type text NOT NULL, tx_id text, fee bigint, payload jsonb, receipt jsonb, retry_count integer DEFAULT 0, fallback_used boolean DEFAULT false, fallback_network blockchain_network, error text, created_at bigint NOT NULL DEFAULT now_utc(), confirmed_at bigint);
CREATE INDEX idx_blockchain_tx_reference ON public.blockchain_transactions(reference_id, reference_type);
CREATE INDEX idx_blockchain_tx_status ON public.blockchain_transactions(status);
CREATE INDEX idx_blockchain_tx_network ON public.blockchain_transactions(network);
CREATE INDEX idx_blockchain_tx_id ON public.blockchain_transactions(tx_id);

CREATE TABLE public.revenue_splits (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), campaign_slot_id uuid NOT NULL REFERENCES public.campaign_slots(id) ON DELETE CASCADE, slot_id uuid NOT NULL REFERENCES public.tv_slots(id) ON DELETE CASCADE, tv_id uuid NOT NULL REFERENCES public.tvs(id) ON DELETE CASCADE, total_amount bigint NOT NULL, distributions jsonb NOT NULL, blockchain_tx_id text, is_distributed boolean DEFAULT false, distributed_at bigint, created_at bigint NOT NULL DEFAULT now_utc());
CREATE INDEX idx_revenue_splits_campaign_slot ON public.revenue_splits(campaign_slot_id);
CREATE INDEX idx_revenue_splits_tv ON public.revenue_splits(tv_id);
CREATE INDEX idx_revenue_splits_distributed ON public.revenue_splits(is_distributed);

CREATE TABLE public.elections (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tv_id uuid NOT NULL REFERENCES public.tvs(id) ON DELETE CASCADE, status election_status DEFAULT 'pending', start_date date NOT NULL, end_date date NOT NULL, candidates jsonb NOT NULL DEFAULT '[]', total_votes integer DEFAULT 0, total_weighted_votes double precision DEFAULT 0, winner_id uuid REFERENCES public.users(id), blockchain_tx_id text, metadata jsonb, created_at bigint NOT NULL DEFAULT now_utc(), updated_at bigint NOT NULL DEFAULT now_utc());
CREATE INDEX idx_elections_tv ON public.elections(tv_id);
CREATE INDEX idx_elections_status ON public.elections(status);

CREATE TABLE public.votes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), election_id uuid NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE, tv_id uuid NOT NULL REFERENCES public.tvs(id) ON DELETE CASCADE, voter_id uuid NOT NULL REFERENCES public.users(id), voter_type text NOT NULL, candidate_id uuid NOT NULL REFERENCES public.users(id), weight double precision NOT NULL DEFAULT 1.0, proof_hash text, nfc_tag_id text, qr_code_id text, blockchain_tx_id text, is_verified boolean DEFAULT true, voted_at bigint NOT NULL DEFAULT now_utc(), UNIQUE(election_id, voter_id));
CREATE INDEX idx_votes_election ON public.votes(election_id);
CREATE INDEX idx_votes_voter ON public.votes(voter_id);
CREATE INDEX idx_votes_candidate ON public.votes(candidate_id);
CREATE INDEX idx_votes_tv ON public.votes(tv_id);

CREATE TABLE public.notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, type notification_type NOT NULL, title text NOT NULL, body text NOT NULL, data jsonb, is_read boolean DEFAULT false, is_push_sent boolean DEFAULT false, push_sent_at bigint, created_at bigint NOT NULL DEFAULT now_utc(), read_at bigint);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_type ON public.notifications(type);

CREATE TABLE public.wallets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE, balance bigint NOT NULL DEFAULT 0, locked_balance bigint NOT NULL DEFAULT 0, total_deposited bigint NOT NULL DEFAULT 0, total_withdrawn bigint NOT NULL DEFAULT 0, stellar_public_key text, solana_public_key text, updated_at bigint NOT NULL DEFAULT now_utc());
CREATE INDEX idx_wallets_user ON public.wallets(user_id);

CREATE TABLE public.transactions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE, type transaction_type NOT NULL, amount bigint NOT NULL, balance_before bigint NOT NULL, balance_after bigint NOT NULL, reference_id text, reference_type text, description text NOT NULL, blockchain_tx_id text, status transaction_status DEFAULT 'confirmed', created_at bigint NOT NULL DEFAULT now_utc());
CREATE INDEX idx_transactions_user ON public.transactions(user_id);
CREATE INDEX idx_transactions_wallet ON public.transactions(wallet_id);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_status ON public.transactions(status);

CREATE TABLE public.campaign_suggestions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), advertiser_id uuid NOT NULL REFERENCES public.users(id), campaign_id uuid REFERENCES public.campaigns(id), brand_name text NOT NULL, brand_description text, budget bigint NOT NULL, suggested_slots jsonb NOT NULL DEFAULT '[]', total_estimated_audience bigint NOT NULL DEFAULT 0, total_estimated_cost bigint NOT NULL DEFAULT 0, total_estimated_roi double precision DEFAULT 0, strategy_summary text NOT NULL, reasoning_detailed text NOT NULL, is_accepted boolean, accepted_at bigint, created_at bigint NOT NULL DEFAULT now_utc());
CREATE INDEX idx_campaign_suggestions_advertiser ON public.campaign_suggestions(advertiser_id);
CREATE INDEX idx_campaign_suggestions_campaign ON public.campaign_suggestions(campaign_id);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tv_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proof_of_plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audience_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockchain_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own" ON public.users FOR SELECT USING (auth.uid() = id OR auth.role() = 'service_role');
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE SCHEMA IF NOT EXISTS api;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA api TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- REVENUE SPLIT (5 atores individuais)
CREATE OR REPLACE FUNCTION api.revenue_split()
RETURNS TABLE(role text, percentage double precision)
LANGUAGE SQL STABLE AS $$
  SELECT 'mostarda', 0.25 UNION ALL SELECT 'space_owner', 0.25
  UNION ALL SELECT 'tv_owner', 0.20 UNION ALL SELECT 'affiliate_seller', 0.20
  UNION ALL SELECT 'influencer', 0.10
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOINHERIT; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOINHERIT; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOINHERIT; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN CREATE ROLE authenticator NOINHERIT; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_admin') THEN CREATE ROLE supabase_admin NOINHERIT; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN CREATE ROLE supabase_auth_admin NOINHERIT; END IF;
END $$;
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;
GRANT supabase_auth_admin TO authenticator;
