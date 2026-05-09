-- Add in_content_slot to ad_settings table.
-- This gives Google AdSense a distinct slot ID for in-content placements,
-- which Google tracks separately from sidebar slots for fill-rate optimisation.
INSERT INTO ad_settings (setting_key, setting_value)
VALUES ('in_content_slot', '')
ON CONFLICT (setting_key) DO NOTHING;
