-- Add integrations JSONB column to site_settings.
-- Stores per-integration credentials and connected_at timestamp.
-- Shape: { [integrationId]: { connected_at: ISO string, ...fields } }

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS integrations JSONB NOT NULL DEFAULT '{}'::jsonb;
