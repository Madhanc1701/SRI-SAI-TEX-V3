-- SQL migration: Create labour_rate_configs table for per-labour rate configuration
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS labour_rate_configs (
  labour_user_id UUID PRIMARY KEY,
  length_ranges  JSONB NOT NULL DEFAULT '[]',
  illai_ranges   JSONB NOT NULL DEFAULT '[]',
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: Add a comment describing the table
COMMENT ON TABLE labour_rate_configs IS
  'Stores per-labour salary rate configuration (length ranges and illai ranges).
   Formula: amount = lengthRate × illaiRate × setCount';
