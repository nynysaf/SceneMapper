-- Add icon and icon_background columns to maps table for custom map icons
ALTER TABLE maps
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS icon_background text;
